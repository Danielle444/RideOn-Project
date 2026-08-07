-- ============================================================================
-- usp_AdminCancelStallBooking
-- ============================================================================
-- Direct RanchAdmin cancellation of a stall booking from the mobile admin
-- payer-account screen. Mirrors usp_admineditstallbooking's authorization
-- shape (requesting-ranch match, Approved RanchAdmin role, created-by-or-
-- manages-payer ownership) and usp_secretarydeletestallbooking's
-- cancellation mechanics (pre-approved productchangerequest + billcharge
-- cancel + shavings cascade), with three corrections proven necessary by the
-- read-only audit that preceded this proc:
--
--   1. Active-link rule: a linked historical stall only stops keeping a
--      shared shavings order alive when it has an Approved ProductChangeRequest
--      with iscancelled = true AND no Open/Paid/PendingApproval billcharge
--      remains. An Approved REPLACEMENT never counts as inactive (shavings
--      relinking to the new booking is unsolved elsewhere in this system --
--      out of scope here). Any inconsistent state (charge cancelled with no
--      resolved request, or a resolved request with a charge still live)
--      also keeps the shavings order alive, by conservative default.
--
--   2. Policy A for mixed-payment shavings: if ANY billcharge row for a
--      shavings sourceId is Paid, none of that shavings order's rows are
--      touched -- not even its other, still-Open rows. Matches the dominant
--      existing guard pattern in this codebase (usp_admineditstallbooking,
--      usp_createstallbookingchangerequest, usp_createstallbookingcancelrequest,
--      usp_answerproductchangerequestsecured all block an entire sourceId's
--      operation the moment any one row on it is Paid).
--
--   3. Explicit bill recalculation: every bill actually touched by either
--      UPDATE...RETURNING (the stall's own charge, or a cascaded shavings
--      charge) is recalculated exactly once via usp_recalculatebillamount.
--      usp_secretarydeletestallbooking never does this; a live-verified
--      dependent (usp_getcompetitionpayersbysystemuser, backing the mobile
--      admin payer-LIST screen) reads bill.amounttopay directly and would go
--      stale without it.
--
-- Never touches: shavingsorderforstallbooking, shavingsorder, stallbooking,
-- productrequest, stallassignment. Never modifies usp_secretarydeletestallbooking.
--
-- All expected validation/business-rule failures use ERRCODE = 'RN001', the
-- convention this codebase's DAL layer already maps to BL.ValidationException
-- -> HTTP 409.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_admincancelstallbooking(
    p_personid          integer,
    p_stallbookingid    integer,
    p_ranchid           integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_requestingranchid     integer;
    v_iscreatedbyadmin      boolean;
    v_ismanagedpayerbooking boolean;
    v_paid_exists           boolean;
    v_new_request_id        integer;
    v_stall_bill_ids        integer[];
    v_shavings_bill_ids     integer[];
    v_all_bill_ids          integer[];
    v_bill_id               integer;
BEGIN
    IF p_personid IS NULL OR p_personid <= 0 THEN
        RAISE EXCEPTION 'Invalid person id' USING ERRCODE = 'RN001';
    END IF;

    IF p_stallbookingid IS NULL OR p_stallbookingid <= 0 THEN
        RAISE EXCEPTION 'Invalid stall booking id' USING ERRCODE = 'RN001';
    END IF;

    IF p_ranchid IS NULL OR p_ranchid <= 0 THEN
        RAISE EXCEPTION 'Invalid ranch id' USING ERRCODE = 'RN001';
    END IF;

    -- Load the booking and confirm it belongs to the caller's requesting ranch.
    SELECT sb.requestingranchid
    INTO v_requestingranchid
    FROM public.stallbooking sb
    WHERE sb.stallbookingid = p_stallbookingid;

    IF v_requestingranchid IS NULL THEN
        RAISE EXCEPTION 'Stall booking not found' USING ERRCODE = 'RN001';
    END IF;

    IF v_requestingranchid <> p_ranchid THEN
        RAISE EXCEPTION 'Stall booking does not belong to this ranch' USING ERRCODE = 'RN001';
    END IF;

    -- Authorization, exact shape of usp_admineditstallbooking: Approved
    -- RanchAdmin role at p_ranchid, checked against the CALLER's own
    -- personranchrole membership -- p_personid is never trusted as
    -- self-declared, only as the identity resolved server-side from claims.
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_personid
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'אדמין חווה'
    ) THEN
        RAISE EXCEPTION 'Caller is not an approved ranch admin for this stall booking''s ranch' USING ERRCODE = 'RN001';
    END IF;

    -- Ownership: the admin either created this booking's productrequest, or
    -- manages the payer actually charged for it (personmanagedbysystemuser).
    SELECT (pr.orderedbysystemuserid = p_personid)
    INTO v_iscreatedbyadmin
    FROM public.productrequest pr
    WHERE pr.prequestid = p_stallbookingid;

    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        JOIN public.personmanagedbysystemuser pmsu ON pmsu.personid = bc.paidbypersonid
        JOIN public.personranchrole prr ON prr.personid = bc.paidbypersonid
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_stallbookingid
          AND bc.categorykey = 'stalls'
          AND pmsu.systemuserid = p_personid
          AND pmsu.approvalstatus = 'Approved'
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'משלם'
    )
    INTO v_ismanagedpayerbooking;

    IF NOT (COALESCE(v_iscreatedbyadmin, false) OR v_ismanagedpayerbooking) THEN
        RAISE EXCEPTION 'Caller is not authorized to cancel this stall booking' USING ERRCODE = 'RN001';
    END IF;

    -- No pending change/cancel request already in flight for this booking.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_stallbookingid
          AND pcr.status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'A pending change request exists for this stall booking' USING ERRCODE = 'RN001';
    END IF;

    -- No request of any kind has ever been resolved for this booking yet.
    -- productchangerequest.originalprequestid is UNIQUE, so without this
    -- explicit guard a second cancel attempt (or a booking that was already
    -- cancelled/changed via any other path) would fall through to a raw
    -- 23505 unique-violation instead of a clean, user-facing message.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_stallbookingid
    ) THEN
        RAISE EXCEPTION 'This stall booking has already been cancelled or changed' USING ERRCODE = 'RN001';
    END IF;

    -- No payer share has been paid -- matches every sibling guard in this
    -- codebase that blocks an entire sourceId's cancellation the moment any
    -- one billcharge row on it is Paid.
    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_stallbookingid
          AND bc.chargestatus = 'Paid'
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot cancel a paid stall booking' USING ERRCODE = 'RN001';
    END IF;

    -- All guards passed -- record the cancellation as a pre-approved,
    -- self-answered change request (same pattern as
    -- usp_secretarydeletestallbooking, with the real caller as the answerer).
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
        p_personid,
        'Approved',
        now(),
        TRUE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

    -- Cancel the stall's own Open/PendingApproval charge(s). Paid rows never
    -- match (already proven none exist above) and are never touched. Bill
    -- ids are captured ONLY from what this UPDATE itself reports changing.
    WITH cancelled_stall_charges AS (
        UPDATE public.billcharge
        SET chargestatus = 'Cancelled',
            cancelledat  = now()
        WHERE sourcetype = 'ProductRequest'
          AND sourceid   = p_stallbookingid
          AND chargestatus IN ('Open', 'PendingApproval')
        RETURNING billid
    )
    SELECT COALESCE(array_agg(DISTINCT billid), ARRAY[]::integer[])
    INTO v_stall_bill_ids
    FROM cancelled_stall_charges;

    -- Eligible shavings orders: every OTHER stall physically linked to the
    -- order must be "inactive" under the locked, cancellation-only
    -- active-link rule (Approved iscancelled=true AND no live charge --
    -- never a replacement, never an inconsistent state), AND (Policy A) the
    -- order itself must carry no Paid row anywhere in its own billcharge
    -- split. Physical shavingsorderforstallbooking rows are never touched --
    -- proven system-wide to be permanent by design -- so eligibility is
    -- computed purely from the linked stalls' own business state, never from
    -- row existence.
    WITH eligible_shavings_orders AS (
        SELECT sofb.shavingsorderid
        FROM public.shavingsorderforstallbooking sofb
        WHERE sofb.stallbookingid = p_stallbookingid
          AND NOT EXISTS (
              SELECT 1
              FROM public.shavingsorderforstallbooking other
              WHERE other.shavingsorderid = sofb.shavingsorderid
                AND other.stallbookingid <> p_stallbookingid
                AND NOT (
                    EXISTS (
                        SELECT 1
                        FROM public.productchangerequest pcr
                        WHERE pcr.originalprequestid = other.stallbookingid
                          AND pcr.status = 'Approved'
                          AND pcr.iscancelled = true
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM public.billcharge bc
                        WHERE bc.sourcetype = 'ProductRequest'
                          AND bc.sourceid = other.stallbookingid
                          AND bc.chargestatus IN ('Open', 'Paid', 'PendingApproval')
                    )
                )
          )
    ),
    payable_shavings_orders AS (
        -- Policy A: any Paid row anywhere on this shavings sourceId excludes
        -- the WHOLE order, not just that one payer's row.
        SELECT eso.shavingsorderid
        FROM eligible_shavings_orders eso
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.billcharge bc
            WHERE bc.sourcetype = 'ProductRequest'
              AND bc.sourceid = eso.shavingsorderid
              AND bc.chargestatus = 'Paid'
        )
    ),
    cancelled_shavings_charges AS (
        UPDATE public.billcharge
        SET chargestatus = 'Cancelled',
            cancelledat  = now()
        WHERE sourcetype = 'ProductRequest'
          AND chargestatus IN ('Open', 'PendingApproval')
          AND sourceid IN (SELECT shavingsorderid FROM payable_shavings_orders)
        RETURNING billid
    )
    SELECT COALESCE(array_agg(DISTINCT billid), ARRAY[]::integer[])
    INTO v_shavings_bill_ids
    FROM cancelled_shavings_charges;

    -- Deduplicate every bill actually touched above and recalculate each
    -- exactly once. Never derived from productrequest/billproductrequest
    -- lookups -- only from what the two UPDATE...RETURNING blocks reported.
    v_all_bill_ids := ARRAY(
        SELECT DISTINCT unnest(v_stall_bill_ids || v_shavings_bill_ids)
    );

    FOREACH v_bill_id IN ARRAY v_all_bill_ids
    LOOP
        PERFORM public.usp_recalculatebillamount(v_bill_id);
    END LOOP;

    RETURN v_new_request_id;
END;
$$;
