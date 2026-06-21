-- ============================================================================
-- usp_SecretaryDeleteStallBooking
-- ============================================================================
-- Direct cancel of a stall booking by the host secretary.
-- Pattern: pre-approved productchangerequest (status='Approved',
-- iscancelled=true, answeredbysystemuserid=secretary) + cancel billcharge.
-- Also cancels billcharges for shavings orders tied to this booking.
--
-- Ownership: caller must hold 'מזכירת חווה מארחת' at the booking's ranch.
--
-- Guards:
--   - Booking exists
--   - Not paid
--   - No other pending change request
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_secretarydeletestallbooking(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_secretarydeletestallbooking(
    p_stallbookingid           integer,
    p_secretarysystemuserid    integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_ranchid          integer;
    v_paid_exists      boolean;
    v_existing_pend    integer;
    v_new_request_id   integer;
BEGIN
    SELECT sb.ranchid
    INTO v_ranchid
    FROM public.stallbooking sb
    WHERE sb.stallbookingid = p_stallbookingid;

    IF v_ranchid IS NULL THEN
        RAISE EXCEPTION 'Stall booking not found';
    END IF;

    -- Ownership: secretary of the host ranch (the booking's ranch IS the host)
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

    -- Block if any payment was already made against this booking
    SELECT EXISTS (
        SELECT 1
        FROM public.billproductrequest bpr
        WHERE bpr.prequestid = p_stallbookingid
          AND bpr.paymentid IS NOT NULL
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot delete a paid stall booking';
    END IF;

    -- Block if there is already a pending change request
    SELECT pcr.productchangerequestid
    INTO v_existing_pend
    FROM public.productchangerequest pcr
    WHERE pcr.originalprequestid = p_stallbookingid
      AND pcr.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending change request exists — resolve it first';
    END IF;

    INSERT INTO public.productchangerequest (
        originalprequestid,
        newprequestid,
        answeredbysystemuserid,
        status,
        requestdate,
        iscancelled
    )
    VALUES (
        p_stallbookingid,
        NULL,
        p_secretarysystemuserid,
        'Approved',
        now(),
        TRUE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

    -- Cancel the stall's billcharge
    UPDATE public.billcharge
    SET chargestatus = 'Cancelled',
        cancelledat  = now()
    WHERE sourcetype = 'ProductRequest'
      AND sourceid   = p_stallbookingid
      AND chargestatus IN ('Open', 'PendingApproval');

    -- Cancel related shavings billcharges (shavings whose only stall was this)
    UPDATE public.billcharge
    SET chargestatus = 'Cancelled',
        cancelledat  = now()
    WHERE sourcetype = 'ProductRequest'
      AND chargestatus IN ('Open', 'PendingApproval')
      AND sourceid IN (
          SELECT sofb.shavingsorderid
          FROM public.shavingsorderforstallbooking sofb
          WHERE sofb.stallbookingid = p_stallbookingid
            -- Only cancel if this is the shaving's ONLY stall link
            AND NOT EXISTS (
                SELECT 1
                FROM public.shavingsorderforstallbooking other
                WHERE other.shavingsorderid = sofb.shavingsorderid
                  AND other.stallbookingid <> p_stallbookingid
            )
      );

    RETURN v_new_request_id;
END;
$$;
