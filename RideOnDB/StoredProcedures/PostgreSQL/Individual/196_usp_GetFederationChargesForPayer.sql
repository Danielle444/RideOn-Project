-- ============================================================================
-- usp_getfederationchargesforpayer - list a payer's federation charges with coverage
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Correctly scoped by both p_competitionid and p_paidbypersonid.
-- No issue specific to this proc was flagged beyond the subsystem-wide note
-- that "coveredamount" is computed purely from federationcreditallocation
-- (see 193/199 for the double-payment finding).
-- ============================================================================
-- 2026-08-05: a billcharge with paymentbatchid is not null is now treated as
-- already covered - missingamount is forced to 0 and coveragestatus to
-- 'מכוסה', regardless of its own amounttopay/allocation math. Mirrors the
-- guards already deployed in usp_allocatefederationcredittocharge (193),
-- usp_getfederationmatchingsuggestions (198), and
-- usp_approvefederationmatchingsuggestion (199): a genuine payment batch
-- means the charge is already covered by real money, never by Federation
-- credit. chargeamount and coveredamount are deliberately left unchanged.
-- Read-only proc; no mutation path exists here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getfederationchargesforpayer(p_competitionid integer, p_paidbypersonid integer)
 RETURNS TABLE(billchargeid integer, billid integer, competitionid integer, paidbypersonid integer, payerfullname text, entryid integer, classincompid integer, classname text, classdatetime timestamp with time zone, riderfederationmemberid integer, riderfullname text, horseid integer, horsename text, chargeamount numeric, coveredamount numeric, missingamount numeric, chargestatus character varying, coveragestatus text)
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
    with charge_allocations as (
        select
            fca.billchargeid,
            coalesce(sum(fca.allocatedamount), 0) as coveredamount
        from public.federationcreditallocation fca
        group by fca.billchargeid
    )
    select
        bc.billchargeid,
        bc.billid,
        bc.competitionid,
        bc.paidbypersonid,
        concat_ws(' ', payer.firstname, payer.lastname)::text as payerfullname,

        e.entryid,
        e.classincompid,
        ct.classname::text as classname,
        cic.classdatetime,

        sr.riderfederationmemberid,
        concat_ws(' ', rider.firstname, rider.lastname)::text as riderfullname,

        sr.horseid,
        h.horsename::text as horsename,

        bc.amounttopay as chargeamount,
        coalesce(ca.coveredamount, 0) as coveredamount,
        case
            when bc.paymentbatchid is not null then 0
            else bc.amounttopay - coalesce(ca.coveredamount, 0)
        end as missingamount,
        bc.chargestatus,
        case
            when bc.paymentbatchid is not null then 'מכוסה'
            when coalesce(ca.coveredamount, 0) >= bc.amounttopay then 'מכוסה'
            when coalesce(ca.coveredamount, 0) > 0 then 'כיסוי חלקי'
            else 'חסר'
        end as coveragestatus
    from public.billcharge bc
    left join charge_allocations ca
        on ca.billchargeid = bc.billchargeid
    left join public.person payer
        on payer.personid = bc.paidbypersonid
    left join public.entry e
        on e.entryid = bc.sourceid
       and bc.sourcetype = 'Entry'
    left join public.servicerequest sr
        on sr.srequestid = e.entryid
    left join public.person rider
        on rider.personid = sr.riderfederationmemberid
    left join public.horse h
        on h.horseid = sr.horseid
    left join public.classincompetition cic
        on cic.classincompid = e.classincompid
    left join public.classtype ct
        on ct.classtypeid = cic.classtypeid
    where bc.competitionid = p_competitionid
      and bc.paidbypersonid = p_paidbypersonid
      and bc.chargeowner = 'Federation'
      and bc.categorykey = 'classes'
      and bc.sourcetype = 'Entry'
      and bc.chargestatus not in ('Cancelled', 'Replaced', 'Rejected', 'PendingApproval')
    order by
        cic.classdatetime nulls last,
        ct.classname,
        h.horsename,
        bc.billchargeid;
end;
$function$
