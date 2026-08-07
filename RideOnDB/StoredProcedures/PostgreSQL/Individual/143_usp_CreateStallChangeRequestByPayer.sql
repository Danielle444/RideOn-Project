-- ============================================================================
-- usp_CreateStallChangeRequestByPayer
-- ============================================================================
-- Payer requests a stall booking date change, submitting the actual new
-- start/end dates (and optional notes) up front -- NOT a data-less generic
-- request. Creates a Pending productchangerequest row pointing at a NEW
-- productrequest/stallbooking pair that already carries the requested
-- dates, exactly mirroring the "create-a-replacement-row, link via
-- newprequestid, apply-on-approve" pattern used system-wide for both
-- entries (changeentryrequest.newentryid) and stalls/shavings
-- (productchangerequest.newprequestid) -- see the orphaned admin proc
-- usp_createstallbookingchangerequest (189), which this proc's INSERT shape
-- mirrors, with payer ownership authorization substituted for the admin's
-- ranch-role authorization.
--
-- Business decision (2026-08-07): the Secretary must see current vs
-- requested values before approving. This is already fully satisfied by two
-- existing procs with ZERO changes needed:
--   - usp_getsecretarycompetitionchangerequests (179) already renders
--     BeforeText/AfterText for a product change request by joining through
--     originalprequestid/newprequestid to their respective stallbooking
--     rows, including a "תאריכים: dd/mm/yyyy - dd/mm/yyyy" segment.
--   - usp_answerproductchangerequestsecured (222) already implements the
--     full approve path for a non-cancel product change request: marks the
--     original billcharge 'Replaced', recomputes the new stall's price from
--     itemprice * staydays, and inserts new billcharge row(s) via
--     usp_splitwholeshekels. Verified end-to-end live 2026-08-07: creating
--     a request, reading it back through 179, and approving it through 222
--     all produced correct results with this proc as the only new code.
--
-- Ownership: payer must be on at least one bill linked to this booking (via
-- billproductrequest.prequestid -> bill.paidbypersonid), not merely an
-- approved-managed-payer relationship -- mirrors the ownership check already
-- used by the (still-orphaned) admin path's ownership-adjacent checks
-- elsewhere in this codebase.
--
-- Guards, in order: booking exists, competition has not ended (RN001, added
-- 2026-08-07 alongside the rest of the competition-ended sweep -- this proc
-- had no date check at all before), payer owns the booking, booking is not
-- already paid, no pending change/cancel request already in flight, and (for
-- a horse stall, not a tack stall) no overlapping active booking for the
-- same horse in the new date range -- the same advisory-lock-guarded overlap
-- check 189 uses, so a payer cannot request dates that collide with another
-- booking for their own horse.
--
-- Superseded 2026-08-07: this proc's original "minimum-viable" version took
-- only (p_stallbookingid, p_payerpersonid) and stored a data-less request
-- that the secretary had no way to act on with real values -- this was the
-- audited gap. The signature changed to accept p_newstartdate/p_newenddate/
-- p_notes; DROP + CREATE was required because Postgres does not allow
-- CREATE OR REPLACE to change a function's parameter list.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_createstallchangerequestbypayer(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_createstallchangerequestbypayer(p_stallbookingid integer, p_payerpersonid integer, p_newstartdate date, p_newenddate date, p_notes text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_original_product_request public.productrequest%rowtype;
    v_original_stall_booking public.stallbooking%rowtype;
    v_new_prequest_id integer;
    v_change_request_id integer;
    v_owner_exists boolean;
    v_paid_exists boolean;
    v_competitionenddate date;
