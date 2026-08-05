-- 228_usp_GetCompetitionSummaryStallDetails.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. No repo file
-- existed for this proc before this audit (confirmed by exhaustive glob
-- across RideOnDB/StoredProcedures, 2026-08-05). Body captured verbatim
-- from live via pg_get_functiondef on 2026-08-05.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- p_ranchid here IS validated against competition.hostranchid (see the
-- 'Competition not found for this host ranch' guard below) -- this proc
-- already correctly treats its single ranch parameter as the host ranch.
-- But it GROUPS its results by sb.ranchid as "BookingRanchId"/
-- "BookingRanchName", which before this fix was the same (buggy) value as
-- the horse's home ranch -- i.e. this proc's own shape already assumed a
-- guest-ranch breakdown dimension distinct from the host-validated
-- p_ranchid, it just had no correct column to read it from. The grouping
-- join/column changed from sb.ranchid to sb.requestingranchid (see
-- migrations/add_stallbooking_requestingranchid.sql), which restores the
-- per-guest-ranch breakdown (including the TackCount column) this proc was
-- designed to produce. The host-ranch validation itself is unchanged.

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummarystalldetails(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE("BookingRanchId" integer, "BookingRanchName" text, "ProductId" smallint, "ProductName" text, "IsForTack" boolean, "BookingCount" integer, "HorseCount" integer, "TackCount" integer, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
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
    with booking_amounts as (
        select
            sb.stallbookingid,
            sb.requestingranchid as bookingranchid,
            r.ranchname::text as bookingranchname,
            p.productid::smallint as productid,
            p.productname::text as productname,
            sb.isfortack,
            sb.horseid,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid') then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as expectedamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid' then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as paidamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Open' then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as unpaidamount

        from public.stallbooking sb
        inner join public.productrequest pr
            on pr.prequestid = sb.stallbookingid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.product p
            on p.productid = pc.productid
        inner join public.ranch r
            on r.ranchid = sb.requestingranchid
        inner join public.billcharge bc
            on bc.sourcetype = 'ProductRequest'
           and bc.sourceid = pr.prequestid
           and bc.categorykey = 'stalls'
           and bc.chargestatus in ('Open', 'Paid')
        where pr.competitionid = p_competitionid
          and p.categoryid = 2
        group by
            sb.stallbookingid,
            sb.requestingranchid,
            r.ranchname,
            p.productid,
            p.productname,
            sb.isfortack,
            sb.horseid
    )

    select
        ba.bookingranchid::integer as "BookingRanchId",
        ba.bookingranchname::text as "BookingRanchName",
        ba.productid::smallint as "ProductId",
        ba.productname::text as "ProductName",
        ba.isfortack::boolean as "IsForTack",

        count(distinct ba.stallbookingid)::integer as "BookingCount",
        count(distinct ba.stallbookingid) filter (where ba.isfortack = false)::integer as "HorseCount",
        count(distinct ba.stallbookingid) filter (where ba.isfortack = true)::integer as "TackCount",

        coalesce(sum(ba.expectedamount), 0)::numeric as "ExpectedAmount",
        coalesce(sum(ba.paidamount), 0)::numeric as "PaidAmount",
        coalesce(sum(ba.unpaidamount), 0)::numeric as "UnpaidAmount"

    from booking_amounts ba
    group by
        ba.bookingranchid,
        ba.bookingranchname,
        ba.productid,
        ba.productname,
        ba.isfortack
    order by
        ba.bookingranchname,
        ba.productname,
        ba.isfortack;
end;
$function$
