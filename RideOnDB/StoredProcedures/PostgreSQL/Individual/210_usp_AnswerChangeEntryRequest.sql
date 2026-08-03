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
--     this specific request belongs to it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_answerchangeentryrequest(p_changeentryrequestid integer, p_answerstatus text, p_answeredbysystemuserid integer, p_notes text DEFAULT NULL::text)
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
    where cer.changeentryrequestid = p_changeentryrequestid;

    if v_originalentryid is null then
        raise exception 'Change entry request not found';
    end if;

    if lower(v_currentstatus) <> 'pending' then
        raise exception 'Only pending change entry requests can be answered';
    end if;

    if exists (
        select 1
        from public.billcharge bc
        where bc.sourcetype = 'Entry'
          and bc.sourceid = v_originalentryid
          and bc.chargestatus = 'Paid'
    ) then
        raise exception 'Cannot answer change request for a paid entry';
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

        update public.entry
        set
            entrystatus =
                case
                    when v_requestdatetime::date >= v_competitionstartdate
                        then 'CancelledAfterStart'
                    else 'Cancelled'
                end,
            cancelledat = now(),
            cancelledbychangerequestid = p_changeentryrequestid,
            draworder = null
        where entryid = v_originalentryid;

        if v_effectivefineamount is not null and v_effectivefineamount > 0 then
            update public.billcharge
            set
                chargestatus = 'Cancelled',
                cancelledat = now(),
                notes = coalesce(notes, '') || ' | Approved entry cancellation request ' || p_changeentryrequestid
            where sourcetype = 'Entry'
              and sourceid = v_originalentryid
              and chargestatus = 'Open'
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
              and chargestatus = 'Open'
              and paymentbatchid is null;

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