BEGIN
    IF p_stallbookingid IS NULL OR p_stallbookingid <= 0 THEN
        RAISE EXCEPTION 'Invalid stall booking id';
    END IF;

    IF p_payerpersonid IS NULL OR p_payerpersonid <= 0 THEN
        RAISE EXCEPTION 'Invalid payer person id';
    END IF;

    IF p_newstartdate IS NULL OR p_newenddate IS NULL THEN
        RAISE EXCEPTION 'Start date and end date are required';
    END IF;

    IF p_newstartdate > p_newenddate THEN
        RAISE EXCEPTION 'Start date cannot be after end date';
    END IF;

    SELECT pr.*
    INTO v_original_product_request
    FROM public.productrequest pr
    JOIN public.stallbooking sb ON sb.stallbookingid = pr.prequestid
    WHERE pr.prequestid = p_stallbookingid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stall booking not found';
    END IF;

    SELECT c.competitionenddate
    INTO v_competitionenddate
    FROM public.competition c
    WHERE c.competitionid = v_original_product_request.competitionid;

    IF (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate THEN
        RAISE EXCEPTION 'Competition has already ended' USING ERRCODE = 'RN001';
    END IF;

    SELECT sb.*
    INTO v_original_stall_booking
    FROM public.stallbooking sb
    WHERE sb.stallbookingid = p_stallbookingid;

    SELECT EXISTS (
        SELECT 1
        FROM public.billproductrequest bpr
        JOIN public.bill b ON b.billid = bpr.billid
        WHERE bpr.prequestid = p_stallbookingid
          AND b.paidbypersonid = p_payerpersonid
    )
    INTO v_owner_exists;

    IF NOT v_owner_exists THEN
        RAISE EXCEPTION 'Permission denied: payer does not pay for this stall booking';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_stallbookingid
          AND bc.chargestatus = 'Paid'
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot edit a paid stall booking';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_stallbookingid
          AND coalesce(pcr.status, '') = 'Pending'
    ) THEN
        RAISE EXCEPTION 'A pending request already exists for this stall booking';
    END IF;

    IF v_original_stall_booking.isfortack = false
       AND v_original_stall_booking.horseid IS NOT NULL THEN

        PERFORM pg_advisory_xact_lock(1735, v_original_stall_booking.horseid);

        IF EXISTS (
            SELECT 1
            FROM public.stallbooking sb
            JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
            WHERE sb.horseid = v_original_stall_booking.horseid
              AND sb.isfortack = false
              AND sb.stallbookingid <> p_stallbookingid
              AND daterange(sb.startdate, sb.enddate, '[]')
                    && daterange(p_newstartdate, p_newenddate, '[]')
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.productchangerequest pcr
                  WHERE pcr.originalprequestid = sb.stallbookingid
                    AND pcr.iscancelled = true
                    AND pcr.status = 'Approved'
              )
        ) THEN
            RAISE EXCEPTION 'An active overlapping stall booking already exists for this horse';
        END IF;
    END IF;

    INSERT INTO public.productrequest
    (
        competitionid,
        prequestdatetime,
        orderedbysystemuserid,
        pricecatalogid,
        notes,
        approvaldate
    )
    VALUES
    (
        v_original_product_request.competitionid,
        now(),
        p_payerpersonid,
        v_original_product_request.pricecatalogid,
        p_notes,
        null
    )
    RETURNING prequestid
    INTO v_new_prequest_id;

    INSERT INTO public.stallbooking
    (
        stallbookingid,
        ranchid,
        compoundid,
        stallid,
        startdate,
        enddate,
        horseid,
        isfortack,
        requestingranchid
    )
    VALUES
    (
        v_new_prequest_id,
        v_original_stall_booking.ranchid,
        v_original_stall_booking.compoundid,
        v_original_stall_booking.stallid,
        p_newstartdate,
        p_newenddate,
        v_original_stall_booking.horseid,
        v_original_stall_booking.isfortack,
        v_original_stall_booking.requestingranchid
    );

    INSERT INTO public.productchangerequest
    (
        originalprequestid,
        newprequestid,
        answeredbysystemuserid,
        status,
        requestdate,
        iscancelled
    )
    VALUES
    (
        p_stallbookingid,
        v_new_prequest_id,
        NULL,
        'Pending',
        now(),
        false
    )
    RETURNING productchangerequestid
    INTO v_change_request_id;

    RETURN v_change_request_id;
END;
$function$;
