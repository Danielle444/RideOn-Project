-- 187_usp_RescheduleCompetition.sql
--
-- Competition Reschedule v1 -- postpone a not-yet-started competition forward
-- by a positive whole number of calendar days, moving every dependent
-- planning/service date atomically.
--
-- Scope, locked with Oren (feature/competition-reschedule design audit,
-- 2026-08-02, and the v1 implementation spec that followed it):
--   * FORWARD ONLY (offsetDays > 0). No backward movement, no duration change.
--   * Only a competition that has not started (CURRENT_DATE < competitionstartdate)
--     may move. competitionstatus is deliberately NOT used for this check --
--     the audit proved live that a competition can sit at competitionstatus
--     = 'טיוטה' (Draft) long after its start date has passed (competitions 43,
--     44, 45 verified live 2026-08-02), because CompetitionStatuses' Draft
--     override in Competition.CalculateEffectiveStatus masks the date-derived
--     status entirely. CURRENT_DATE >= competitionstartdate is the only
--     verified-safe "has started" signal.
--   * registrationopendate/registrationenddate/paidtimeregistrationdate/
--     paidtimepublicationdate stay MANUAL and are never touched here.
--   * Historical timestamps (bill, billcharge, entry.cancelledat, shavings
--     responsetime/arrivaltime/deliveryphotodate, changeentryrequest/
--     productchangerequest request/answer timestamps, health-certificate
--     dates, fine snapshots) are never touched here.
--
-- Pending-request risk (the audit's key finding, live-verified against
-- usp_answerchangeentryrequest's deployed body via pg_get_functiondef):
-- that procedure re-reads the COMPETITION's live competitionstartdate /
-- registrationenddate at approval time and compares them against the
-- ORIGINAL, frozen changeentryrequest.requestdatetime to decide fine/charge
-- tier. A reschedule that moves competitionstartdate while a matching
-- Pending request still sits unanswered could silently change that request's
-- eventual fine classification for reasons unrelated to when it was actually
-- submitted. usp_answerproductchangerequest carries the same "Pending +
-- external now()-vs-dates" shape at a lower blast radius. The smallest safe
-- rule (and the one implemented below) is to block the whole reschedule
-- while ANY Pending changeentryrequest or productchangerequest exists for
-- the competition, mirroring the existing "block outright" precedent already
-- used by both of those procedures' own paid-charge guards.
--
-- Paid-time before/during classification: NO stored column exists anywhere
-- in paidtimeslotincompetition (verified live via information_schema and
-- pg_constraint on 2026-08-02 -- ispublished is the only boolean flag, and it
-- is unrelated). The existing form-layer convention (per the paid-time
-- domain notes) is: before = the 3 days preceding competitionstartdate,
-- during = the competition's own [start,end] range, no time-of-day
-- distinction beyond that. This procedure re-derives the classification
-- purely from each slot's relationship to the OLD (pre-shift)
-- competitionstartdate/enddate, exactly as specified, and rejects up front
-- if any existing slot does not already fall cleanly into one of those two
-- windows -- it never invents a new classification column.
--
-- assignedstarttime staleness (live-verified gap, not introduced by this
-- procedure): the existing single-slot editor, usp_updatepaidtimeslotincomp,
-- takes this same advisory lock and updates slotdate/starttime/endtime with
-- no follow-up recompute of paidtimerequest.assignedstarttime for rows
-- already Assigned to that slot -- editing a slot's date today already
-- leaves assignedstarttime stale. This procedure closes that gap for the
-- rows it moves by shifting assignedstarttime by the exact same offset
-- (preserving each request's per-row stagger, which a pure date offset does
-- automatically), and proves it in the post-condition block against an
-- independently captured BEFORE snapshot (not a self-referential check).
--
-- Horse stall-booking overlap: stallbooking carries no competitionid column
-- (verified live) -- it is scoped to a competition only indirectly, via the
-- shared-PK link stallbooking.stallbookingid = productrequest.prequestid and
-- productrequest.competitionid. Tack bookings (isfortack = true, horseid
-- NULL) are excluded from the overlap check by construction (the check only
-- ever runs for horseid IS NOT NULL rows).
--
-- Row-count guard: captured before every write and re-checked after, on
-- every table this procedure touches, satisfying "no charge, bill, payment,
-- entry, request, booking or assignment may be duplicated or recreated as a
-- side effect" (Business Rule 10) as a hard DB-level assertion, not just a
-- design intention.
--
-- Business-rule guards use the existing RN001 convention (see
-- 183_usp_DeleteServiceProduct.sql): RAISE EXCEPTION '<Hebrew text>' USING
-- ERRCODE = 'RN001'. The matching DAL catch (RideOnServer/DAL/
-- CompetitionDAL.cs, RescheduleCompetition) rethrows RideOnServer.BL.
-- ValidationException(ex.MessageText); the new controller action maps that
-- to HTTP 409 (not the 400 some older RN001 call sites use -- see this
-- feature's own final report for why 409 was chosen here specifically).
--
-- STATUS AS WRITTEN: NOT DEPLOYED. This file exists only in the repository
-- on branch feature/competition-reschedule. It has NOT been run against
-- live Supabase in any form (no CREATE, no apply_migration, no execute_sql
-- write). Deployment requires a separate, explicit approval step showing
-- this exact SQL, signature, and verification plan to Oren.
--
-- REVIEW-GATE CORRECTIONS (2026-08-02, second pass):
--
-- 1. Business-date timezone: CURRENT_DATE was replaced with an explicit
--    Israel-local business date. Verified live 2026-08-02: `pg_settings`
--    shows `TimeZone = 'UTC'`, source = configuration file
--    (/etc/postgresql/postgresql.conf) -- this is the server-level default
--    for every connection, not a session quirk, and no role in `pg_roles`
--    overrides it. No existing SQL anywhere in this codebase computes an
--    Israel-aware date (grepped the whole repo for "Asia/Jerusalem" /
--    "AT TIME ZONE" -- zero hits outside unrelated files), so there was no
--    existing convention to conflict with. Competitions are Israeli events;
--    "has this competition started" is a question about the Israel calendar
--    day, not the UTC one. Under a UTC-default database, raw CURRENT_DATE
--    lags the true Israel business date by one day for roughly the last 2-3
--    hours of every Israel calendar day (Israel is UTC+2/+3, ahead of UTC),
--    which could let a reschedule proceed on a competition that has, from
--    the Israel business perspective, already started. `Asia/Jerusalem` is
--    confirmed present in `pg_timezone_names` (currently IDT, +03:00).
--    `v_businessdate := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date`
--    replaces the bare `CURRENT_DATE` at the one call site that used it.
--
-- 2. Concurrent stall-booking overlap race: the review found that a
--    concurrent stallbooking create/update for the same horse could commit
--    between this procedure's overlap check and its own write, since
--    neither side took a shared lock. Fixed by taking
--    pg_advisory_xact_lock(1735, horseid) for every distinct horse behind
--    this competition's stall bookings, in ascending horseid order (to
--    avoid deadlocking against another transaction locking an overlapping
--    horse set in a different order), before the overlap check runs and for
--    the remainder of the transaction. This is only a real fix if every
--    other writer of stallbooking.startdate/enddate/horseid takes the same
--    lock before its own check -- confirmed and applied to all of them:
--    usp_createstallbooking (new repo file 188, previously live-only),
--    usp_createstallbookingchangerequest (new repo file 189, previously
--    live-only), 147_usp_SecretaryUpdateStallBooking.sql, and
--    149_usp_SecretaryCreateStallBookingForPayer.sql. Confirmed OUT of
--    scope (verified live via pg_get_functiondef, do not touch
--    stallbooking.startdate/enddate/horseid at all):
--    usp_answerproductchangerequest (only reads stallbooking for pricing --
--    the actual date-changing INSERT already happened earlier in
--    usp_createstallbookingchangerequest), usp_createstallbookingcancelrequest
--    (only inserts a productchangerequest row), usp_assignstallbookingtostall
--    and usp_unassignstallbookingfromstall (only write stallassignment, the
--    physical stall-map table, never stallbooking). usp_createtackstallbookings
--    delegates to usp_createstallbooking in a loop with horseid always NULL,
--    so it never takes a horse lock (tack bookings are excluded from horse
--    locking by construction, matching the existing horseid IS NOT NULL
--    guard on the overlap check itself).
--
--    UPDATE (2026-08-02, owner decision, same pass): 147 and 149 previously
--    had NO overlap validation of their own -- a secretary could create or
--    update an overlapping booking through those two paths with zero
--    concurrency involved, independent of the race this section fixes. That
--    gap is now CLOSED: both procedures gained the exact same overlap
--    predicate already verified in usp_createstallbooking (188, ported into
--    149) and usp_createstallbookingchangerequest (189, ported into 147),
--    placed after their locks and before any write. The reschedule
--    guarantee is therefore no longer weakened by a sequential (non-
--    concurrent) double-booking through 147/149 -- all five writers now
--    share both the same lock convention AND, where relevant, the same
--    overlap predicate.
--
--    UPDATE (2026-08-03, owner decision): that 2026-08-02 pass ported 188/189's
--    predicate into 147/149 verbatim, INCLUDING their same-competition scope
--    (`pr.competitionid = ...`) -- which was inconsistent with THIS
--    procedure's own overlap rule below, always cross-competition
--    (`other_pr.competitionid <> p_competitionid`). That inconsistency meant
--    a horse could be double-booked into two different competitions through
--    147/149/188/189 (each only checked its own competition), a state this
--    procedure would then correctly refuse to reschedule -- the same
--    physical-overlap problem, caught inconsistently late and in the wrong
--    place. Resolved by making 147/149/188/189's checks GLOBAL by horseid
--    (the competition-id restriction removed from each), matching the rule
--    this procedure has enforced since v1. This procedure's own predicate
--    below is UNCHANGED by this pass -- it was already the correct,
--    consistent (cross-competition) shape; only the other four writers
--    needed to catch up to it.

CREATE OR REPLACE FUNCTION public.usp_reschedulecompetition(
    p_competitionid integer,
    p_offsetdays    integer
)
RETURNS TABLE (
    success                   boolean,
    offsetdays                integer,
    classesmoved              integer,
    paidtimeslotsmoved        integer,
    paidtimeassignmentsmoved  integer,
    stallbookingsmoved        integer,
    shavingsordersmoved       integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_competitionid          integer;
    v_oldstartdate           date;
    v_oldenddate             date;
    v_newstartdate           date;
    v_newenddate             date;
    v_offset_interval        interval;
    v_businessdate           date;
    v_horseid                integer;

    v_classes_before          integer;
    v_slots_before            integer;
    v_assignments_before      integer;
    v_stallbookings_before    integer;
    v_shavings_before         integer;

    v_classes_after           integer;
    v_slots_after             integer;
    v_assignments_after       integer;
    v_stallbookings_after     integer;
    v_shavings_after          integer;

    v_classes_moved           integer := 0;
    v_slots_moved             integer := 0;
    v_assignments_moved       integer := 0;
    v_stallbookings_moved     integer := 0;
    v_shavings_moved          integer := 0;
BEGIN
    -- Same advisory-lock key already taken by every existing paid-time write
    -- procedure (90, 92, 122, 123, 129, 131, 132, 140, 151, 166, 182), so a
    -- reschedule cannot race manual assignment or the auto-scheduler for
    -- this competition. Taken before the row read, per the existing
    -- usp_updatepaidtimeslotincomp precedent.
    PERFORM pg_advisory_xact_lock(1734, p_competitionid);

    SELECT c.competitionid, c.competitionstartdate, c.competitionenddate
    INTO v_competitionid, v_oldstartdate, v_oldenddate
    FROM public.competition c
    WHERE c.competitionid = p_competitionid
    FOR UPDATE;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'התחרות לא נמצאה.' USING ERRCODE = 'RN001';
    END IF;

    -- Business date = the Israel-local calendar date, not the database's UTC
    -- CURRENT_DATE (verified live: TimeZone='UTC' at the server-config level,
    -- no role override). See the header note above for why this matters.
    v_businessdate := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date;

    IF v_businessdate >= v_oldstartdate THEN
        RAISE EXCEPTION 'לא ניתן לדחות תחרות שכבר התחילה.' USING ERRCODE = 'RN001';
    END IF;

    IF p_offsetdays IS NULL OR p_offsetdays <= 0 THEN
        RAISE EXCEPTION 'מספר ימי הדחייה חייב להיות גדול מאפס.' USING ERRCODE = 'RN001';
    END IF;

    -- Pending entry-change / entry-cancellation requests block outright --
    -- see the header note on why (usp_answerchangeentryrequest re-evaluates
    -- live competition dates at approval time).
    IF EXISTS (
        SELECT 1
        FROM public.changeentryrequest cer
        INNER JOIN public.entry e ON e.entryid = cer.originalentryid
        INNER JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
        WHERE cic.competitionid = p_competitionid
          AND cer.status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'לא ניתן לדחות את התחרות כל עוד קיימות בקשות שינוי או ביטול שממתינות לטיפול.' USING ERRCODE = 'RN001';
    END IF;

    -- Pending product (stall/shavings) change/cancellation requests block outright.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        INNER JOIN public.productrequest pr ON pr.prequestid = pcr.originalprequestid
        WHERE pr.competitionid = p_competitionid
          AND pcr.status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'לא ניתן לדחות את התחרות כל עוד קיימות בקשות שינוי או ביטול שממתינות לטיפול.' USING ERRCODE = 'RN001';
    END IF;

    -- Every existing class must already be inside [oldStart, oldEnd].
    -- (Verified live 2026-08-02: this is NOT already guaranteed system-wide --
    -- several duplicate/test competitions currently violate it. Blocking here
    -- protects THIS operation; it does not repair pre-existing bad data.)
    IF EXISTS (
        SELECT 1
        FROM public.classincompetition cic
        WHERE cic.competitionid = p_competitionid
          AND cic.classdatetime IS NOT NULL
          AND (cic.classdatetime::date < v_oldstartdate OR cic.classdatetime::date > v_oldenddate)
    ) THEN
        RAISE EXCEPTION 'לא ניתן לדחות את התחרות משום שקיימים מקצים או זמני פייד־טיים מחוץ לטווח התקין.' USING ERRCODE = 'RN001';
    END IF;

    -- Every existing paid-time slot must already sit in its valid relative
    -- window, derived purely from slotdate vs. the OLD competition dates
    -- (no stored before/during classification exists to read instead):
    --   before = [oldStart - 3, oldStart - 1]
    --   during = [oldStart, oldEnd]
    IF EXISTS (
        SELECT 1
        FROM public.paidtimeslotincompetition ptc
        WHERE ptc.competitionid = p_competitionid
          AND NOT (
                (ptc.slotdate BETWEEN v_oldstartdate - 3 AND v_oldstartdate - 1)
             OR (ptc.slotdate BETWEEN v_oldstartdate AND v_oldenddate)
          )
    ) THEN
        RAISE EXCEPTION 'לא ניתן לדחות את התחרות משום שקיימים מקצים או זמני פייד־טיים מחוץ לטווח התקין.' USING ERRCODE = 'RN001';
    END IF;

    -- Lock every distinct horse behind this competition's stall bookings,
    -- ascending horseid order, BEFORE checking or moving them. This is the
    -- shared lock every other stallbooking-date writer also takes (see the
    -- header note) -- it closes the check-then-write race window against a
    -- concurrent usp_createstallbooking / usp_createstallbookingchangerequest
    -- / usp_secretaryupdatestallbooking / usp_secretarycreatestallbookingforpayer
    -- call for the same horse. Ascending order across every writer prevents
    -- a deadlock when two transactions need overlapping sets of horses.
    -- Tack bookings (horseid NULL) never enter this loop.
    FOR v_horseid IN
        SELECT DISTINCT sb.horseid
        FROM public.stallbooking sb
        INNER JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
        WHERE pr.competitionid = p_competitionid
          AND sb.horseid IS NOT NULL
        ORDER BY sb.horseid
    LOOP
        PERFORM pg_advisory_xact_lock(1735, v_horseid);
    END LOOP;

    -- Horse stall-booking overlap: for every horse booking (isfortack = false,
    -- horseid NOT NULL) belonging to this competition, the SHIFTED range must
    -- not overlap any OTHER competition's booking for the same horse. Tack
    -- bookings are structurally excluded (no horseid to match on). The
    -- competition being moved is excluded from the "other side" of the
    -- comparison via pr.competitionid <> p_competitionid. This has been the
    -- rule here since v1; 147/149/188/189 were made GLOBAL by horseid
    -- (2026-08-03) to match it -- see the header's 2026-08-03 note.
    IF EXISTS (
        SELECT 1
        FROM public.stallbooking sb
        INNER JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
        WHERE pr.competitionid = p_competitionid
          AND sb.horseid IS NOT NULL
          AND EXISTS (
                SELECT 1
                FROM public.stallbooking other_sb
                INNER JOIN public.productrequest other_pr ON other_pr.prequestid = other_sb.stallbookingid
                WHERE other_pr.competitionid <> p_competitionid
                  AND other_sb.horseid = sb.horseid
                  AND (sb.startdate + p_offsetdays) <= other_sb.enddate
                  AND (sb.enddate   + p_offsetdays) >= other_sb.startdate
          )
    ) THEN
        RAISE EXCEPTION 'לא ניתן לדחות את התחרות משום שהדחייה תיצור חפיפה בהזמנת תא של אחד הסוסים.' USING ERRCODE = 'RN001';
    END IF;

    -- ===================================================================
    -- Row counts BEFORE any write (duplication/deletion guard, Business
    -- Rule 10), plus an independent snapshot of assignedstarttime so the
    -- post-condition check proves the offset was applied, rather than
    -- re-deriving it from the same UPDATE that set it.
    -- ===================================================================

    SELECT count(*) INTO v_classes_before
    FROM public.classincompetition
    WHERE competitionid = p_competitionid;

    SELECT count(*) INTO v_slots_before
    FROM public.paidtimeslotincompetition
    WHERE competitionid = p_competitionid;

    SELECT count(*) INTO v_assignments_before
    FROM public.paidtimerequest ptr
    INNER JOIN public.paidtimeslotincompetition ptc ON ptc.paidtimeslotincompid = ptr.assignedcompslotid
    WHERE ptc.competitionid = p_competitionid;

    SELECT count(*) INTO v_stallbookings_before
    FROM public.stallbooking sb
    INNER JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
    WHERE pr.competitionid = p_competitionid;

    SELECT count(*) INTO v_shavings_before
    FROM public.shavingsorder so
    INNER JOIN public.productrequest pr ON pr.prequestid = so.shavingsorderid
    WHERE pr.competitionid = p_competitionid;

    CREATE TEMP TABLE _reschedule_assignment_snapshot (
        paidtimerequestid     integer PRIMARY KEY,
        old_assignedstarttime timestamptz NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO _reschedule_assignment_snapshot (paidtimerequestid, old_assignedstarttime)
    SELECT ptr.paidtimerequestid, ptr.assignedstarttime
    FROM public.paidtimerequest ptr
    INNER JOIN public.paidtimeslotincompetition ptc ON ptc.paidtimeslotincompid = ptr.assignedcompslotid
    WHERE ptc.competitionid = p_competitionid
      AND ptr.assignedstarttime IS NOT NULL;

    v_newstartdate    := v_oldstartdate + p_offsetdays;
    v_newenddate      := v_oldenddate + p_offsetdays;
    v_offset_interval := (p_offsetdays || ' days')::interval;

    -- ===================================================================
    -- Updates -- one transaction, competition anchor first so every later
    -- statement (and the post-condition block) evaluates against the NEW
    -- dates, never a stale intermediate state.
    -- ===================================================================

    UPDATE public.competition
    SET competitionstartdate = v_newstartdate,
        competitionenddate   = v_newenddate
    WHERE competitionid = p_competitionid;

    -- classdatetime is TIMESTAMPTZ; interval addition preserves time-of-day
    -- (which in practice is always truncated to midnight by the app's BL,
    -- but this procedure preserves whatever is actually stored, per spec).
    UPDATE public.classincompetition
    SET classdatetime = classdatetime + v_offset_interval
    WHERE competitionid = p_competitionid
      AND classdatetime IS NOT NULL;
    GET DIAGNOSTICS v_classes_moved = ROW_COUNT;

    -- slotdate is DATE; plain integer-day addition.
    UPDATE public.paidtimeslotincompetition
    SET slotdate = slotdate + p_offsetdays
    WHERE competitionid = p_competitionid;
    GET DIAGNOSTICS v_slots_moved = ROW_COUNT;

    -- assignedstarttime is TIMESTAMPTZ; interval addition preserves each
    -- request's per-row stagger inside the slot (its time-of-day component).
    UPDATE public.paidtimerequest ptr
    SET assignedstarttime = ptr.assignedstarttime + v_offset_interval
    FROM public.paidtimeslotincompetition ptc
    WHERE ptc.paidtimeslotincompid = ptr.assignedcompslotid
      AND ptc.competitionid = p_competitionid
      AND ptr.assignedstarttime IS NOT NULL;
    GET DIAGNOSTICS v_assignments_moved = ROW_COUNT;

    -- startdate/enddate are DATE; plain integer-day addition on both ends
    -- preserves stay-days automatically (enddate-startdate is unchanged).
    UPDATE public.stallbooking sb
    SET startdate = sb.startdate + p_offsetdays,
        enddate   = sb.enddate + p_offsetdays
    FROM public.productrequest pr
    WHERE pr.prequestid = sb.stallbookingid
      AND pr.competitionid = p_competitionid;
    GET DIAGNOSTICS v_stallbookings_moved = ROW_COUNT;

    -- requesteddeliverytime is TIMESTAMP WITHOUT TIME ZONE; interval
    -- addition preserves time-of-day. Only undelivered orders move --
    -- arrivaltime IS NULL is the derived-status "not yet Delivered" gate.
    UPDATE public.shavingsorder so
    SET requesteddeliverytime = so.requesteddeliverytime + v_offset_interval
    FROM public.productrequest pr
    WHERE pr.prequestid = so.shavingsorderid
      AND pr.competitionid = p_competitionid
      AND so.arrivaltime IS NULL
      AND so.requesteddeliverytime IS NOT NULL;
    GET DIAGNOSTICS v_shavings_moved = ROW_COUNT;

    -- ===================================================================
    -- Post-condition checks. Any failure here rolls back the whole
    -- transaction (Business Rule "either every required date moves
    -- successfully, or nothing changes").
    -- ===================================================================

    -- Every class remains between the new start and end dates.
    IF EXISTS (
        SELECT 1 FROM public.classincompetition cic
        WHERE cic.competitionid = p_competitionid
          AND cic.classdatetime IS NOT NULL
          AND (cic.classdatetime::date < v_newstartdate OR cic.classdatetime::date > v_newenddate)
    ) THEN
        RAISE EXCEPTION 'אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.' USING ERRCODE = 'RN001';
    END IF;

    -- Every paid-time slot remains in its valid before/during window,
    -- re-evaluated against the NEW competition dates.
    IF EXISTS (
        SELECT 1 FROM public.paidtimeslotincompetition ptc
        WHERE ptc.competitionid = p_competitionid
          AND NOT (
                (ptc.slotdate BETWEEN v_newstartdate - 3 AND v_newstartdate - 1)
             OR (ptc.slotdate BETWEEN v_newstartdate AND v_newenddate)
          )
    ) THEN
        RAISE EXCEPTION 'אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.' USING ERRCODE = 'RN001';
    END IF;

    -- Every assignedstarttime moved by EXACTLY the captured offset (proven
    -- against the independent BEFORE snapshot, not re-derived from itself).
    IF EXISTS (
        SELECT 1
        FROM _reschedule_assignment_snapshot snap
        INNER JOIN public.paidtimerequest ptr ON ptr.paidtimerequestid = snap.paidtimerequestid
        WHERE ptr.assignedstarttime IS DISTINCT FROM (snap.old_assignedstarttime + v_offset_interval)
    ) THEN
        RAISE EXCEPTION 'אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.' USING ERRCODE = 'RN001';
    END IF;

    -- No horse stall overlap exists, re-checked against the now-committed
    -- (within this transaction) shifted dates.
    IF EXISTS (
        SELECT 1
        FROM public.stallbooking sb
        INNER JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
        WHERE pr.competitionid = p_competitionid
          AND sb.horseid IS NOT NULL
          AND EXISTS (
                SELECT 1
                FROM public.stallbooking other_sb
                INNER JOIN public.productrequest other_pr ON other_pr.prequestid = other_sb.stallbookingid
                WHERE other_pr.competitionid <> p_competitionid
                  AND other_sb.horseid = sb.horseid
                  AND sb.startdate <= other_sb.enddate
                  AND sb.enddate   >= other_sb.startdate
          )
    ) THEN
        RAISE EXCEPTION 'אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.' USING ERRCODE = 'RN001';
    END IF;

    -- Entity row counts did not change on any touched table.
    SELECT count(*) INTO v_classes_after
    FROM public.classincompetition WHERE competitionid = p_competitionid;

    SELECT count(*) INTO v_slots_after
    FROM public.paidtimeslotincompetition WHERE competitionid = p_competitionid;

    SELECT count(*) INTO v_assignments_after
    FROM public.paidtimerequest ptr
    INNER JOIN public.paidtimeslotincompetition ptc ON ptc.paidtimeslotincompid = ptr.assignedcompslotid
    WHERE ptc.competitionid = p_competitionid;

    SELECT count(*) INTO v_stallbookings_after
    FROM public.stallbooking sb
    INNER JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
    WHERE pr.competitionid = p_competitionid;

    SELECT count(*) INTO v_shavings_after
    FROM public.shavingsorder so
    INNER JOIN public.productrequest pr ON pr.prequestid = so.shavingsorderid
    WHERE pr.competitionid = p_competitionid;

    IF v_classes_after       <> v_classes_before
    OR v_slots_after         <> v_slots_before
    OR v_assignments_after   <> v_assignments_before
    OR v_stallbookings_after <> v_stallbookings_before
    OR v_shavings_after      <> v_shavings_before THEN
        RAISE EXCEPTION 'אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.' USING ERRCODE = 'RN001';
    END IF;

    RETURN QUERY
    SELECT
        true,
        p_offsetdays,
        v_classes_moved,
        v_slots_moved,
        v_assignments_moved,
        v_stallbookings_moved,
        v_shavings_moved;
END;
$function$;
