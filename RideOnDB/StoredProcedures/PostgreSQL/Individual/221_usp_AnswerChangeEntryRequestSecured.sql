-- ============================================================================
-- usp_answerchangeentryrequestsecured - competition-scoped approve/reject of a
-- pending entry change or cancellation (Stage: change-request-answer-scoping,
-- 2026-08-03)
-- ============================================================================
-- NEW FUNCTION, added alongside the existing (unmodified, still deployed)
-- 4-argument public.usp_answerchangeentryrequest (210_usp_AnswerChangeEntryRequest.sql).
-- 210 is deliberately left untouched in this slice to avoid an unavoidable
-- deployment break: the old Render server calls it with 4 arguments, and a
-- DROP+CREATE with 5 arguments would break that server for the window between
-- the DB deploy and the code deploy. This function is additive only.
--
-- Problem this closes: the Controller (ChangeTrackingController.AnswerSecretaryChangeRequest)
-- already validates that the caller is an authorized HostSecretary for the
-- client-supplied competitionId/ranchId pair, but the target requestId itself
-- was never independently bound to that competition - a HostSecretary of one
-- competition could answer a changeentryrequest belonging to a DIFFERENT
-- competition merely by supplying its id alongside their own authorized
-- competitionId/ranchId.
--
-- Fix: exactly ONE change from 210's live-verified body - the initial lookup's
-- WHERE clause gains "and cic.competitionid = p_competitionid". Every other
-- line, branch, and statement below is reproduced verbatim from 210,
-- unchanged, in the same order:
--   - status validation ("Only pending ... can be answered")
--   - the paid-entry guard
--   - the effective-fine lookup (cancellation vs. change)
--   - the Rejected branch (including the new-entry rollback)
--   - the Approved/cancelled branch (fine insert, before/after registration-end
--     billcharge handling, post-start "full charge kept" branch)
--   - the Approved/change branch (replace old entry, activate new entry,
--     billcharge Replaced/Open transitions, change-fine insert)
--   - the closing bill.amounttopay recalculation
--   - the returned changeentryrequestid
--
-- A requestId belonging to a different competition simply fails to match the
-- lookup's WHERE clause, so v_originalentryid stays NULL and execution falls
-- into the SAME existing "raise exception 'Change entry request not found'"
-- branch that already handles a genuinely nonexistent id. This is deliberate:
-- a foreign-competition id and a nonexistent id are indistinguishable to the
-- caller - no new error path, no new SQLSTATE, no message revealing that a
-- requestId exists under a different competition.
--
-- CLEANUP: the old 4-argument public.usp_answerchangeentryrequest (210) will
-- be dropped in a SEPARATE later stage, only after the new server is
-- deployed and a repository-wide plus live dependency check proves it has no
-- remaining callers.
-- ============================================================================
-- 2026-08-04: first caller integration for the Federation allocation-release
-- helper (public.usp_releasefederationallocationsforcharge, 223), scoped to
-- an approved cancellation (lower(p_answerstatus)='approved' and
-- v_iscancelled=true) only. Rejected requests and non-cancellation change
-- requests are unaffected - their existing paid guard and behavior are
-- preserved exactly.
--
-- The secured request lookup now takes FOR UPDATE OF cer, the transaction's
-- level-1 lock: two concurrent answers to the same request now serialize
-- there, so a second answer always observes the first's committed status
-- (Approved/Rejected) instead of a stale Pending snapshot.
--
-- Cancellation now splits on Rule 1 vs Rule 2, using
-- (v_requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < v_competitionstartdate
-- (previously an implicit-timezone v_requestdatetime::date comparison):
--   Rule 1 (before competition start) - locks every Organizer classes/Entry
--     charge for the entry (ascending billchargeid, no uniqueness constraint
--     guarantees exactly one), blocks on a Paid Organizer charge exactly as
--     before, then resolves Federation classes/Entry charges deterministically
--     (0 -> no call, 1 -> call the helper once, >1 -> raise and roll back -
--     never LIMIT 1, never a loop, never a silent pick), before the existing
--     charge-cancellation/fine logic runs.
--   Rule 2 (on/after competition start) - unchanged from the prior
--     "full charge kept" behavior: no helper call, no charge cancellation,
--     allocations and credit amounts untouched.
--
-- Lock order: changeentryrequest -> Organizer billcharge(s) -> [inside the
-- single helper call] federationexternalcredit(s) -> Federation billcharge ->
-- federationcreditallocation. Matches usp_createcompetitionpayerpayment's
-- (200) own multi-row ascending lock convention for the Organizer step; the
-- Federation step enters the helper's already-proven lock order at most once
-- per call, so no cross-call credit-lock ordering question can arise within
-- a single execution of this function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_answerchangeentryrequestsecured(
    p_changeentryrequestid   integer,
    p_answerstatus           text,
    p_answeredbysystemuserid integer,
    p_competitionid          integer,
    p_notes                  text DEFAULT NULL::text
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_originalentryid integer;
    v_newentryid integer;
    v_iscancelled boolean;
    v_currentstatus text;
    v_fineid integer;
    v_fineamount numeric(10,2);
    v_requestdatetime timestamp with time zone;

    v_competitionid integer;
    v_registrationenddate date;
    v_competitionstartdate date;

    v_effectivefineid integer;
    v_effectivefineamount numeric(10,2);

    v_fine_billid integer;
    v_fine_payerpersonid integer;

    v_is_rule1 boolean;
    v_federation_billchargeids integer[];
    v_federation_count integer;
begin
    if p_changeentryrequestid is null or p_changeentryrequestid <= 0 then
        raise exception 'Invalid change entry request id';
    end if;

    if p_answerstatus is null
       or lower(p_answerstatus) not in ('approved', 'rejected') then
        raise exception 'Answer status must be Approved or Rejected';
    end if;

    if p_answeredbysystemuserid is null or p_answeredbysystemuserid <= 0 then
        raise exception 'Invalid answered by system user id';
    end if;

    select
        cer.originalentryid,
        cer.newentryid,
        cer.iscancelled,
        cer.status,
        cer.fineid,
        cer.fineamountsnapshot,
        cer.requestdatetime,
        cic.competitionid,
        c.registrationenddate,
        c.competitionstartdate
    into
        v_originalentryid,
        v_newentryid,
        v_iscancelled,
        v_currentstatus,
        v_fineid,
        v_fineamount,
        v_requestdatetime,
        v_competitionid,
        v_registrationenddate,
        v_competitionstartdate
    from public.changeentryrequest cer
    inner join public.entry e
        on e.entryid = cer.originalentryid
    inner join public.classincompetition cic
        on cic.classincompid = e.classincompid
    inner join public.competition c
        on c.competitionid = cic.competitionid
    where cer.changeentryrequestid = p_changeentryrequestid
      and cic.competitionid = p_competitionid
    for update of cer;

    if v_originalentryid is null then
        raise exception 'Change entry request not found';
    end if;

    if lower(v_currentstatus) <> 'pending' then
        raise exception 'Only pending change entry requests can be answered';
    end if;

    if lower(p_answerstatus) = 'rejected' or v_iscancelled = false then
        if exists (
            select 1
            from public.billcharge bc
            where bc.sourcetype = 'Entry'
              and bc.sourceid = v_originalentryid
              and bc.chargestatus = 'Paid'
        ) then
            raise exception 'Cannot answer change request for a paid entry';
        end if;
    end if;

    v_effectivefineid := v_fineid;
    v_effectivefineamount := v_fineamount;

    if v_effectivefineamount is null then
        if v_iscancelled = true then
            select
                f.fineid,
                f.fineamount
            into
                v_effectivefineid,
                v_effectivefineamount
            from public.fine f
            where f.isactive = true
              and f.finereason = 'EntryCancellation'
              and f.triggermode = 'Between'
              and f.startevent = 'RegistrationEnd'
              and f.endevent = 'CompetitionStart'
              and v_requestdatetime::date > v_registrationenddate
              and v_requestdatetime::date < v_competitionstartdate
            order by f.fineamount desc
            limit 1;
        else
            select
                f.fineid,
                f.fineamount
            into
                v_effectivefineid,
                v_effectivefineamount
            from public.fine f
            where f.isactive = true
              and f.finereason = 'LateRegistration'
              and (
                    (
                        f.triggermode = 'Between'
                        and f.startevent = 'RegistrationEnd'
                        and f.endevent = 'CompetitionStart'
                        and v_requestdatetime::date > v_registrationenddate
                        and v_requestdatetime::date < v_competitionstartdate
                    )
                    or
                    (
                        f.triggermode = 'After'
                        and f.startevent = 'CompetitionStart'
                        and v_requestdatetime::date >= v_competitionstartdate
                    )
                  )
            order by
                case when f.triggermode = 'After' then 1 else 2 end,
                f.fineamount desc
            limit 1;
        end if;
    end if;

    if lower(p_answerstatus) = 'rejected' then
        update public.changeentryrequest
        set status = 'Rejected'
        where changeentryrequestid = p_changeentryrequestid;

        if v_iscancelled = false and v_newentryid is not null then
            update public.entry
            set
                entrystatus = 'Rejected',
                draworder = null
            where entryid = v_newentryid;

            update public.billcharge
            set
                chargestatus = 'Cancelled',
                cancelledat = now(),
                notes = coalesce(notes, '') || ' | Rejected change entry request ' || p_changeentryrequestid
            where sourcetype = 'Entry'
              and sourceid = v_newentryid
              and chargestatus = 'PendingApproval'
              and paymentbatchid is null;
        end if;

        return p_changeentryrequestid;
    end if;

    update public.changeentryrequest
    set
        status = 'Approved',
        fineid = coalesce(fineid, v_effectivefineid),
        fineamountsnapshot = coalesce(fineamountsnapshot, v_effectivefineamount)
    where changeentryrequestid = p_changeentryrequestid;

    if v_iscancelled = true then

        v_is_rule1 := ((v_requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < v_competitionstartdate);

        update public.entry
        set
            entrystatus =
                case
                    when v_is_rule1 then 'Cancelled'
                    else 'CancelledAfterStart'
                end,
            cancelledat = now(),
            cancelledbychangerequestid = p_changeentryrequestid,
            draworder = null
        where entryid = v_originalentryid;

        if v_is_rule1 then

            -- Level 2 lock: every Organizer classes/Entry charge for this
            -- entry (no uniqueness constraint guarantees exactly one),
            -- ascending billchargeid, matching
            -- usp_createcompetitionpayerpayment's (200) own multi-row
            -- ascending lock convention.
            perform 1
            from public.billcharge bc
            where bc.sourcetype = 'Entry'
              and bc.sourceid = v_originalentryid
              and bc.chargeowner = 'Organizer'
            order by bc.billchargeid
            for update of bc;

            if exists (
                select 1
                from public.billcharge bc
                where bc.sourcetype = 'Entry'
                  and bc.sourceid = v_originalentryid
                  and bc.chargeowner = 'Organizer'
                  and bc.chargestatus = 'Paid'
            ) then
                raise exception 'Cannot answer change request for a paid entry';
            end if;

            -- Deterministic Federation lookup: zero charges -> no call, one
            -- charge -> call the helper once, more than one -> raise. No
            -- LIMIT 1, no loop, no silent pick.
            select
                array_agg(bc.billchargeid order by bc.billchargeid),
                count(*)
            into
                v_federation_billchargeids,
                v_federation_count
            from public.billcharge bc
            where bc.sourcetype = 'Entry'
              and bc.sourceid = v_originalentryid
              and bc.chargeowner = 'Federation'
              and bc.categorykey = 'classes';

            if v_federation_count > 1 then
                raise exception 'Multiple Federation entry charges found for entry %', v_originalentryid;
            end if;

            if v_federation_count = 1 then
                perform public.usp_releasefederationallocationsforcharge(v_federation_billchargeids[1]);
            end if;

            if v_effectivefineamount is not null and v_effectivefineamount > 0 then
                update public.billcharge
                set
                    chargestatus = 'Cancelled',
                    cancelledat = now(),
                    notes = coalesce(notes, '') || ' | Approved entry cancellation request ' || p_changeentryrequestid
                where sourcetype = 'Entry'
                  and sourceid = v_originalentryid
                  and chargestatus in ('Open', 'Paid')
                  and paymentbatchid is null;

                select
                    sr.billid,
                    b.paidbypersonid
                into
                    v_fine_billid,
                    v_fine_payerpersonid
                from public.servicerequest sr
                inner join public.bill b
                    on b.billid = sr.billid
                where sr.srequestid = v_originalentryid
                limit 1;

                if v_fine_billid is null then
                    raise exception 'Could not find bill for original entry';
                end if;

                insert into public.billcharge
                (
                    billid,
                    competitionid,
                    paidbypersonid,
                    chargeowner,
                    categorykey,
                    sourcetype,
                    sourceid,
                    amounttopay,
                    chargestatus,
                    paymentbatchid,
                    createdat,
                    notes
                )
                values
                (
                    v_fine_billid,
                    v_competitionid,
                    v_fine_payerpersonid,
                    'Organizer',
                    'classes',
                    'Fine',
                    p_changeentryrequestid,
                    v_effectivefineamount,
                    'Open',
                    null,
                    now(),
                    'Entry cancellation fine. FineId=' || coalesce(v_effectivefineid::text, '-')
                );

            else
                update public.billcharge
                set
                    chargestatus = 'Cancelled',
                    cancelledat = now(),
                    notes = coalesce(notes, '') || ' | Approved entry cancellation ' || p_changeentryrequestid
                where sourcetype = 'Entry'
                  and sourceid = v_originalentryid
                  and chargestatus in ('Open', 'Paid')
                  and paymentbatchid is null;
            end if;

        else

            update public.billcharge
            set notes = coalesce(notes, '') || ' | Approved entry cancellation after competition start - full charge kept ' || p_changeentryrequestid
            where sourcetype = 'Entry'
              and sourceid = v_originalentryid
              and chargestatus = 'Open';

        end if;

    else
        if v_newentryid is null then
            raise exception 'New entry id is required for approved change request';
        end if;

        update public.entry
        set
            entrystatus = 'Replaced',
            replacedbyentryid = v_newentryid,
            draworder = null
        where entryid = v_originalentryid;

        update public.entry
        set
            entrystatus = 'Active'
        where entryid = v_newentryid;

        -- Deterministic Federation lookup for the entry being replaced:
        -- zero charges -> no call, one charge -> call the helper once, more
        -- than one -> raise. No LIMIT 1, no loop, no silent pick - same
        -- pattern as the cancellation branch above. The earlier blanket
        -- paid guard (lower(p_answerstatus)='rejected' or v_iscancelled=false)
        -- already aborted this whole request if any charge - Organizer or
        -- Federation - was Paid, so a charge found here can only be Open (or
        -- an unreachable terminal status); calling the helper can therefore
        -- never block a legitimate replacement.
        select
            array_agg(bc.billchargeid order by bc.billchargeid),
            count(*)
        into
            v_federation_billchargeids,
            v_federation_count
        from public.billcharge bc
        where bc.sourcetype = 'Entry'
          and bc.sourceid = v_originalentryid
          and bc.chargeowner = 'Federation'
          and bc.categorykey = 'classes';

        if v_federation_count > 1 then
            raise exception 'Multiple Federation entry charges found for entry %', v_originalentryid;
        end if;

        if v_federation_count = 1 then
            perform public.usp_releasefederationallocationsforcharge(v_federation_billchargeids[1]);
        end if;

        update public.billcharge
        set
            chargestatus = 'Replaced',
            cancelledat = now(),
            notes = coalesce(notes, '') || ' | Replaced by change entry request ' || p_changeentryrequestid
        where sourcetype = 'Entry'
          and sourceid = v_originalentryid
          and chargestatus = 'Open'
          and paymentbatchid is null;

        update public.billcharge
        set
            chargestatus = 'Open',
            notes = coalesce(notes, '') || ' | Approved change entry request ' || p_changeentryrequestid
        where sourcetype = 'Entry'
          and sourceid = v_newentryid
          and chargestatus = 'PendingApproval'
          and paymentbatchid is null;

        if v_effectivefineamount is not null and v_effectivefineamount > 0 then
            select
                sr.billid,
                b.paidbypersonid
            into
                v_fine_billid,
                v_fine_payerpersonid
            from public.servicerequest sr
            inner join public.bill b
                on b.billid = sr.billid
            where sr.srequestid = v_newentryid
            limit 1;

            if v_fine_billid is null then
                raise exception 'Could not find bill for new entry';
            end if;

            insert into public.billcharge
            (
                billid,
                competitionid,
                paidbypersonid,
                chargeowner,
                categorykey,
                sourcetype,
                sourceid,
                amounttopay,
                chargestatus,
                paymentbatchid,
                createdat,
                notes
            )
            values
            (
                v_fine_billid,
                v_competitionid,
                v_fine_payerpersonid,
                'Organizer',
                'classes',
                'Fine',
                p_changeentryrequestid,
                v_effectivefineamount,
                'Open',
                null,
                now(),
                'Entry change fine. FineId=' || coalesce(v_effectivefineid::text, '-')
            );
        end if;
    end if;

    update public.bill b
    set amounttopay = coalesce(
        (
            select sum(bc.amounttopay)
            from public.billcharge bc
            where bc.billid = b.billid
              and bc.chargestatus in ('Open', 'Paid')
        ),
        0
    )
    where b.billid in (
        select distinct bc.billid
        from public.billcharge bc
        where (
                bc.sourcetype = 'Entry'
                and bc.sourceid in (
                    v_originalentryid,
                    coalesce(v_newentryid, v_originalentryid)
                )
              )
           or (
                bc.sourcetype = 'Fine'
                and bc.sourceid = p_changeentryrequestid
              )
    )
    or b.billid in (
        select sr.billid
        from public.servicerequest sr
        where sr.srequestid in (
            v_originalentryid,
            coalesce(v_newentryid, v_originalentryid)
        )
    );

    return p_changeentryrequestid;
end;
$function$
