-- ============================================================================
-- usp_SaveDeliveryPhoto
-- ============================================================================
-- Worker shavings-mutation authorization fix (P0, 2026-08-06). Previously
-- took no caller identity at all and unconditionally overwrote the photo/
-- status on any order id -- any authenticated user could falsify delivery of
-- an arbitrary order and silently replace an already-recorded proof photo.
--
-- Signature gains p_workersystemuserid (the caller identity needed for the
-- ownership guard) and return type changes void -> integer (rows-affected,
-- matching usp_MarkDelivered's existing convention).
--
-- DEPLOYMENT SHAPE (staged cutover, revised 2026-08-06 after a Render
-- rolling-deploy audit): this file CREATEs the new 4-arg signature as a
-- genuine PostgreSQL overload ALONGSIDE the old 3-arg/void signature --
-- it deliberately does NOT DROP the old one. PostgreSQL resolves overloaded
-- functions purely by argument COUNT/type at the call site (confirmed
-- against DBServices.CreateCommandWithStoredProcedure, which builds
-- `SELECT * FROM fn(@p1, @p2, ...)` with one positional placeholder per
-- dictionary entry -- no named-argument syntax, no ambiguity possible
-- between a 3-arg and a 4-arg call). This is the same coexisting-overload
-- technique already established in this codebase for the duplicate-
-- competition timestamptz shim (see ride-on-system-knowledge -> Competition
-- Duplication) -- chosen over a "-secured"/"-v2" rename because it needs no
-- DAL proc-name change and matches existing convention.
--
-- This keeps the CURRENTLY DEPLOYED (old) server fully functional against
-- this same database during a Render rolling deploy: the old server always
-- sends exactly 3 positional args and can only ever resolve to the old
-- signature. Only once the NEW server (which sends 4 args) is confirmed
-- live on every instance should the old 3-arg signature be dropped, in a
-- SEPARATE Phase C cleanup migration -- never bundled with this file. See
-- the session report for the exact three-phase SQL and rollback per phase.
--
-- Guards mirror usp_ClaimShavingsOrder (115) for host-ranch/role/competition-
-- ended/cancelled -- same ERRCODE = 'RN001' convention, same joins. The
-- cancellation guard blocks on BOTH Pending and Approved (widened
-- 2026-08-07; Approved-only was the original, incomplete version). Ownership
-- and the already-has-photo state are checked via SELECT ... FOR UPDATE
-- (row-locked for the remainder of this function call) followed by explicit
-- RN001 guards, then an unconditional UPDATE -- avoids a check-then-act race
-- between two concurrent save-delivery-photo calls on the same order.
--
-- "Must not replace an existing proof photo after completion": a photo is
-- accepted only when deliveryphotourl IS NULL going in. This deliberately
-- still allows a photo to be added to an order that was already marked
-- Delivered WITHOUT a photo (via the no-photo fallback, usp_MarkDelivered) --
-- that is the documented "unverified -> verified" promotion (arrivaltime
-- IS NOT NULL AND deliveryphotourl IS NULL), and arrivaltime stays COALESCEd
-- so the promotion never moves the original delivered-at time.
-- ============================================================================

-- Phase A: additive only. The old 3-arg/void public.usp_savedeliveryphoto(integer, text,
-- timestamp with time zone) is intentionally left untouched here -- do not add a DROP
-- FUNCTION for it in this file. Its removal is Phase C, run separately once the new
-- server build is confirmed live on every Render instance.
CREATE OR REPLACE FUNCTION public.usp_savedeliveryphoto(
    p_shavingsorderid    integer,
    p_deliveryphotourl   text,
    p_deliveryphotodate  timestamp with time zone,
    p_workersystemuserid integer
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_hostranchid          integer;
    v_competitionenddate   date;
    v_businessdate         date;
    v_current_worker       integer;
    v_existing_photourl    text;
    v_rows_affected        integer;
BEGIN
    IF p_shavingsorderid IS NULL OR p_shavingsorderid <= 0 THEN
        RAISE EXCEPTION 'Invalid shavings order id' USING ERRCODE = 'RN001';
    END IF;

    IF p_workersystemuserid IS NULL OR p_workersystemuserid <= 0 THEN
        RAISE EXCEPTION 'Invalid worker system user id' USING ERRCODE = 'RN001';
    END IF;

    IF p_deliveryphotourl IS NULL OR btrim(p_deliveryphotourl) = '' THEN
        RAISE EXCEPTION 'Delivery photo url is required' USING ERRCODE = 'RN001';
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

    SELECT workersystemuserid, deliveryphotourl
    INTO v_current_worker, v_existing_photourl
    FROM public.shavingsorder
    WHERE shavingsorderid = p_shavingsorderid
    FOR UPDATE;

    IF v_current_worker IS DISTINCT FROM p_workersystemuserid THEN
        RAISE EXCEPTION 'This shavings order is not claimed by you' USING ERRCODE = 'RN001';
    END IF;

    IF v_existing_photourl IS NOT NULL THEN
        RAISE EXCEPTION 'A delivery photo has already been recorded for this order' USING ERRCODE = 'RN001';
    END IF;

    UPDATE public.shavingsorder
    SET deliveryphotourl  = p_DeliveryPhotoUrl,
        deliveryphotodate = p_DeliveryPhotoDate,
        arrivaltime       = COALESCE(arrivaltime, now()),  -- delivered-at (idempotent; may already be set via mark-delivered)
        deliverystatus    = 'Delivered'
    WHERE shavingsorderid = p_ShavingsOrderId;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$function$;
