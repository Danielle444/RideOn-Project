-- ============================================================================
-- usp_SecretaryUpdateStallBooking
-- ============================================================================
-- Direct update of a stall booking by the host secretary (dates, notes, tack
-- flag, horse). Updates billcharge amount when day-count changes.
--
-- Ownership: caller must hold 'מזכירת חווה מארחת' at the booking's ranch.
--
-- Guards:
--   - Booking exists
--   - Not paid
--   - No pending change request
--   - New dates are valid (end >= start)
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_secretaryupdatestallbooking(
    integer, integer, date, date, text, boolean, integer
);

CREATE OR REPLACE FUNCTION public.usp_secretaryupdatestallbooking(
    p_stallbookingid           integer,
    p_secretarysystemuserid    integer,
    p_newstartdate             date,
    p_newenddate               date,
    p_newnotes                 text,
    p_isfortack                boolean,
    p_horseid                  integer
)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_ranchid          integer;
    v_paid_exists      boolean;
    v_existing_pend    integer;
    v_pricecatalogid   integer;
    v_itemprice        numeric;
    v_new_days         integer;
    v_new_amount       numeric;
BEGIN
    IF p_newenddate < p_newstartdate THEN
        RAISE EXCEPTION 'End date must be on or after start date';
    END IF;

    SELECT sb.ranchid
    INTO v_ranchid
    FROM public.stallbooking sb
    WHERE sb.stallbookingid = p_stallbookingid;

    IF v_ranchid IS NULL THEN
        RAISE EXCEPTION 'Stall booking not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_secretarysystemuserid
          AND prr.ranchid = v_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'מזכירת חווה מארחת'
    ) THEN
        RAISE EXCEPTION 'Permission denied: not the host ranch secretary';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.billproductrequest bpr
        WHERE bpr.prequestid = p_stallbookingid
          AND bpr.paymentid IS NOT NULL
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot edit a paid stall booking';
    END IF;

    SELECT pcr.productchangerequestid
    INTO v_existing_pend
    FROM public.productchangerequest pcr
    WHERE pcr.originalprequestid = p_stallbookingid
      AND pcr.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending change request exists — resolve it first';
    END IF;

    -- Apply updates
    UPDATE public.stallbooking
    SET startdate  = p_newstartdate,
        enddate    = p_newenddate,
        isfortack  = COALESCE(p_isfortack, isfortack),
        horseid    = p_horseid
    WHERE stallbookingid = p_stallbookingid;

    UPDATE public.productrequest
    SET notes = NULLIF(TRIM(p_newnotes), '')
    WHERE prequestid = p_stallbookingid;

    -- Recompute billcharge amount based on new day count
    SELECT pc.pricecatalogid, pc.itemprice
    INTO v_pricecatalogid, v_itemprice
    FROM public.productrequest pr
    JOIN public.pricecatalog pc ON pc.pricecatalogid = pr.pricecatalogid
    WHERE pr.prequestid = p_stallbookingid;

    v_new_days := GREATEST((p_newenddate - p_newstartdate)::integer + 1, 1);
    v_new_amount := COALESCE(v_itemprice, 0) * v_new_days;

    UPDATE public.billcharge
    SET amounttopay = v_new_amount
    WHERE sourcetype = 'ProductRequest'
      AND sourceid   = p_stallbookingid
      AND chargestatus IN ('Open', 'PendingApproval');

    UPDATE public.billproductrequest
    SET amounttopay = v_new_amount
    WHERE prequestid = p_stallbookingid
      AND paymentid IS NULL;
END;
$$;
