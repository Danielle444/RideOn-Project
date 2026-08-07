-- ============================================================================
-- usp_getcompetitionsummaryclassentries - entry-level drill-down within a class
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-07.
-- First tracked definition of this function in the repository - it powers
-- the final entry-level breakdown under the HostSecretary web Competition
-- Summary's class drill-down, called from
-- CompetitionSummaryController.GetCompetitionSummaryClassEntries -> BL.
-- CompetitionSummary.GetCompetitionSummaryClassEntries -> CompetitionSummaryDAL.
-- GetCompetitionSummaryClassEntries, but had never had a committed .sql file.
-- A fresh pg_get_functiondef read was performed immediately before this file
-- was written (2026-08-07), per the repo rule that a signature-only/
-- uncommitted proc must be re-fetched, never hand-reconstructed.
--
-- MODIFIED in the same pass (HostSecretary fine-presentation slice): the live
-- version's final SELECT hardcoded `null::text as "FineName"` and
-- `0::numeric as "FineAmount"` - both columns already existed in the return
-- contract but were never wired to real data. Two new left joins resolve them
-- for real: `billcharge fine_bc` (sourcetype='Fine', categorykey='fine',
-- sourceid=EntryId, chargeowner='Organizer', chargestatus in ('Open','Paid'))
-- for the amount, and `fine fn` (via entry.fineid, the column stamped by the
-- BEFORE INSERT trigger that also drives usp_insertentry/usp_admincreateentry's
-- fine billing) for the display name. Both joins are additionally gated on
-- `p_sectionkey = 'organizer'` so the Federation drill-down for the SAME
-- entry never shows fine data - the locked rule is "never cross ChargeOwner",
-- and a fine billcharge row is hardcoded Organizer-only at every known write
-- site, so surfacing it under a Federation-scoped call would misattribute it.
-- `entry_charge`'s own base-amount aggregation (sourcetype='Entry',
-- categorykey='classes' only) and the "Amount" output column are UNCHANGED -
-- Amount still means the base Entry charge only, exactly as before. The
-- combined total (base + fine) is intentionally NOT added as a new output
-- column (no return-type change) - the frontend computes it as
-- Amount + FineAmount, the same pattern already used by the day/class
-- breakdown for EntryCount/FineCount sums. ChangeEntryRequest fines
-- (categorykey='classes', sourcetype='Fine', sourceid=ChangeEntryRequestId)
-- are untouched: fine_bc requires categorykey='fine', which CER fine rows
-- never carry (verified live 2026-08-07 - see
-- 206_usp_GetCompetitionSummaryByCategory.sql's header for the exact
-- partition proof). No output column added, removed, or retyped; return
-- signature unchanged from the live baseline.
--
-- Known pre-existing behavior, NOT changed by this modification: the
-- `inner join entry_charge ec` means an entry with organizercost=0 and no
-- 'classes' billcharge row still never appears in this proc's result at all,
-- fine or no fine - unlike 247_usp_GetCompetitionSummaryClassDetails.sql's
-- EntryCount (which the fine-join widening made newly inclusive of such
-- entries), this entry-level proc's base "Amount"/inclusion semantics were
-- deliberately left alone per the instruction not to change existing Amount
-- semantics. Flagged as a known asymmetry between 247 and 248, not fixed
-- here.
--
-- MODIFIED 2026-08-07 (HostSecretary fine-presentation slice, ChangeEntryRequest
-- coverage): the separate fine_bc/fn joins are replaced by a single
-- `resolved_fine` CTE, a UNION ALL of the two fine mechanisms already
-- normalized to the SAME shape (entryid, chargeowner, billchargeid,
-- amounttopay, chargestatus, finename) - Entry-created fines directly
-- (sourceid IS the entryid), ChangeEntryRequest fines via
-- coalesce(cer.newentryid, cer.originalentryid). Locked business rule: an
-- Entry has at most ONE payable Organizer fine - FineName/FineAmount stay
-- direct single-row values (no string_agg, no summing multiple fines). The
-- LEFT JOIN to `resolved_fine` is naturally 1:1 per entry, guaranteed by a
-- new upfront integrity guard (v_integrity_entryid/v_integrity_billchargeids)
-- scoped to this class only, which RAISEs with the exact EntryId and
-- billChargeIds if that invariant is ever violated, rather than silently
-- picking or merging one. Both `resolved_fine` and the guard stay gated to
-- Organizer (fines are hardcoded Organizer-only at every known write site)
-- and the join remains p_sectionkey='organizer'-only, so the Federation
-- drill-down for the same entry still never shows fine data. No output
-- column added; return signature unchanged.
--
-- MODIFIED 2026-08-07, follow-up (reconciliation fix): `entry_charge ec` was
-- still an INNER JOIN, so a resolved-fine-only Entry with no live base
-- charge (e.g. CER #2 - a cancelled Entry whose base 'classes' charge was
-- flipped to Cancelled) was entirely absent from this proc's output, even
-- though 247_usp_GetCompetitionSummaryClassDetails.sql already counts that
-- same fine's amount in the class/day ExpectedAmount - a Secretary could see
-- money in the class total with nothing to drill into that explained it.
-- `ec` is now a LEFT JOIN, and the WHERE clause gained
-- `(ec.entryid is not null or rf.entryid is not null)` so an entry with
-- NEITHER a base charge NOR a fine (the pre-existing organizercost=0/no-fine
-- asymmetry noted above) stays excluded exactly as before - only a
-- resolved-fine-only entry becomes newly visible. No fake base billcharge is
-- invented and no cancelled charge is resurrected: Amount stays
-- `coalesce(ec.amount, 0)` (0 when there is no live base), FineAmount/
-- FineName are unchanged, and IsPaid falls back to the fine's own paid
-- status only when there is no base row to report on instead (previously it
-- would default to `false` regardless of a Paid fine, which is wrong, not
-- merely incomplete). Entry identity/class/rider/horse still come from the
-- `entry e` chain, independent of `ec`, so they were already correct before
-- this fix and remain so. No output column added; return signature
-- unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummaryclassentries(p_competitionid integer, p_ranchid integer, p_classincompid integer, p_sectionkey text)
 RETURNS TABLE("EntryId" integer, "DrawOrder" smallint, "RiderName" text, "HorseName" text, "BarnName" text, "CoachName" text, "PayerName" text, "PrizeRecipientName" text, "FineName" text, "FineAmount" numeric, "IsPaid" boolean, "Amount" numeric)
 LANGUAGE plpgsql
