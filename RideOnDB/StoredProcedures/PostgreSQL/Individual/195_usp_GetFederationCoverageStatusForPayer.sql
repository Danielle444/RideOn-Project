-- ============================================================================
-- usp_getfederationcoveragestatusforpayer - aggregate federation coverage for one payer
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Correctly scoped by both p_competitionid and p_paidbypersonid.
-- No issue specific to this proc was flagged in that audit beyond the
-- subsystem-wide note that "coveredamount" here is computed purely from
-- federationcreditallocation and does not account for charges also paid via
-- an organizer paymentbatch (see 193/199 for the double-payment finding).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getfederationcoveragestatusforpayer(p_competitionid integer, p_paidbypersonid integer)
 RETURNS TABLE(competitionid integer, paidbypersonid integer, payerfullname text, totalfederationamount numeric, coveredfederationamount numeric, missingfederationamount numeric, totalchargescount integer, fullycoveredchargescount integer, partiallycoveredchargescount integer, uncoveredchargescount integer, coveragestatus text)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null then
        raise exception 'Competition id is required';
    end if;

    if p_paidbypersonid is null then
        raise exception 'Paid by person id is required';
    end if;

    return query
    with federation_charges as (
        select
            bc.billchargeid,
            bc.competitionid,
            bc.paidbypersonid,
            bc.amounttopay,
            bc.chargestatus,
            coalesce(sum(fca.allocatedamount), 0) as coveredamount
        from public.billcharge bc
        left join public.federationcreditallocation fca
            on fca.billchargeid = bc.billchargeid
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_paidbypersonid
          and bc.chargeowner = 'Federation'
          and bc.categorykey = 'classes'
          and bc.sourcetype = 'Entry'
          and bc.chargestatus not in ('Cancelled', 'Replaced', 'Rejected', 'PendingApproval')
        group by
            bc.billchargeid,
            bc.competitionid,
            bc.paidbypersonid,
            bc.amounttopay,
            bc.chargestatus
    ),
    summary as (
        select
            fc.competitionid,
            fc.paidbypersonid,
            coalesce(sum(fc.amounttopay), 0) as totalfederationamount,
            coalesce(sum(fc.coveredamount), 0) as coveredfederationamount,
            coalesce(sum(fc.amounttopay - fc.coveredamount), 0) as missingfederationamount,
            count(*)::integer as totalchargescount,
            count(*) filter (where fc.coveredamount >= fc.amounttopay)::integer as fullycoveredchargescount,
            count(*) filter (where fc.coveredamount > 0 and fc.coveredamount < fc.amounttopay)::integer as partiallycoveredchargescount,
            count(*) filter (where fc.coveredamount = 0)::integer as uncoveredchargescount
        from federation_charges fc
        group by fc.competitionid, fc.paidbypersonid
    )
    select
        p_competitionid as competitionid,
        p_paidbypersonid as paidbypersonid,
        concat_ws(' ', p.firstname, p.lastname)::text as payerfullname,

        coalesce(s.totalfederationamount, 0) as totalfederationamount,
        coalesce(s.coveredfederationamount, 0) as coveredfederationamount,
        coalesce(s.missingfederationamount, 0) as missingfederationamount,

        coalesce(s.totalchargescount, 0)::integer as totalchargescount,
        coalesce(s.fullycoveredchargescount, 0)::integer as fullycoveredchargescount,
        coalesce(s.partiallycoveredchargescount, 0)::integer as partiallycoveredchargescount,
        coalesce(s.uncoveredchargescount, 0)::integer as uncoveredchargescount,

        case
            when coalesce(s.totalchargescount, 0) = 0 then 'אין חיובי התאחדות'
            when coalesce(s.missingfederationamount, 0) = 0 then 'מכוסה במלואו'
            when coalesce(s.coveredfederationamount, 0) > 0 then 'כיסוי חלקי'
            else 'חסר כיסוי'
        end as coveragestatus
    from public.person p
    left join summary s
        on s.paidbypersonid = p.personid
    where p.personid = p_paidbypersonid;
end;
$function$
