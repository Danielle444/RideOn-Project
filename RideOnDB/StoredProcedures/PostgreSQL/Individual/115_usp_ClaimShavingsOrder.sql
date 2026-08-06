-- ============================================================================
-- usp_ClaimShavingsOrder
-- ============================================================================
-- Worker shavings-mutation authorization fix (P0, 2026-08-06, cancellation
-- predicate widened 2026-08-07). Previously a bare UPDATE with no ranch/role/
-- ownership/state guards -- any authenticated user of any role/ranch could
-- claim an arbitrary order by id. Signature is UNCHANGED (still (integer,
-- integer) -> integer); only the body gained guards, so this is a plain
-- CREATE OR REPLACE, no DROP needed.
--
-- Guards, in the same ERRCODE = 'RN001' -> BL.ValidationException -> 409
-- convention already established by usp_AdminCancelShavingsOrder (241) and
-- usp_SecretaryCancelShavingsOrder (242):
--   - order must resolve to a real competition/host ranch (productrequest ->
--     competition, same join as 241/242)
--   - caller must hold an Approved 'עובד חווה' role at that host ranch
--   - competition must not have ended -- business-date-in-Asia/Jerusalem
--     convention lifted from usp_GetWorkerHomeShavingsFeed (190)
--   - order must not have a Pending OR Approved cancellation (own
--     productchangerequest, EXISTS technique lifted from
--     usp_GetShavingsOrdersForCompetitionAndRanch's IsCancelled/
--     HasPendingCancellation columns, 176) -- a Pending cancellation is
--     already in flight and must block just as hard as an Approved one, so a
--     worker cannot race a mutation in ahead of it resolving; only a
--     Rejected cancellation leaves the order eligible again. (Approved-only
--     was the original, INCOMPLETE version of this guard -- widened
--     2026-08-07 per the confirmed business rule.)
--
-- The actual claim transition stays a single atomic UPDATE ... WHERE (not a
-- separate SELECT-then-UPDATE), so a race between two workers claiming the
-- same order is resolved by Postgres row-level locking, not application
-- logic. WHERE (workersystemuserid IS NULL OR = caller) makes a REPEAT claim
-- by the SAME worker idempotent (still affects the row, rows_affected=1,
-- controller reports success) rather than a spurious conflict; responsetime
-- is COALESCEd so a repeat claim does not reset the original "seen" clock.
-- A claim on an already-delivered order (arrivaltime IS NOT NULL) is
-- rejected via the same WHERE clause, matching "must still be
-- active/actionable" -- surfaces as the existing 0-rows Conflict path,
-- unchanged from before this fix.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_claimshavingsorder(p_shavingsorderid integer, p_workersystemuserid integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_hostranchid        integer;
    v_competitionenddate date;
    v_businessdate       date;
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

    UPDATE public.shavingsorder
    SET workersystemuserid = p_WorkerSystemUserId,
        responsetime       = COALESCE(responsetime, now())  -- "seen by worker" clock; idempotent on repeat claim
    WHERE shavingsorderid = p_ShavingsOrderId
      AND (workersystemuserid IS NULL OR workersystemuserid = p_WorkerSystemUserId)
      AND arrivaltime IS NULL;  -- order must still be active/actionable, not yet delivered

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$function$;
