-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- p_ranchid IS validated against competition.hostranchid below -- this
-- proc already correctly treats its ranch parameter as host ranch. But it
-- GROUPS by sb.ranchid as "BookingRanchId"/"BookingRanchName", which
-- before this fix was the same (buggy) value as the host ranch itself,
-- collapsing any guest-ranch breakdown to one row. Grouping source changed
-- from sb.ranchid to sb.requestingranchid (see
-- migrations/add_stallbooking_requestingranchid.sql), restoring the
-- per-guest-ranch shavings breakdown this proc's own shape assumes. The
-- host-ranch validation itself is unchanged.

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummaryshavingsdetails(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE("BookingRanchId" integer, "BookingRanchName" text, "OrderCount" integer, "StallCount" integer, "BagQuantity" integer, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
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
    with order_amounts as (
        select
            bc.sourceid as prequestid,

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

        from public.billcharge bc
        where bc.competitionid = p_competitionid
          and bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'shavings'
          and bc.chargestatus in ('Open', 'Paid')
        group by bc.sourceid
    ),

    order_ranch_data as (
        select
            so.shavingsorderid,
            sb.requestingranchid as bookingranchid,
            r.ranchname::text as bookingranchname,
            count(sofsb.stallbookingid)::integer as stallcount,
            coalesce(sum(sofsb.bagquantityperstall), 0)::integer as bagquantity,
            max(oa.expectedamount)::numeric as expectedamount,
            max(oa.paidamount)::numeric as paidamount,
            max(oa.unpaidamount)::numeric as unpaidamount
        from public.shavingsorder so
        inner join public.productrequest pr
            on pr.prequestid = so.shavingsorderid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.product p
            on p.productid = pc.productid
        inner join public.shavingsorderforstallbooking sofsb
            on sofsb.shavingsorderid = so.shavingsorderid
        inner join public.stallbooking sb
            on sb.stallbookingid = sofsb.stallbookingid
        inner join public.ranch r
            on r.ranchid = sb.requestingranchid
        inner join order_amounts oa
            on oa.prequestid = pr.prequestid
        where pr.competitionid = p_competitionid
          and p.categoryid = 3
        group by
            so.shavingsorderid,
            sb.requestingranchid,
            r.ranchname
    )

    select
        ord.bookingranchid::integer as "BookingRanchId",
        ord.bookingranchname::text as "BookingRanchName",
        count(distinct ord.shavingsorderid)::integer as "OrderCount",
        coalesce(sum(ord.stallcount), 0)::integer as "StallCount",
        coalesce(sum(ord.bagquantity), 0)::integer as "BagQuantity",
        coalesce(sum(ord.expectedamount), 0)::numeric as "ExpectedAmount",
        coalesce(sum(ord.paidamount), 0)::numeric as "PaidAmount",
        coalesce(sum(ord.unpaidamount), 0)::numeric as "UnpaidAmount"
    from order_ranch_data ord
    group by
        ord.bookingranchid,
        ord.bookingranchname
    order by
        ord.bookingranchname;
end;
$function$;
