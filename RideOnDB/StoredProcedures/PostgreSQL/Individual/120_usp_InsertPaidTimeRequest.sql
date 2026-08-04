-- 120_usp_InsertPaidTimeRequest.sql
--
-- REPOSITORY RECOVERY (2026-08-04): this file was stale relative to the live
-- production definition of public.usp_insertpaidtimerequest. The body below
-- is captured verbatim from live via pg_get_functiondef -- not hand-edited --
-- per this project's rule that a proc body must never be reconstructed from
-- behavior alone.
--
-- What changed versus the previous repository copy (informational only --
-- live was already running this exact logic, so no production behavior is
-- altered by this recovery):
--   - parameter order/types now match live exactly (live order is
--     p_pricecatalogid, p_requestedcompslotid, p_orderedbysystemuserid,
--     p_ranchid, p_horseid, p_riderfederationmemberid,
--     p_coachfederationmemberid, p_paidbypersonid, p_notes; p_notes is
--     CHARACTER VARYING, not TEXT, and has no DEFAULT)
--   - added horse-ranch validation (v_horse_ranchid <> p_ranchid)
--   - coach validation is optional (only enforced when
--     p_coachfederationmemberid IS NOT NULL); the previous repository copy
--     required a coach unconditionally
--   - financial write is the Phase 8 billcharge-based path: inserts a
--     billcharge row (categorykey='paid-time', chargeowner='Organizer',
--     sourcetype='PaidTimeRequest') and calls usp_recalculatebillamount,
--     instead of the previous repository copy's legacy direct
--     `UPDATE bill SET amounttopay = amounttopay + v_amounttopay`
--
-- Confirmed compatible with all current callers: both
-- PaidTimeRequestDAL.CreatePaidTimeRequest (C#) and
-- usp_bulkinsertpaidtimerequests (SQL) invoke this function using fully
-- named arguments for every parameter, so the corrected parameter order
-- does not affect either caller.
--
-- STATUS: the recovery above was a repository-text-only sync (no behavior
-- change; live already ran that exact body).
--
-- COMPETITION-ENDED GUARD (2026-08-04): a new, additive-only guard has since
-- been added on top of the recovered body -- one new declaration
-- (v_competitionenddate) and one new lookup+check, placed immediately after
-- the existing requested-slot-not-found validation and before every other
-- validation/insert/billing statement. It blocks creation of a new Paid Time
-- request once (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date is
-- past the competition's end date (the final competition day itself remains
-- allowed), raising SQLSTATE RN001 with the message
-- 'Competition has already ended'. This also blocks
-- public.usp_bulkinsertpaidtimerequests for free, since it calls this
-- function once per item inside a single transaction. No other statement in
-- this file was changed.

CREATE OR REPLACE FUNCTION public.usp_insertpaidtimerequest(p_pricecatalogid integer, p_requestedcompslotid integer, p_orderedbysystemuserid integer, p_ranchid integer, p_horseid integer, p_riderfederationmemberid integer, p_coachfederationmemberid integer, p_paidbypersonid integer, p_notes character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_billid integer;
    v_srequestid integer;
    v_paidtimerequestid integer;
    v_amounttopay numeric(10,2);
    v_catalog_ranchid integer;
    v_horse_ranchid integer;
    v_competitionid integer;
    v_competitionenddate date;
begin
    select
        pc.itemprice,
        pc.ranchid
    into
        v_amounttopay,
        v_catalog_ranchid
    from public.pricecatalog pc
    where pc.pricecatalogid = p_pricecatalogid
      and pc.isactive = true;

    if v_amounttopay is null then
        raise exception 'Price catalog item not found or inactive';
    end if;

    if v_catalog_ranchid <> p_ranchid then
        raise exception 'Price catalog item does not belong to this ranch';
    end if;

    select pts.competitionid
    into v_competitionid
    from public.paidtimeslotincompetition pts
    where pts.paidtimeslotincompid = p_requestedcompslotid;

    if v_competitionid is null then
        raise exception 'Requested paid time slot not found';
    end if;

    select c.competitionenddate
    into v_competitionenddate
    from public.competition c
    where c.competitionid = v_competitionid;

    if (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate then
        raise exception 'Competition has already ended' using errcode = 'RN001';
    end if;

    select h.ranchid
    into v_horse_ranchid
    from public.horse h
    where h.horseid = p_horseid;

    if v_horse_ranchid is null then
        raise exception 'Horse not found';
    end if;

    if v_horse_ranchid <> p_ranchid then
        raise exception 'Horse does not belong to your ranch';
    end if;

    if not exists (
        select 1
        from public.servicerequest sr
        inner join public.entry e
            on e.entryid = sr.srequestid
        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid
        where sr.horseid = p_horseid
          and cic.competitionid = v_competitionid
    ) then
        raise exception 'Horse is not registered to the competition through entries';
    end if;

    if not exists (
        select 1
        from public.federationmember fm
        where fm.federationmemberid = p_riderfederationmemberid
    ) then
        raise exception 'Rider not found';
    end if;

    if p_coachfederationmemberid is not null
       and not exists (
            select 1
            from public.federationmember fm
            where fm.federationmemberid = p_coachfederationmemberid
       ) then
        raise exception 'Coach not found';
    end if;

    if not exists (
        select 1
        from public.person p
        where p.personid = p_paidbypersonid
    ) then
        raise exception 'Payer not found';
    end if;

    v_billid := public.usp_getorcreateopenbillforpayerandcompetition(
        p_paidbypersonid,
        v_competitionid
    );

    insert into public.servicerequest
    (
        orderedbysystemuserid,
        horseid,
        riderfederationmemberid,
        coachfederationmemberid,
        billid,
        srequestdatetime
    )
    values
    (
        p_orderedbysystemuserid,
        p_horseid,
        p_riderfederationmemberid,
        p_coachfederationmemberid,
        v_billid,
        now()
    )
    returning srequestid
    into v_srequestid;

    insert into public.paidtimerequest
    (
        paidtimerequestid,
        pricecatalogid,
        requestedcompslotid,
        assignedcompslotid,
        assignedstarttime,
        status,
        notes
    )
    values
    (
        v_srequestid,
        p_pricecatalogid,
        p_requestedcompslotid,
        null,
        null,
        'Pending',
        p_notes
    )
    returning paidtimerequestid
    into v_paidtimerequestid;

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
        createdat
    )
    values
    (
        v_billid,
        v_competitionid,
        p_paidbypersonid,
        'Organizer',
        'paid-time',
        'PaidTimeRequest',
        v_paidtimerequestid,
        v_amounttopay,
        'Open',
        null,
        now()
    );

    perform public.usp_recalculatebillamount(v_billid);

    return v_paidtimerequestid;
end;
$function$;
