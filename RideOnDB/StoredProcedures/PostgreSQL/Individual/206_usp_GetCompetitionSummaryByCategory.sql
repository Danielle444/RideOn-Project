-- ============================================================================
-- usp_getcompetitionsummarybycategory - competition-wide summary grouped by owner/category
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. This proc had
-- only been recovered at signature level during the initial Stage 1 sweep; a
-- fresh pg_get_functiondef read was performed before writing this file.
-- Reproduced verbatim; no behavioral change of any kind.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Correctly scoped by hostranchid (raises if the competition does
-- not belong to p_ranchid). No issue specific to this proc was flagged beyond
-- the subsystem-wide note that Federation "paidamount" here is computed as
-- LEAST(amounttopay, coveredamount from federationcreditallocation) when the
-- charge isn't already 'Paid', or the full amount when it is - inheriting the
-- same blind spot to organizer-paid Federation charges as 193/199/200.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummarybycategory(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE("SectionKey" text, "CategoryKey" text, "CategoryName" text, "Quantity" integer, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if not exists (
        select 1
        from public.competition c
        where c.competitionid = p_competitionid
          and c.hostranchid = p_ranchid
    ) then
        raise exception 'Competition not found for this host ranch';
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

    active_charges as (
        select
            bc.billchargeid,
            bc.chargeowner,
            bc.categorykey,
            bc.sourcetype,
            bc.sourceid,
            bc.amounttopay,
            bc.chargestatus,
            coalesce(ca.coveredamount, 0)::numeric as coveredamount
        from public.billcharge bc
        left join charge_allocations ca
            on ca.billchargeid = bc.billchargeid
        where bc.competitionid = p_competitionid
          and bc.chargestatus in ('Open', 'Paid')
    ),

    calculated_charges as (
        select
            ac.billchargeid,
            ac.chargeowner,
            ac.categorykey,
            ac.sourcetype,
            ac.sourceid,
            ac.amounttopay,
            ac.chargestatus,

            case
                when ac.chargeowner = 'Federation' then
                    case
                        when ac.chargestatus = 'Paid' then ac.amounttopay
                        else least(ac.amounttopay, ac.coveredamount)
                    end

                when ac.chargestatus = 'Paid' then ac.amounttopay

                else 0
            end::numeric as paidamount,

            case
                when ac.chargeowner = 'Federation' then
                    greatest(
                        ac.amounttopay -
                        case
                            when ac.chargestatus = 'Paid' then ac.amounttopay
                            else least(ac.amounttopay, ac.coveredamount)
                        end,
                        0
                    )

                when ac.chargestatus = 'Open' then ac.amounttopay

                else 0
            end::numeric as unpaidamount
        from active_charges ac
    ),

    grouped as (
        select
            case
                when chargeowner = 'Organizer' then 'organizer'
                when chargeowner = 'Federation' then 'federation'
                else lower(chargeowner)
            end::text as sectionkey,

            case
                when chargeowner = 'Federation' and categorykey = 'classes'
                    then 'federation-classes'
                else categorykey
            end::text as categorykey,

            case
                when chargeowner = 'Organizer' and categorykey = 'classes' then 'מקצים'
                when chargeowner = 'Organizer' and categorykey = 'paid-time' then 'פייד־טיים'
                when chargeowner = 'Organizer' and categorykey = 'stalls' then 'תאים'
                when chargeowner = 'Organizer' and categorykey = 'shavings' then 'נסורת'
                when chargeowner = 'Organizer' and categorykey = 'fine' then 'קנסות'
                when chargeowner = 'Federation' and categorykey = 'classes' then 'התאחדות - מקצים'
                else categorykey
            end::text as categoryname,

            count(distinct sourceid)::integer as quantity,

            coalesce(sum(amounttopay), 0)::numeric as expectedamount,
            coalesce(sum(paidamount), 0)::numeric as paidamount,
            coalesce(sum(unpaidamount), 0)::numeric as unpaidamount

        from calculated_charges
        group by
            chargeowner,
            categorykey
    )

    select
        g.sectionkey as "SectionKey",
        g.categorykey as "CategoryKey",
        g.categoryname as "CategoryName",
        g.quantity as "Quantity",
        g.expectedamount as "ExpectedAmount",
        g.paidamount as "PaidAmount",
        g.unpaidamount as "UnpaidAmount"
    from grouped g
    order by
        case g.sectionkey
            when 'organizer' then 1
            when 'federation' then 2
            else 3
        end,
        case g.categorykey
            when 'classes' then 1
            when 'paid-time' then 2
            when 'stalls' then 3
            when 'shavings' then 4
            when 'fine' then 5
            when 'federation-classes' then 6
            else 99
        end;
end;
$function$
