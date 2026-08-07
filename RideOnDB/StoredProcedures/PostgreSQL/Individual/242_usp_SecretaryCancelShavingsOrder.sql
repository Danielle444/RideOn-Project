-- ============================================================================
-- usp_SecretaryCancelShavingsOrder
-- ============================================================================
-- Direct HostSecretary cancellation of a standalone shavings order from the
-- web secretary shavings page -- the shavings sibling of
-- usp_secretarydeletestallbooking (146), but built to 239's higher bar
-- (RN001 guards + explicit bill recalculation) rather than 146's, since 239
-- is the more recently established, more correct pattern in this codebase
-- for a direct-cancel proc (146 predates the RN001 convention and the
-- recalculation fix, and was never revisited -- see 239's own header for
-- the documented gap). This proc deliberately does NOT reproduce 146's
-- missing-recalculation gap.
--
-- Host-ranch scoping: mirrors usp_createshavingsorder's own convention (a
-- shavings order is always scoped to its competition's HOST ranch, not a
-- requesting ranch) -- p_ranchid must equal
-- productrequest.competitionid -> competition.hostranchid.
--
-- Policy A for mixed-payment shavings: same guard as
-- usp_admincancelshavingsorder (241) and every other direct-cancel proc in
-- this codebase -- if ANY billcharge row for this shavings sourceId is
-- Paid, none of its rows are touched.
--
-- All expected validation/business-rule failures use ERRCODE = 'RN001',
-- matching 241 and the DAL's existing RN001 catch convention.
--
-- Two guards added on fix/competition-ended-and-delivery-guards (2026-08-07):
--   - Cannot cancel a DELIVERED order (shavingsorder.arrivaltime IS NOT
--     NULL) -- checked before ranch match, mirroring 241.
--   - Cannot cancel once the competition has ended -- this proc had no date
--     check at all before.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_secretarycancelshavingsorder(
    p_shavingsorderid          integer,
    p_secretarysystemuserid    integer,
    p_ranchid                  integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_hostranchid       integer;
    v_competitionenddate date;
    v_arrivaltime        timestamp without time zone;
    v_paid_exists       boolean;
    v_new_request_id    integer;
    v_bill_ids          integer[];
    v_bill_id           integer;
BEGIN
    IF p_shavingsorderid IS NULL OR p_shavingsorderid <= 0 THEN
        RAISE EXCEPTION 'Invalid shavings order id' USING ERRCODE = 'RN001';
    END IF;

    IF p_secretarysystemuserid IS NULL OR p_secretarysystemuserid <= 0 THEN
        RAISE EXCEPTION 'Invalid secretary system user id' USING ERRCODE = 'RN001';
    END IF;

    IF p_ranchid IS NULL OR p_ranchid <= 0 THEN
        RAISE EXCEPTION 'Invalid ranch id' USING ERRCODE = 'RN001';
    END IF;

    SELECT c.hostranchid, c.competitionenddate, so.arrivaltime
    INTO v_hostranchid, v_competitionenddate, v_arrivaltime
    FROM public.productrequest pr
    INNER JOIN public.competition c ON c.competitionid = pr.competitionid
    INNER JOIN public.shavingsorder so ON so.shavingsorderid = pr.prequestid
    WHERE pr.prequestid = p_shavingsorderid;

    IF v_hostranchid IS NULL THEN
        RAISE EXCEPTION 'Shavings order not found' USING ERRCODE = 'RN001';
    END IF;

    IF v_hostranchid <> p_ranchid THEN
        RAISE EXCEPTION 'Shavings order does not belong to this ranch' USING ERRCODE = 'RN001';
    END IF;

    IF v_arrivaltime IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot cancel a delivered shavings order' USING ERRCODE = 'RN001';
    END IF;

    IF (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate THEN
        RAISE EXCEPTION 'Competition has already ended' USING ERRCODE = 'RN001';
    END IF;

    -- Ownership: secretary of the competition's host ranch.
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_secretarysystemuserid
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'מזכירת חווה מארחת'
    ) THEN
        RAISE EXCEPTION 'Caller is not the host ranch secretary for this shavings order' USING ERRCODE = 'RN001';
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
    -- (productchangerequest.originalprequestid is UNIQUE).
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
        p_secretarysystemuserid,
        'Approved',
        now(),
        TRUE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

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