AS $function$
declare
    v_integrity_entryid integer;
    v_integrity_billchargeids integer[];
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_classincompid is null or p_classincompid <= 0 then
        raise exception 'Invalid class id';
    end if;

    if p_sectionkey not in ('organizer', 'federation') then
        raise exception 'Invalid section key';
    end if;

    if not exists (
        select 1
        from public.classincompetition cic
        inner join public.competition c
            on c.competitionid = cic.competitionid
        where cic.classincompid = p_classincompid
          and cic.competitionid = p_competitionid
          and c.hostranchid = p_ranchid
    ) then
        raise exception 'Class not found for this competition and host ranch';
    end if;

    -- Data-integrity guard (locked business rule: at most one payable
    -- Organizer fine per Entry). Scoped to entries within THIS class only.
    select
        resolved.resolvedentryid,
        array_agg(resolved.billchargeid order by resolved.billchargeid)
    into
        v_integrity_entryid,
        v_integrity_billchargeids
    from (
        select
            bc.billchargeid,
            case
                when bc.categorykey = 'fine' and bc.sourcetype = 'Fine'
                    then bc.sourceid
                when bc.categorykey = 'classes' and bc.sourcetype = 'Fine'
                    then coalesce(cer.newentryid, cer.originalentryid)
            end as resolvedentryid
        from public.billcharge bc
        left join public.changeentryrequest cer
            on bc.categorykey = 'classes' and bc.sourcetype = 'Fine'
           and cer.changeentryrequestid = bc.sourceid
        where bc.competitionid = p_competitionid
          and bc.chargeowner = 'Organizer'
          and bc.sourcetype = 'Fine'
          and bc.chargestatus in ('Open', 'Paid')
    ) resolved
    inner join public.entry e_integrity
        on e_integrity.entryid = resolved.resolvedentryid
       and e_integrity.classincompid = p_classincompid
    group by resolved.resolvedentryid
    having count(*) > 1
    limit 1;

    if v_integrity_entryid is not null then
        raise exception 'Data integrity violation: % payable fines resolve to Entry % (billChargeIds: %) - refusing to compute drill-down',
            array_length(v_integrity_billchargeids, 1), v_integrity_entryid, v_integrity_billchargeids;
    end if;

    return query
    with charge_allocations as (
        select
            fca.billchargeid,
            coalesce(sum(fca.allocatedamount), 0)::numeric as coveredamount
        from public.federationcreditallocation fca
        group by
            fca.billchargeid
    ),

    entry_charge as (
        select
            bc.sourceid as entryid,

            coalesce(sum(bc.amounttopay), 0)::numeric as amount,

            case
                when p_sectionkey = 'federation' then
                    coalesce(
                        sum(
                            case
                                when bc.chargestatus = 'Paid' then bc.amounttopay
                                else least(
                                    bc.amounttopay,
                                    coalesce(ca.coveredamount, 0)
                                )
                            end
                        ),
                        0
                    ) >= coalesce(sum(bc.amounttopay), 0)
                    and coalesce(sum(bc.amounttopay), 0) > 0

                else
                    bool_or(bc.chargestatus = 'Paid')
            end::boolean as ispaid

        from public.billcharge bc

        left join charge_allocations ca
            on ca.billchargeid = bc.billchargeid

        where bc.competitionid = p_competitionid
          and bc.sourcetype = 'Entry'
          and bc.categorykey = 'classes'
          and bc.chargestatus in ('Open', 'Paid')
          and (
                (p_sectionkey = 'organizer' and bc.chargeowner = 'Organizer')
                or
                (p_sectionkey = 'federation' and bc.chargeowner = 'Federation')
          )

        group by
            bc.sourceid
    ),

    -- The Entry's one payable Organizer fine (if any), from whichever of the
    -- two mechanisms applies, normalized to one shape. At most one row per
    -- entryid is guaranteed by the integrity guard above - no aggregation
    -- needed, direct single-row values only.
    resolved_fine as (
        select
            bc.sourceid as entryid,
            bc.chargeowner,
            bc.amounttopay,
            bc.chargestatus,
            fn1.finename
        from public.billcharge bc
        inner join public.entry e1
            on e1.entryid = bc.sourceid
        left join public.fine fn1
            on fn1.fineid = e1.fineid
        where bc.sourcetype = 'Fine'
          and bc.categorykey = 'fine'
          and bc.chargestatus in ('Open', 'Paid')

        union all

        select
            coalesce(cer.newentryid, cer.originalentryid) as entryid,
            bc.chargeowner,
            bc.amounttopay,
            bc.chargestatus,
            fn2.finename
        from public.billcharge bc
        inner join public.changeentryrequest cer
            on cer.changeentryrequestid = bc.sourceid
        left join public.fine fn2
            on fn2.fineid = cer.fineid
        where bc.sourcetype = 'Fine'
          and bc.categorykey = 'classes'
          and bc.chargestatus in ('Open', 'Paid')
    )

    select
        e.entryid::integer as "EntryId",
        e.draworder::smallint as "DrawOrder",

        concat_ws(' ', rider_p.firstname, rider_p.lastname)::text as "RiderName",

        h.horsename::text as "HorseName",
        h.barnname::text as "BarnName",

        case
            when coach_p.personid is null then null
            else concat_ws(' ', coach_p.firstname, coach_p.lastname)::text
        end as "CoachName",

        concat_ws(' ', payer_p.firstname, payer_p.lastname)::text as "PayerName",

        e.prizerecipientname::text as "PrizeRecipientName",

        -- The Entry's one payable Organizer fine, whichever mechanism it
        -- came from (direct single-row value, never aggregated - see
        -- resolved_fine above). Gated on p_sectionkey='organizer' so the
        -- Federation drill-down for the same entry never shows fine data.
        rf.finename::text as "FineName",
        coalesce(rf.amounttopay, 0)::numeric as "FineAmount",

        -- Merged case (base + fine, or base alone): unchanged, reflects the
        -- base charge's own paid status exactly as before. Orphan case (no
        -- live base charge, e.g. CER #2 - a cancelled Entry whose only
        -- payable content is its fine): falls back to the fine's own status
        -- instead of defaulting to false, which would misreport a Paid fine
        -- as unpaid.
        coalesce(ec.ispaid, (rf.chargestatus = 'Paid'), false)::boolean as "IsPaid",
        coalesce(ec.amount, 0)::numeric as "Amount"

    from public.entry e

    inner join public.servicerequest sr
        on sr.srequestid = e.entryid

    inner join public.classincompetition cic
        on cic.classincompid = e.classincompid

    inner join public.horse h
        on h.horseid = sr.horseid

    inner join public.federationmember rider_fm
        on rider_fm.federationmemberid = sr.riderfederationmemberid

    inner join public.person rider_p
        on rider_p.personid = rider_fm.federationmemberid

    left join public.federationmember coach_fm
        on coach_fm.federationmemberid = sr.coachfederationmemberid

    left join public.person coach_p
        on coach_p.personid = coach_fm.federationmemberid

    inner join public.bill b
        on b.billid = sr.billid

    inner join public.person payer_p
        on payer_p.personid = b.paidbypersonid

    left join entry_charge ec
        on ec.entryid = e.entryid

    left join resolved_fine rf
        on p_sectionkey = 'organizer'
       and rf.entryid = e.entryid
       and rf.chargeowner = 'Organizer'

    where cic.competitionid = p_competitionid
      and e.classincompid = p_classincompid
      -- entry_charge is now a LEFT JOIN so a resolved-fine-only entry (no
      -- live base charge) can still surface - but an entry with NEITHER a
      -- base charge NOR a fine has no payable content at all and must stay
      -- excluded, exactly as before (the known organizercost=0/no-fine
      -- asymmetry documented above is unaffected).
      and (ec.entryid is not null or rf.entryid is not null)

    order by
        e.draworder nulls last,
        sr.srequestdatetime,
        e.entryid;
end;
$function$
