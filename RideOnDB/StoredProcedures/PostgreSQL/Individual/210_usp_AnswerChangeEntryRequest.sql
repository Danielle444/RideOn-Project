-- ============================================================================
-- usp_answerchangeentryrequest - approve/reject a pending entry change or cancellation
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). KNOWN ISSUES documented in that audit, NOT fixed here:
--   - On approved cancellation, the billcharge UPDATEs are scoped to
--     `chargestatus = 'Open' AND paymentbatchid is null` and never filter by
--     chargeowner - both the Organizer and Federation charge for the entry
--     are touched together, but ONLY while still 'Open'. A Federation charge
--     already flipped to 'Paid' by usp_allocatefederationcredittocharge (193)
--     or usp_approvefederationmatchingsuggestion (199) is silently skipped -
--     the entry gets cancelled but that charge, and any
--     federationcreditallocation rows tied to it, are never reversed and the
--     credit's availableamount is never restored. CONFIRMED LIVE on entry 8 /
--     competition 7 (cancelled 2026-06-23): its Organizer charge (250) and
--     Federation charge (50, allocation id 3) both remain chargestatus='Paid'
--     with the allocation still active.
--   - Has its own fallback fine lookup (finereason='LateRegistration' for the
--     change case) that disagrees with fn_autoapplyfine_changeentryrequest's
--     trigger-time lookup (finereason='EntryChange') for the identical event -
--     whichever runs first silently wins.
--   - No competition/ranch parameter at all - relies entirely on the caller
--     (controller) having verified SOME competition/ranch pair, never that
--     this specific request belongs to it. NOT addressed in this slice.
--
-- 2026-08-04: first caller integration for the Federation allocation-release
-- helper (public.usp_releasefederationallocationsforcharge, 223), same slice
-- pattern already deployed on usp_answerchangeentryrequestsecured (221) - this
-- function is structurally identical to 221's pre-integration body (221 was
-- created as exactly this function plus one competition predicate), so the
-- same fix applies here unchanged in shape.
--
-- The request lookup now takes FOR UPDATE OF cer - the transaction's level-1
-- lock, since this function answers an already-existing pending
-- changeentryrequest row (unlike usp_secretarydeleteentry, which creates a
-- fresh one every call and therefore locks entry instead). A second
-- concurrent answer to the same request blocks here and, once unblocked,
-- re-reads status fresh and correctly hits the "only pending" guard below.
--
-- requestdatetime remains the authoritative business timestamp throughout,
-- unchanged - only the Rule 1/Rule 2 cancellation boundary gains explicit
-- Asia/Jerusalem normalization (previously an implicit-timezone comparison):
--   Rule 1 (before competition start) - locks every Organizer classes/Entry
--     charge for the entry (ascending billchargeid, no uniqueness constraint
--     guarantees exactly one), blocks on a Paid Organizer charge exactly as
--     before, then resolves Federation classes/Entry charges deterministically
--     (0 -> no call, 1 -> call the helper once, >1 -> raise and roll back -
--     never LIMIT 1, never a loop, never a silent pick), before the existing
--     fine/no-fine charge-cancellation logic runs.
--   Rule 2 (on/after competition start) - unchanged from the prior
--     "full charge kept" behavior: no helper call, no charge cancellation,
--     allocations and credit amounts untouched.
--
-- The existing blanket paid guard is now scoped to rejected requests and
-- non-cancellation change requests only - the approved-cancellation path gets
-- its own Rule-1 Organizer-only guard instead. Rejected and non-cancellation
-- change behavior are otherwise byte-for-byte unchanged.
--
-- The existing closing inline bill.amounttopay recalculation is unchanged and
-- not duplicated - it already recomputes from current billcharge state after
-- every change this function makes, so a Federation charge the helper just
-- released and this function then cancels is picked up automatically.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_answerchangeentryrequest(
    p_changeentryrequestid   integer,
    p_answerstatus           text,
    p_answeredbysystemuserid integer,
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

            -- Lock every Organizer classes/Entry charge for this entry (no
            -- uniqueness constraint guarantees exactly one), ascending
            -- billchargeid, matching the convention established for
            -- SP 200/145/221.
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

            elsif v_requestdatetime::date <= v_registrationenddate then
                update public.billcharge
                set
                    chargestatus = 'Cancelled',
                    cancelledat = now(),
                    notes = coalesce(notes, '') || ' | Approved entry cancellation before registration end ' || p_changeentryrequestid
                where sourcetype = 'Entry'
                  and sourceid = v_originalentryid
                  and chargestatus in ('Open', 'Paid')
                  and paymentbatchid is null;

            else
                update public.billcharge
                set notes = coalesce(notes, '') || ' | Approved entry cancellation after competition start - full charge kept ' || p_changeentryrequestid
                where sourcetype = 'Entry'
                  and sourceid = v_originalentryid
                  and chargestatus = 'Open';
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
