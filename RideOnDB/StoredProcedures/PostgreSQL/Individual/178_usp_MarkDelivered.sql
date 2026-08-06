-- ============================================================================
-- usp_MarkDelivered
-- ============================================================================
-- Worker shavings-mutation authorization fix (P0, 2026-08-06). Previously
-- took no caller identity and would mark ANY order id delivered.
--
-- Signature gains p_workersystemuserid (ownership guard needs the caller's
-- identity) -- return type stays integer, but the parameter list changes.
--
-- DEPLOYMENT SHAPE (staged cutover, revised 2026-08-06): same coexisting-
-- overload technique as usp_SaveDeliveryPhoto (168) -- this file CREATEs
-- the new 2-arg signature ALONGSIDE the old 1-arg one, without dropping it.
-- PostgreSQL resolves overloads by argument count at the call site
-- (DBServices.CreateCommandWithStoredProcedure sends one positional
-- placeholder per dictionary entry, no named-argument syntax), so a 1-arg
-- call from an old, still-running server instance can only ever resolve to
-- the old signature during a Render rolling deploy -- it keeps working
-- unchanged. The old 1-arg signature is dropped only in a SEPARATE Phase C
-- cleanup migration, after the new server build is confirmed live on every
-- instance. See the session report for the exact three-phase SQL.
--
-- Guards mirror usp_ClaimShavingsOrder (115) / usp_SaveDeliveryPhoto (168)
-- for host-ranch/role/competition-ended/cancelled -- same ERRCODE = 'RN001'
-- convention, same joins. The cancellation guard blocks on BOTH Pending and
-- Approved (widened 2026-08-07; Approved-only was the original, incomplete
-- version). Ownership is checked via SELECT ... FOR UPDATE
-- (row-locked for the remainder of this call) then an explicit RN001 guard,
-- avoiding a check-then-act race with a concurrent claim/deliver on the same
-- order. The original arrivaltime IS NULL idempotency guard on the final
-- UPDATE is preserved verbatim: an already-delivered order is not re-stamped,
-- and 0 rows affected surfaces through the existing 409 Conflict path,
-- unchanged from before this fix.
-- ============================================================================

-- Phase A: additive only. The old 1-arg public.usp_markdelivered(integer) is
-- intentionally left untouched here -- do not add a DROP FUNCTION for it in
-- this file. Its removal is Phase C, run separately once the new server
-- build is confirmed live on every Render instance.
CREATE OR REPLACE FUNCTION public.usp_markdelivered(
    p_shavingsorderid    integer,
    p_workersystemuserid integer
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_hostranchid        integer;
    v_competitionenddate date;
    v_businessdate       date;
    v_current_worker     integer;
    v_rows_affected      integer;
BEGIN
    IF p_shavingsorderid IS NULL OR p_shavingsorderid <= 0 THEN
        RAISE EXCEPTION 'Invalid shavings order id' USING ERRCODE = 'RN001';
    END IF;

    IF p_workersystemuserid IS NULL OR p_workersystemuserid <= 0 THEN
        RAISE EXCEPTION 'Invalid worker system user id' USING ERRCODE = 'RN001';
    END IF;

    SELECT c.hostranchid, c.competitionenddate
    INTO v_hostranchid, v_competitionenddate
    FROM public.productrequest pr
    INNER JOIN public.competition c ON c.competitionid = pr.competitionid
    WHERE pr.prequestid = p_shavingsorderid;

    IF v_hostranchid IS NULL THEN
        RAISE EXCEPTION 'Shavings order not found' USING ERRCODE = 'RN001';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_workersystemuserid
          AND prr.ranchid = v_hostranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'עובד חווה'
    ) THEN
        RAISE EXCEPTION 'Caller is not an approved ranch worker for this shavings order''s host ranch' USING ERRCODE = 'RN001';
    END IF;

    v_businessdate := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date;

    IF v_businessdate > v_competitionenddate THEN
        RAISE EXCEPTION 'Competition has ended' USING ERRCODE = 'RN001';
    END IF;

    -- Pending AND Approved both block: a pending cancellation is already in flight
    -- and must not be raced by a mutation that would land after it resolves; only
    -- a Rejected cancellation leaves the order eligible again.
    IF EXISTS (
        SELECT 1 FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_shavingsorderid
          AND pcr.iscancelled = true
          AND pcr.status IN ('Pending', 'Approved')
    ) THEN
        RAISE EXCEPTION 'Shavings order has a pending or approved cancellation' USING ERRCODE = 'RN001';
    END IF;

    SELECT workersystemuserid
    INTO v_current_worker
    FROM public.shavingsorder
    WHERE shavingsorderid = p_shavingsorderid
    FOR UPDATE;

    IF v_current_worker IS DISTINCT FROM p_workersystemuserid THEN
        RAISE EXCEPTION 'This shavings order is not claimed by you' USING ERRCODE = 'RN001';
    END IF;

    UPDATE public.shavingsorder
    SET arrivaltime    = COALESCE(arrivaltime, now()),
        deliverystatus = 'Delivered'
    WHERE shavingsorderid = p_ShavingsOrderId
      AND arrivaltime IS NULL;          -- idempotent; don't re-stamp an already-delivered order

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$function$;
