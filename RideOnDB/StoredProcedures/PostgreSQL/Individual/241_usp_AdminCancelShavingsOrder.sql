-- ============================================================================
-- usp_AdminCancelShavingsOrder
-- ============================================================================
-- Direct RanchAdmin cancellation of a standalone shavings order from the
-- mobile admin payer-account screen -- the shavings sibling of
-- usp_admincancelstallbooking (239). Mirrors 239's authorization shape
-- (requesting-ranch match via the order's linked stall(s), Approved
-- RanchAdmin role, created-by-or-manages-payer ownership) and its
-- cancellation mechanics (pre-approved productchangerequest + billcharge
-- cancel + explicit bill recalculation).
--
-- SIMPLER than 239 by construction: a shavings order has no descendant
-- billable entity to cascade to (239's stall-to-shavings cascade exists
-- because a stall can carry a linked shavings order; a shavings order
-- carries nothing beneath it), and shavingsorderforstallbooking rows are
-- never touched by this proc -- proven system-wide to be permanent by
-- design, same as 239's own guarantee for stall links.
--
-- Ranch scoping: a shavings order has no ranch column of its own. This is a
-- WRITE authorization gate, so it deliberately does NOT use the looser
-- EXISTS-one-linked-stall technique usp_getpayercompetitionaccount (212)
-- uses to scope a read -- that filter is a fine "should this row appear in
-- a list" check but is the wrong strictness here, since it would let a
-- caller authorize cancellation of an order merely because ONE of several
-- linked stalls happens to match their ranch, even if others did not.
-- Instead, ALL linked stalls must match p_ranchid (and at least one must
-- exist). usp_createshavingsorder (169) already enforces at creation time
-- that every stall supplied to one order shares a single requesting ranch,
-- so a mixed-ranch order cannot exist today -- this guard does not rely on
-- that invariant holding forever, so a future bug in 169 could not silently
-- grant a wrong-ranch admin authority over part of a mixed-ranch order.
--
-- Policy A for mixed-payment shavings: if ANY billcharge row for this
-- shavings sourceId is Paid, none of its rows are touched -- matches the
-- dominant existing guard pattern in this codebase (usp_admineditstallbooking,
-- usp_createstallbookingchangerequest, usp_createstallbookingcancelrequest,
-- usp_answerproductchangerequestsecured, usp_admincancelstallbooking all
-- block an entire sourceId's operation the moment any one row on it is Paid).
--
-- All expected validation/business-rule failures use ERRCODE = 'RN001', the
-- convention this codebase's DAL layer already maps to BL.ValidationException
-- -> HTTP 409 (see ShavingsOrderDAL.CreateShavingsOrder for the existing
-- RN001 catch in this same DAL file).
--
-- Two guards added on fix/competition-ended-and-delivery-guards (2026-08-07):
--   - Cannot cancel a DELIVERED order (shavingsorder.arrivaltime IS NOT
--     NULL) -- checked immediately after existence, before ranch/ownership.
--   - Cannot cancel once the competition has ended -- this proc had no date
--     check at all before, unlike usp_createshavingsorder's own guard.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_admincancelshavingsorder(
    p_personid          integer,
    p_shavingsorderid   integer,
    p_ranchid           integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_competitionid         integer;
    v_competitionenddate    date;
    v_arrivaltime           timestamp without time zone;
    v_ranch_linked          boolean;
    v_iscreatedbyadmin      boolean;
    v_ismanagedpayerorder   boolean;
    v_paid_exists           boolean;
    v_new_request_id        integer;
    v_bill_ids              integer[];
    v_bill_id                integer;
BEGIN
    IF p_personid IS NULL OR p_personid <= 0 THEN
        RAISE EXCEPTION 'Invalid person id' USING ERRCODE = 'RN001';
    END IF;

    IF p_shavingsorderid IS NULL OR p_shavingsorderid <= 0 THEN
        RAISE EXCEPTION 'Invalid shavings order id' USING ERRCODE = 'RN001';
    END IF;

    IF p_ranchid IS NULL OR p_ranchid <= 0 THEN
        RAISE EXCEPTION 'Invalid ranch id' USING ERRCODE = 'RN001';
    END IF;

    SELECT pr.competitionid, so.arrivaltime
    INTO v_competitionid, v_arrivaltime
    FROM public.productrequest pr
    JOIN public.shavingsorder so ON so.shavingsorderid = pr.prequestid
    WHERE pr.prequestid = p_shavingsorderid;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Shavings order not found' USING ERRCODE = 'RN001';
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

    -- Ranch scoping via the order's linked stall(s) -- STRICT: every linked
    -- stall must match p_ranchid (not merely one), and at least one linked
    -- stall must exist. See header note.
    SELECT
        EXISTS (
            SELECT 1
            FROM public.shavingsorderforstallbooking sofb
            INNER JOIN public.stallbooking sb ON sb.stallbookingid = sofb.stallbookingid
            WHERE sofb.shavingsorderid = p_shavingsorderid
        )
        AND NOT EXISTS (
            SELECT 1
            FROM public.shavingsorderforstallbooking sofb
            INNER JOIN public.stallbooking sb ON sb.stallbookingid = sofb.stallbookingid
            WHERE sofb.shavingsorderid = p_shavingsorderid
              AND sb.requestingranchid <> p_ranchid
        )
    INTO v_ranch_linked;

    IF NOT v_ranch_linked THEN
        RAISE EXCEPTION 'Shavings order does not belong to this ranch' USING ERRCODE = 'RN001';
    END IF;

    -- Authorization, exact shape of usp_admincancelstallbooking (239):
    -- Approved RanchAdmin role at p_ranchid, checked against the CALLER's
    -- own personranchrole membership.
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_personid
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'אדמין חווה'
    ) THEN
        RAISE EXCEPTION 'Caller is not an approved ranch admin for this shavings order''s ranch' USING ERRCODE = 'RN001';
    END IF;

    -- Ownership: the admin either created this order's productrequest, or
    -- manages a payer actually charged for it (personmanagedbysystemuser).
    SELECT (pr.orderedbysystemuserid = p_personid)
    INTO v_iscreatedbyadmin
    FROM public.productrequest pr
    WHERE pr.prequestid = p_shavingsorderid;

    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        JOIN public.personmanagedbysystemuser pmsu ON pmsu.personid = bc.paidbypersonid
        JOIN public.personranchrole prr ON prr.personid = bc.paidbypersonid
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_shavingsorderid
          AND bc.categorykey = 'shavings'
          AND pmsu.systemuserid = p_personid
          AND pmsu.approvalstatus = 'Approved'
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'משלם'
    )
    INTO v_ismanagedpayerorder;

    IF NOT (COALESCE(v_iscreatedbyadmin, false) OR v_ismanagedpayerorder) THEN
        RAISE EXCEPTION 'Caller is not authorized to cancel this shavings order' USING ERRCODE = 'RN001';
    END IF;

    -- No pending change/cancel request already in flight for this order.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_shavingsorderid
          AND pcr.status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'A pending change request exists for this shavings order' USING ERRCODE = 'RN001';
    END IF;

    -- No request of any kind has ever been resolved for this order yet
    -- (productchangerequest.originalprequestid is UNIQUE) -- explicit guard
    -- for a clean, user-facing message instead of a raw 23505.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_shavingsorderid
    ) THEN
        RAISE EXCEPTION 'This shavings order has already been cancelled or changed' USING ERRCODE = 'RN001';
    END IF;

    -- Policy A: no payer share has been paid.
    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_shavingsorderid
          AND bc.chargestatus = 'Paid'
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot cancel a paid shavings order' USING ERRCODE = 'RN001';
    END IF;

    -- All guards passed -- record the cancellation as a pre-approved,
    -- self-answered change request (same pattern as usp_admincancelstallbooking,
    -- with the real caller as the answerer).
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
        p_personid,
        'Approved',
        now(),
        TRUE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

    -- Cancel the order's own Open/PendingApproval charge(s). Paid rows never
    -- match (already proven none exist above) and are never touched.
    WITH cancelled_charges AS (
        UPDATE public.billcharge
        SET chargestatus = 'Cancelled',
            cancelledat  = now()
        WHERE sourcetype = 'ProductRequest'
          AND sourceid   = p_shavingsorderid
          AND chargestatus IN ('Open', 'PendingApproval')
        RETURNING billid
    )
    SELECT COALESCE(array_agg(DISTINCT billid), ARRAY[]::integer[])
    INTO v_bill_ids
    FROM cancelled_charges;

    FOREACH v_bill_id IN ARRAY v_bill_ids
    LOOP
        PERFORM public.usp_recalculatebillamount(v_bill_id);
    END LOOP;

    RETURN v_new_request_id;
END;
$$;
