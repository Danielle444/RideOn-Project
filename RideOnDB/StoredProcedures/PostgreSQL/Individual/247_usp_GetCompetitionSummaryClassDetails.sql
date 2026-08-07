-- ============================================================================
-- usp_getcompetitionsummaryclassdetails - per-class day/class summary rollup
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-07.
-- First tracked definition of this function in the repository - it powers
-- the HostSecretary web Competition Summary category modal / day breakdown /
-- class breakdown (one shared fetch, client-grouped by day and filtered by
-- class), called from CompetitionSummaryController.GetCompetitionSummaryClassDetails
-- -> BL.CompetitionSummary.GetCompetitionSummaryClassDetails ->
-- CompetitionSummaryDAL.GetCompetitionSummaryClassDetails, but had never had a
-- committed .sql file. A fresh pg_get_functiondef read was performed
-- immediately before this file was written (2026-08-07), per the repo rule
-- that a signature-only/uncommitted proc must be re-fetched, never
-- hand-reconstructed.
--
-- MODIFIED in the same pass (HostSecretary fine-presentation slice): the live
-- version's `entry_charges` CTE joined billcharge on
-- `sourcetype='Entry' and categorykey='classes'` only, and the final SELECT
-- hardcoded `0::integer as "FineCount"` - Entry-created late-entry fines
-- (categorykey='fine', sourcetype='Fine', sourceid=EntryId, chargeowner=
-- 'Organizer' always) were entirely excluded from ExpectedAmount/PaidAmount/
-- UnpaidAmount, and FineCount was never real. The billcharge join now also
-- matches `sourcetype='Fine' and categorykey='fine'` for the same entryid, so
-- fine amounts blend into the existing amount sums (base + fine = one Entry
-- cost, per the locked business rule) and FineCount is computed from a real
-- `bool_or(bc.categorykey='fine')` per entry instead of a literal 0. Because
-- entry_charges already groups per-entry (one output row per entryid
-- regardless of how many billcharge rows joined), EntryCount - computed as
-- `count(distinct ec.entryid)` in the outer SELECT - is completely unaffected
-- by the join widening: a fine never adds an extra counted entry. The
-- chargeowner filter (Organizer-only for the organizer section, Federation-
-- only for the federation section) is unchanged, and fine billcharge rows are
-- hardcoded Organizer-only at every known write site (usp_insertentry,
-- usp_admincreateentry), so the added join branch is a structural no-op for
-- p_sectionkey='federation' - Federation behavior is provably unchanged.
-- ChangeEntryRequest fines (categorykey='classes', sourcetype='Fine',
-- sourceid=ChangeEntryRequestId) are untouched: the added join branch
-- requires categorykey='fine', which CER fine rows never carry (verified
-- live 2026-08-07 - see 206_usp_GetCompetitionSummaryByCategory.sql's header
-- for the exact partition proof). No output column added, removed, or
-- retyped; return signature unchanged from the live baseline.
--
-- Known pre-existing behavior, NOT changed by this modification: an entry
-- whose class has organizercost=0 (free entry) and no fine still produces no
-- billcharge row at all and is invisible to this proc's EntryCount, exactly
-- as before. An entry with organizercost=0 but a nonzero late fine now
-- becomes newly visible (via the fine-only billcharge row) - a side effect of
-- the wider join, not separately implemented, and consistent with counting
-- it as a real entry.
--
-- Also NOT changed: PaidCount/UnpaidCount's `ispaid` boolean is still
-- `bool_or(bc.chargestatus = 'Paid')` for the organizer section (and the
-- equivalent federation-coverage formula) evaluated across ALL matched
-- billcharge rows per entry. Once an entry can now match two rows (classes +
-- fine), an entry with e.g. its base charge Paid but its fine still Open
-- would count as "paid" under this OR-style aggregate, and vice versa. This
-- narrower semantic question (should "paid" require both parts paid) was not
-- in scope for this slice - flagged as a follow-up, not decided here.
--
-- MODIFIED 2026-08-07 (HostSecretary fine-presentation slice, ChangeEntryRequest
-- coverage): the direct billcharge join is replaced by a new
-- `entry_relevant_charges` CTE that resolves EVERY entry-attributable
-- billcharge row (base Entry charge, Entry-created fine, and now
-- ChangeEntryRequest fine via coalesce(cer.newentryid, cer.originalentryid))
-- into one shape carrying a `resolvedentryid`, then joins on that instead of
-- raw sourceid equality - a CER fine's sourceid is a ChangeEntryRequestId,
-- never an entryid, so it could never satisfy the old direct join. Locked
-- business rule: an Entry has at most ONE payable Organizer fine - never
-- aggregated. FineCount stays boolean/single-fine semantics
-- (`bool_or(bc.sourcetype = 'Fine')`, true whichever of the two fine
-- mechanisms applies, never a count of multiple). A new upfront integrity
-- guard (v_integrity_entryid/v_integrity_billchargeids), scoped to this
-- competition only, RAISEs with the exact EntryId and billChargeIds if more
-- than one payable Organizer fine ever resolves to the same Entry, rather
-- than silently including both in the sum. No output column added; return
-- signature unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummaryclassdetails(p_competitionid integer, p_ranchid integer, p_sectionkey text)
 RETURNS TABLE("ClassInCompId" integer, "ClassDate" date, "StartTime" time without time zone, "OrderInDay" smallint, "ClassName" text, "EntryCount" integer, "PaidCount" integer, "UnpaidCount" integer, "FineCount" integer, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
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

    if p_sectionkey not in ('organizer', 'federation') then
        raise exception 'Invalid section key';
    end if;

    if not exists (
        select 1
        from public.competition c
        where c.competitionid = p_competitionid
          and c.hostranchid = p_ranchid
    ) then
        raise exception 'Competition not found for this host ranch';
    end if;

    -- Data-integrity guard (locked business rule: at most one payable
    -- Organizer fine per Entry). Scoped to this competition only - a bad
    -- row elsewhere never breaks an unrelated competition's summary.
    select
        resolved.resolvedentryid,
        array_agg(resolved.billchargeid order by resolved.billchargeid)
    into
        v_integrity_entryid,
        v_integrity_billchargeids
    from (
        select
            bc.billchargeid,
            bc.chargeowner,
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
          and bc.sourcetype = 'Fine'
          and bc.chargestatus in ('Open', 'Paid')
    ) resolved
    where resolved.resolvedentryid is not null
    group by resolved.resolvedentryid, resolved.chargeowner
    having count(*) > 1
    limit 1;

    if v_integrity_entryid is not null then
        raise exception 'Data integrity violation: % payable fines resolve to Entry % (billChargeIds: %) - refusing to compute summary',
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

    -- Every entry-attributable billcharge row (base Entry charge,
    -- Entry-created fine, ChangeEntryRequest fine), normalized to a single
    -- resolvedentryid so the join below no longer depends on sourceid
    -- meaning "the entryid" - true for the first two, never true for a CER
    -- fine (sourceid is a ChangeEntryRequestId there).
    entry_relevant_charges as (
        select
            bc.billchargeid,
            bc.chargeowner,
            bc.amounttopay,
            bc.chargestatus,
            bc.sourcetype,
            case
                when bc.categorykey = 'classes' and bc.sourcetype = 'Entry'
                    then bc.sourceid
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
          and bc.chargestatus in ('Open', 'Paid')
          and (
                (bc.categorykey = 'classes' and bc.sourcetype = 'Entry')
             or (bc.categorykey = 'fine' and bc.sourcetype = 'Fine')
             or (bc.categorykey = 'classes' and bc.sourcetype = 'Fine')
          )
    ),

    entry_charges as (
        select
            e.entryid,
            cic.classincompid,
            cic.classdatetime::date as classdate,
            cic.starttime,
            cic.orderinday,
            ct.classname::text as classname,

            coalesce(sum(bc.amounttopay), 0)::numeric as expectedamount,

            coalesce(
                sum(
                    case
                        when p_sectionkey = 'federation' then
                            case
                                when bc.chargestatus = 'Paid' then bc.amounttopay
                                else least(
                                    bc.amounttopay,
                                    coalesce(ca.coveredamount, 0)
                                )
                            end

                        when p_sectionkey = 'organizer'
                         and bc.chargestatus = 'Paid'
                            then bc.amounttopay

                        else 0
                    end
                ),
                0
            )::numeric as paidamount,

            coalesce(
                sum(
                    case
                        when p_sectionkey = 'federation' then
                            greatest(
                                bc.amounttopay -
                                case
                                    when bc.chargestatus = 'Paid' then bc.amounttopay
                                    else least(
                                        bc.amounttopay,
                                        coalesce(ca.coveredamount, 0)
                                    )
                                end,
                                0
                            )

                        when p_sectionkey = 'organizer'
                         and bc.chargestatus = 'Open'
                            then bc.amounttopay

                        else 0
                    end
                ),
                0
            )::numeric as unpaidamount,

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
                    )
                    >= coalesce(sum(bc.amounttopay), 0)
                    and coalesce(sum(bc.amounttopay), 0) > 0

                else
                    bool_or(bc.chargestatus = 'Paid')
            end::boolean as ispaid,

            -- Fine presence for this entry (Organizer-only by construction -
            -- see the join condition below), true whichever of the two fine
            -- mechanisms (Entry-created or ChangeEntryRequest, resolved)
            -- applies. Powers a real FineCount - boolean/single-fine
            -- semantics, never a count of multiple; the integrity guard
            -- above already refuses to reach this query if that invariant
            -- were ever violated.
            bool_or(bc.sourcetype = 'Fine') as hasfine

        from public.entry e

        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid

        inner join public.classtype ct
            on ct.classtypeid = cic.classtypeid

        inner join entry_relevant_charges bc
            on bc.resolvedentryid = e.entryid
           and (
                (p_sectionkey = 'organizer' and bc.chargeowner = 'Organizer')
                or
                (p_sectionkey = 'federation' and bc.chargeowner = 'Federation')
           )

        left join charge_allocations ca
            on ca.billchargeid = bc.billchargeid

        where cic.competitionid = p_competitionid

        group by
            e.entryid,
            cic.classincompid,
            cic.classdatetime,
            cic.starttime,
            cic.orderinday,
            ct.classname
    )

    select
        ec.classincompid::integer as "ClassInCompId",
        ec.classdate::date as "ClassDate",
        ec.starttime as "StartTime",
        ec.orderinday::smallint as "OrderInDay",
        ec.classname::text as "ClassName",

        count(distinct ec.entryid)::integer as "EntryCount",

        count(distinct ec.entryid)
            filter (where ec.ispaid = true)::integer as "PaidCount",

        count(distinct ec.entryid)
            filter (where ec.ispaid = false)::integer as "UnpaidCount",

        count(distinct ec.entryid)
            filter (where ec.hasfine)::integer as "FineCount",

        coalesce(sum(ec.expectedamount), 0)::numeric as "ExpectedAmount",
        coalesce(sum(ec.paidamount), 0)::numeric as "PaidAmount",
        coalesce(sum(ec.unpaidamount), 0)::numeric as "UnpaidAmount"

    from entry_charges ec

    group by
        ec.classincompid,
        ec.classdate,
        ec.starttime,
        ec.orderinday,
        ec.classname

    order by
        ec.classdate,
        ec.orderinday nulls last,
        ec.starttime nulls last,
        ec.classname;
end;
$function$
