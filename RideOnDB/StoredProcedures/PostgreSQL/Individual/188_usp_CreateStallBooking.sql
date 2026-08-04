-- 188_usp_CreateStallBooking.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. Body below is
-- captured verbatim from live via pg_get_functiondef on 2026-08-02 (part of
-- the feature/competition-reschedule review-gate stall-concurrency audit) --
-- not hand-reconstructed, per this project's own rule that a proc body must
-- never be guessed from behavior alone. Only ONE change was made on top of
-- the verbatim capture: the addition of the horse-scoped advisory lock
-- block below, marked "ADDED" inline.
--
-- Why: this is one of the five confirmed writers of
-- stallbooking.startdate/enddate/horseid (the others are
-- usp_createstallbookingchangerequest [new file 189],
-- 147_usp_SecretaryUpdateStallBooking.sql, 149_usp_SecretaryCreateStallBookingForPayer.sql,
-- and the new 187_usp_RescheduleCompetition.sql). All five now take
-- pg_advisory_xact_lock(1735, horseid) before their own overlap check/write,
-- closing the check-then-write race a concurrent competition reschedule
-- could otherwise hit. See 187_usp_RescheduleCompetition.sql's header for
-- the full audit (which writers are in scope, which are confirmed out of
-- scope). This procedure's own overlap predicate below (the
-- v_overlappingexists query) is also the exact predicate family ported into
-- 149_usp_SecretaryCreateStallBookingForPayer.sql, 147_usp_SecretaryUpdateStallBooking.sql
-- and usp_createstallbookingchangerequest (189); no business logic in THIS
-- file changed beyond the lock and the global-overlap scoping below.
--
-- REVIEW-GATE CORRECTION (2026-08-03, owner decision): the overlap check was
-- previously scoped to a same-competition-only `pr.competitionid = ...`
-- filter, which let the same horse hold overlapping bookings across two
-- DIFFERENT competitions -- a state usp_reschedulecompetition (187) would
-- then refuse to move, since 187's own overlap rule was always
-- cross-competition. A horse cannot physically occupy two stalls at once
-- regardless of which competition either booking belongs to, so the
-- competition-id restriction is removed here; the check is now GLOBAL by
-- horseid across all competitions. See 187's header for the full
-- cross-competition consistency note.
--
-- usp_createtackstallbookings delegates to this procedure in a loop with
-- p_horseid always NULL and p_isfortack always true, so tack bookings never
-- reach the lock (the ADDED block only runs inside the `p_isfortack = false`
-- branch, which already requires p_horseid to be non-null).
--
-- STATUS AS WRITTEN: NOT DEPLOYED. This file has not been run against live
-- Supabase (no CREATE OR REPLACE executed). The live procedure as of
-- 2026-08-02 is IDENTICAL to this file minus the ADDED block -- deploying
-- this file only adds the lock, it changes no other behavior, no parameter,
-- and no return type. Deployment requires explicit owner approval showing
-- this exact diff against the live definition.

