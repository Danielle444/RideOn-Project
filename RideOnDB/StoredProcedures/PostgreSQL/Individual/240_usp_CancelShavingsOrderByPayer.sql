-- ============================================================================
-- usp_CancelShavingsOrderByPayer
-- ============================================================================
-- Payer initiates a cancel request for a standalone shavings order they pay
-- for -- the shavings sibling of usp_cancelstallbookingbypayer (141), same
-- shape exactly: creates a Pending, unanswered productchangerequest row;
-- the host secretary must approve it later (via the existing Change
-- Tracking page -> usp_answerproductchangerequestsecured (222), which
-- already handles categoryid=3/'shavings' product requests correctly --
-- confirmed by reading 222's body, no change needed there).
--
-- Shavings data model:
--   shavingsorder.shavingsorderid = productrequest.prequestid (FK)
--   billproductrequest bridges productrequest <-> bill (many-to-many)
--   bill.paidbypersonid = the payer
--
-- Ownership: payer must be in at least one bill linked to this order.
--
-- Unlike 141 (usp_cancelstallbookingbypayer), which has no paid guard and
-- relies entirely on usp_answerproductchangerequestsecured (222) to refuse
-- the request at answer-time, this proc rejects a paid order at creation
-- time instead -- a payer who requests cancellation of a fully paid
-- shavings order gets an honest, immediate error rather than a Pending
-- request that can never be approved.
--
-- Guards, in order:
--   1. order exists
--   2. caller pays for it (ownership)
--   3. Policy A: no billcharge row for this shavingsorderid is Paid
--      (mirrors 241/242's own creation-time Policy A guard exactly, and the
--      same rule enforced downstream by 222 -- checking it here just moves
--      the rejection earlier and gives the payer an honest, immediate error
--      instead of a silently stuck request)
--   4. no productchangerequest of ANY status already exists for this
--      originalprequestid (productchangerequest.originalprequestid is
--      UNIQUE) -- a controlled business error instead of a raw 23505
--      unique-violation, matching the exact guard shape already used by
--      241/242 and by usp_admincancelstallbooking (239)
--
-- Plain RAISE EXCEPTION (no ERRCODE) throughout, matching 141 and its own
-- controller/DAL: StallBookingsController.CancelStallBookingByPayer /
-- StallBookingDAL.CancelStallBookingByPayer catch generic Exception ->
-- BadRequest(ex.Message) with no PostgresException/SqlState inspection at
-- all -- unlike the RN001 -> ValidationException -> 409 convention used by
-- the admin/secretary direct-cancel paths below.
--
-- Two guards added on fix/competition-ended-and-delivery-guards (2026-08-07),
-- both RN001-coded (unlike this proc's other, pre-existing plain guards --
-- deliberately: these two are new business rules being enforced for the
-- first time, matching the coding convention of the shavings admin/secretary
-- cancel siblings, not this proc's own legacy plain-exception style):
--   - Cannot cancel a DELIVERED order (shavingsorder.arrivaltime IS NOT
--     NULL) -- checked first, before ownership, mirroring 241/242.
--   - Cannot cancel once the competition has ended -- this proc had no date
--     check at all before.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_cancelshavingsorderbypayer(
    p_shavingsorderid  integer,
    p_payerpersonid    integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_owner_exists    boolean;
    v_paid_exists     boolean;
    v_new_request_id  integer;
    v_competitionid       integer;
    v_competitionenddate  date;
    v_arrivaltime         timestamp without time zone;
BEGIN
    -- Validate shavings order exists
    SELECT pr.competitionid, so.arrivaltime
    INTO v_competitionid, v_arrivaltime
    FROM public.productrequest pr
    JOIN public.shavingsorder so ON so.shavingsorderid = pr.prequestid
    WHERE pr.prequestid = p_shavingsorderid;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Shavings order not found';
    END IF;

    IF v_arrivaltime IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot cancel a delivered shavings order' USING ERRCODE = 'RN001';
    END IF;

    SELECT c.competitionenddate
    INTO v_competitionenddate
    FROM public.competition c
    WHERE c.competitionid = v_competitionid;

    IF (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate THEN
        RAISE EXCEPTION 'Competition has already ended' USING ERRCODE = 'RN001';
    END IF;

    -- Validate payer pays for this order (via billproductrequest -> bill)
    SELECT EXISTS (
        SELECT 1
        FROM public.billproductrequest bpr
        JOIN public.bill b ON b.billid = bpr.billid
        WHERE bpr.prequestid = p_shavingsorderid
          AND b.paidbypersonid = p_payerpersonid
    )
    INTO v_owner_exists;

    IF NOT v_owner_exists THEN
        RAISE EXCEPTION 'Permission denied: payer does not pay for this shavings order';
    END IF;

    -- Policy A, enforced at CREATION time (not left to answer-time only):
    -- if ANY billcharge row for this shavings sourceId is Paid, refuse the
    -- request outright instead of creating a Pending row that
    -- usp_answerproductchangerequestsecured (222) can never approve.
    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_shavingsorderid
          AND bc.chargestatus = 'Paid'
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot request cancellation of a paid shavings order';
    END IF;

    -- No request of ANY status has ever been made for this order yet
    -- (productchangerequest.originalprequestid is UNIQUE) -- a controlled
    -- business error instead of a raw 23505 unique-violation, matching the
    -- same guard shape already used by usp_admincancelshavingsorder (241) /
    -- usp_secretarycancelshavingsorder (242) / usp_admincancelstallbooking
    -- (239). Deliberately checks ALL statuses, not just 'Pending' -- a
    -- Rejected or Approved row for this order also permanently occupies the
    -- UNIQUE slot on originalprequestid, so a second request against it
    -- would still hit 23505 if only 'Pending' were checked.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_shavingsorderid
    ) THEN
        RAISE EXCEPTION 'A change/cancel request already exists for this shavings order';
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
        p_shavingsorderid,
        NULL,
        NULL,
        'Pending',
        now(),
        TRUE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

    RETURN v_new_request_id;
END;
$$;
