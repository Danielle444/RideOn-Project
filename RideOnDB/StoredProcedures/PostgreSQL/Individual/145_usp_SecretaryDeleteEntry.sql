-- ============================================================================
-- usp_SecretaryDeleteEntry
-- ============================================================================
-- Direct cancel of an entry by the host secretary (no pending change request).
-- Pattern: soft-delete via entry.entrystatus + audit row in changeentryrequest
-- (status='Approved', iscancelled=true) so the action is traceable.
-- Also marks the related billcharge as Cancelled so it stops showing in
-- payment screens.
--
-- Ownership: caller must hold the 'מזכירת חווה מארחת' role at the ranch
-- that hosts the competition this entry belongs to.
--
-- Guards:
--   - Entry exists
--   - Not already cancelled
--   - No open pending change request (to avoid race)
--
-- 2026-08-04: first caller integration for the Federation allocation-release
-- helper (public.usp_releasefederationallocationsforcharge, 223), same slice
-- pattern already deployed on usp_answerchangeentryrequestsecured (221).
--
-- The entry lookup now takes FOR UPDATE OF e - the transaction's level-1
-- lock, since this function (unlike 221) creates a brand-new
-- changeentryrequest row on every call rather than answering an existing
-- one; the entry row is the only pre-existing, stable resource two
-- concurrent direct cancellations of the same entry actually contend on. A
-- second concurrent call blocks here and, once unblocked, re-reads
-- entrystatus fresh and correctly hits the "already cancelled" guard below.
--
-- The old sr.paymentid guard is removed - servicerequest.paymentid is not an
-- authoritative real-payment marker (confirmed against a live entry that was
-- cancelled through this function while paymentid was NULL despite a real
-- paymentbatch existing on its Organizer charge). Replaced with the same
-- lock-then-check pattern already proven on SP 200/221: every Organizer
-- classes/Entry charge for the entry is locked ascending by billchargeid,
-- then checked for chargestatus='Paid' under that lock, raising the same
-- pre-existing message ('Cannot delete a paid entry') this function already
-- used for the paid-entry case.
--
-- Cancellation now splits on Rule 1 vs Rule 2, using
-- (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date < v_competitionstartdate
-- (previously no such distinction existed - entrystatus was always set to
-- 'Cancelled' regardless of timing):
--   Rule 1 (before competition start) - Organizer lock/guard as above, then
--     resolves Federation classes/Entry charges deterministically (0 -> no
--     call, 1 -> call the helper once, >1 -> raise and roll back - never
--     LIMIT 1, never a loop, never a silent pick), then cancels eligible
--     Entry charges (now including 'Paid', for a charge the helper just
--     released, and paymentbatchid IS NULL as a defense-in-depth filter
--     against ever touching a really-paid charge), then explicitly
--     recalculates the bill: bill.amounttopay has no trigger and no other
--     maintenance path in this codebase, so it would otherwise go stale the
--     moment a Paid charge is cancelled here - the same reasoning already
--     applied by usp_insertentry/usp_createshavingsorder/
--     usp_createcompetitionpayerpayment for their own single bill.
--   Rule 2 (on/after competition start) - entry becomes CancelledAfterStart,
--     no helper call, no charge cancellation, no allocation release, no bill
--     recalculation (nothing changed to make stale) - only a notes-only
--     audit annotation, mirroring 221's own Rule 2 branch.
--
-- No fine logic is introduced - this function created none before and still
-- creates none.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_secretarydeleteentry(
    p_entryid                  integer,
    p_secretarysystemuserid    integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_classincompid        integer;
    v_competitionid        integer;
    v_hostranchid          integer;
    v_competitionstartdate date;
    v_billid                integer;
    v_entrystatus           varchar;
    v_existing_pend         integer;
    v_new_request_id        integer;

    v_is_rule1                  boolean;
    v_federation_billchargeids  integer[];
    v_federation_count          integer;
BEGIN
    -- Look up entry context, locked: two concurrent direct cancellations of
    -- the same entry now serialize here, so a second call always observes
    -- the first's committed entrystatus, not a stale pre-cancel snapshot.
    SELECT
        e.classincompid,
        cic.competitionid,
        c.hostranchid,
        c.competitionstartdate,
        sr.billid,
        COALESCE(e.entrystatus, 'Active')
    INTO
        v_classincompid,
        v_competitionid,
        v_hostranchid,
        v_competitionstartdate,
        v_billid,
        v_entrystatus
    FROM public.entry e
    JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
    JOIN public.competition c ON c.competitionid = cic.competitionid
    JOIN public.servicerequest sr ON sr.srequestid = e.entryid
    WHERE e.entryid = p_entryid
    FOR UPDATE OF e;

    IF v_classincompid IS NULL THEN
        RAISE EXCEPTION 'Entry not found';
    END IF;

    -- Ownership: secretary of the host ranch
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_secretarysystemuserid
          AND prr.ranchid = v_hostranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'מזכירת חווה מארחת'
    ) THEN
        RAISE EXCEPTION 'Permission denied: not the host ranch secretary';
    END IF;

    IF v_entrystatus = 'Cancelled' OR v_entrystatus = 'CancelledAfterStart' THEN
        RAISE EXCEPTION 'Entry already cancelled';
    END IF;

    -- Block if another change request is still Pending
    SELECT cer.changeentryrequestid
    INTO v_existing_pend
    FROM public.changeentryrequest cer
    WHERE cer.originalentryid = p_entryid
      AND cer.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending change request exists for this entry — resolve it first';
    END IF;

    -- Audit row: pre-approved cancel by secretary
    INSERT INTO public.changeentryrequest (
        originalentryid,
        newentryid,
        requestdatetime,
        status,
        iscancelled,
        fineid,
        fineamountsnapshot
    )
    VALUES (
        p_entryid,
        NULL,
        now(),
        'Approved',
        TRUE,
        NULL,
        NULL
    )
    RETURNING changeentryrequestid INTO v_new_request_id;

    v_is_rule1 := ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date < v_competitionstartdate);

    -- Mark entry as cancelled
    UPDATE public.entry
    SET entrystatus                = CASE WHEN v_is_rule1 THEN 'Cancelled' ELSE 'CancelledAfterStart' END,
        cancelledat                = now(),
        cancelledbychangerequestid = v_new_request_id
    WHERE entryid = p_entryid;

    IF v_is_rule1 THEN

        -- Lock every Organizer classes/Entry charge for this entry (no
        -- uniqueness constraint guarantees exactly one), ascending
        -- billchargeid, matching the convention established for SP 200/221.
        PERFORM 1
        FROM public.billcharge bc
        WHERE bc.sourcetype = 'Entry'
          AND bc.sourceid = p_entryid
          AND bc.chargeowner = 'Organizer'
        ORDER BY bc.billchargeid
        FOR UPDATE OF bc;

        IF EXISTS (
            SELECT 1
            FROM public.billcharge bc
            WHERE bc.sourcetype = 'Entry'
              AND bc.sourceid = p_entryid
              AND bc.chargeowner = 'Organizer'
              AND bc.chargestatus = 'Paid'
        ) THEN
            RAISE EXCEPTION 'Cannot delete a paid entry';
        END IF;

        -- Deterministic Federation lookup: zero charges -> no call, one
        -- charge -> call the helper once, more than one -> raise. No
        -- LIMIT 1, no loop, no silent pick.
        SELECT
            array_agg(bc.billchargeid ORDER BY bc.billchargeid),
            count(*)
        INTO
            v_federation_billchargeids,
            v_federation_count
        FROM public.billcharge bc
        WHERE bc.sourcetype = 'Entry'
          AND bc.sourceid = p_entryid
          AND bc.chargeowner = 'Federation'
          AND bc.categorykey = 'classes';

        IF v_federation_count > 1 THEN
            RAISE EXCEPTION 'Multiple Federation entry charges found for entry %', p_entryid;
        END IF;

        IF v_federation_count = 1 THEN
            PERFORM public.usp_releasefederationallocationsforcharge(v_federation_billchargeids[1]);
        END IF;

        -- Cancel related charges (Organizer + Federation together, matching
        -- this function's existing convention), only after the Organizer
        -- guard and Federation resolution/helper call above succeed. 'Paid'
        -- is added so a charge the helper just released (still Paid until
        -- this step) is actually cancelled; paymentbatchid IS NULL is added
        -- so a charge closed via a real payment batch is never touched here
        -- even if some earlier guard were ever bypassed.
        UPDATE public.billcharge
        SET chargestatus = 'Cancelled',
            cancelledat  = now()
        WHERE sourcetype = 'Entry'
          AND sourceid   = p_entryid
          AND chargestatus IN ('Open', 'PendingApproval', 'Paid')
          AND paymentbatchid IS NULL;

        -- bill.amounttopay has no trigger and no other maintenance path in
        -- this codebase - it must be recomputed explicitly whenever a charge
        -- feeding its Open/Paid definition changes status, exactly as
        -- usp_insertentry/usp_createshavingsorder/usp_createcompetitionpayerpayment
        -- already do for their own single bill.
        PERFORM public.usp_recalculatebillamount(v_billid);

    ELSE

        UPDATE public.billcharge
        SET notes = coalesce(notes, '') || ' | Direct secretary cancellation after competition start - full charge kept ' || v_new_request_id
        WHERE sourcetype = 'Entry'
          AND sourceid   = p_entryid
          AND chargestatus = 'Open';

    END IF;

    RETURN v_new_request_id;
END;
$$;