CREATE OR REPLACE FUNCTION public.usp_createstallbooking(p_competitionid integer, p_orderedbysystemuserid integer, p_pricecatalogid integer, p_notes text, p_ranchid integer, p_horseid integer, p_startdate date, p_enddate date, p_isfortack boolean, p_payers jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_prequestid integer;
    v_stallbookingid integer;
    v_itemprice numeric(10,2);
    v_catalog_ranchid integer;
    v_payercount integer;
    v_totalamount numeric(10,2);
    v_amountperpayer numeric(10,2);
    v_billid integer;
    v_payer jsonb;
    v_payerpersonid integer;
    v_horseexists integer;
    v_horseincompetition integer;
    v_overlappingexists integer;
    v_staydays integer;
    v_competitionenddate date;
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_orderedbysystemuserid is null or p_orderedbysystemuserid <= 0 then
        raise exception 'Invalid ordered by system user id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_startdate is null or p_enddate is null then
        raise exception 'StartDate and EndDate are required';
    end if;

    if p_startdate > p_enddate then
        raise exception 'StartDate cannot be after EndDate';
    end if;

    if p_payers is null or jsonb_typeof(p_payers) <> 'array' then
        raise exception 'Payers must be a json array';
    end if;

    v_staydays := (p_enddate - p_startdate + 1);

    if v_staydays <= 0 then
        raise exception 'Invalid stay days';
    end if;

    select c.competitionenddate
    into v_competitionenddate
    from public.competition c
    where c.competitionid = p_competitionid;

    if (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate then
        raise exception 'Competition has already ended' using errcode = 'RN001';
    end if;

    if p_isfortack = false then
        if p_horseid is null then
            raise exception 'HorseId is required for horse stall booking';
        end if;

        -- ADDED (review-gate stall-concurrency fix, 2026-08-02): lock this
        -- horse before checking or creating anything for it, so a concurrent
        -- competition reschedule (or any other writer below) cannot commit a
        -- conflicting change between this check and this INSERT.
        perform pg_advisory_xact_lock(1735, p_horseid);

        select count(*)
        into v_horseexists
        from public.horse h
        where h.horseid = p_horseid
          and h.ranchid = p_ranchid;

        if v_horseexists = 0 then
            raise exception 'Horse does not belong to the specified ranch';
        end if;

        select count(*)
        into v_horseincompetition
        from public.servicerequest sr
        inner join public.entry e
            on e.entryid = sr.srequestid
        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid
        where sr.horseid = p_horseid
          and cic.competitionid = p_competitionid
          and coalesce(e.entrystatus, 'Active') in ('Active', 'CancelledAfterStart');

        if v_horseincompetition = 0 then
            raise exception 'Horse is not registered to the competition through entries';
        end if;

        select count(*)
        into v_overlappingexists
        from public.stallbooking sb
        inner join public.productrequest pr
            on pr.prequestid = sb.stallbookingid
        left join public.productchangerequest pcr
            on pcr.originalprequestid = pr.prequestid
           and pcr.status = 'Approved'
        where sb.horseid = p_horseid
          and sb.isfortack = false
          and (
                pcr.productchangerequestid is null
                or (
                    pcr.iscancelled = false
                    and pcr.newprequestid is null
                )
              )
          and daterange(sb.startdate, sb.enddate, '[]')
              && daterange(p_startdate, p_enddate, '[]');

        if v_overlappingexists > 0 then
            raise exception 'An active overlapping stall booking already exists for this horse';
        end if;
    else
        if p_horseid is not null then
            raise exception 'HorseId must be NULL for tack stall booking';
        end if;
    end if;

    select
        pc.itemprice,
        pc.ranchid
    into
        v_itemprice,
        v_catalog_ranchid
    from public.pricecatalog pc
    where pc.pricecatalogid = p_pricecatalogid
      and pc.isactive = true;

    if v_itemprice is null then
        raise exception 'PriceCatalog item not found or inactive';
    end if;

    if v_catalog_ranchid <> p_ranchid then
        raise exception 'Price catalog item does not belong to this ranch';
    end if;

    select count(*)
    into v_payercount
    from jsonb_array_elements(p_payers);

    if v_payercount = 0 then
        raise exception 'At least one payer is required';
    end if;

    v_totalamount := v_itemprice * v_staydays;
    v_amountperpayer := round(v_totalamount / v_payercount, 2);

    insert into public.productrequest
    (
        competitionid,
        orderedbysystemuserid,
        pricecatalogid,
        prequestdatetime,
        notes,
        approvaldate
    )
    values
    (
        p_competitionid,
        p_orderedbysystemuserid,
        p_pricecatalogid,
        now(),
        p_notes,
        null
    )
    returning prequestid
    into v_prequestid;

    insert into public.stallbooking
    (
        stallbookingid,
        ranchid,
        compoundid,
        stallid,
        startdate,
        enddate,
        horseid,
        isfortack
    )
    values
    (
        v_prequestid,
        p_ranchid,
        null,
        null,
        p_startdate,
        p_enddate,
        case
            when p_isfortack = true then null
            else p_horseid
        end,
        p_isfortack
    )
    returning stallbookingid
    into v_stallbookingid;

    for v_payer in
        select *
        from jsonb_array_elements(p_payers)
    loop
        v_payerpersonid := nullif(v_payer ->> 'payerPersonId', '')::integer;

        if v_payerpersonid is null then
            raise exception 'payerPersonId is required for every payer';
        end if;

        if not exists (
            select 1
            from public.person p
            where p.personid = v_payerpersonid
        ) then
            raise exception 'Payer not found';
        end if;

        v_billid := public.usp_getorcreateopenbillforpayerandcompetition(
            v_payerpersonid,
            p_competitionid
        );

        insert into public.billproductrequest
        (
            billid,
            prequestid,
            amounttopay
        )
        values
        (
            v_billid,
            v_prequestid,
            v_amountperpayer
        );

        if v_amountperpayer > 0 then
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
                v_billid,
                p_competitionid,
                v_payerpersonid,
                'Organizer',
                'stalls',
                'ProductRequest',
                v_prequestid,
                v_amountperpayer,
                'Open',
                null,
                now(),
                'Daily stall pricing: ' || v_itemprice || ' x ' || v_staydays || ' days'
            );
        end if;

        perform public.usp_recalculatebillamount(v_billid);
    end loop;

    return v_stallbookingid;
end;
$function$;
