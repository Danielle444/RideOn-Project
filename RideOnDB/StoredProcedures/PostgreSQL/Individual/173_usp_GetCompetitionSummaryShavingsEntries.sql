CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummaryshavingsentries(p_competitionid integer, p_ranchid integer, p_bookingranchid integer)
 RETURNS TABLE("ShavingsOrderId" integer, "BookingRanchName" text, "StallCount" integer, "BagQuantity" integer, "RequestedDeliveryTime" timestamp without time zone, "DeliveryStatus" text, "HorseNames" text, "PayerNames" text, "IsPaid" boolean, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_bookingranchid is null or p_bookingranchid <= 0 then
        raise exception 'Invalid booking ranch id';
    end if;

    return query
    with payer_data as (
        select
            bc.sourceid as prequestid,

            string_agg(
                distinct concat_ws(' ', payer_p.firstname, payer_p.lastname),
                ', '
            )::text as payernames,

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
        inner join public.person payer_p
            on payer_p.personid = bc.paidbypersonid
        where bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'shavings'
          and bc.chargestatus in ('Open', 'Paid')
        group by bc.sourceid
    )

    select
        so.shavingsorderid::integer as "ShavingsOrderId",
        r.ranchname::text as "BookingRanchName",

        count(sofsb.stallbookingid)::integer as "StallCount",
        coalesce(sum(sofsb.bagquantityperstall), 0)::integer as "BagQuantity",

        so.requesteddeliverytime as "RequestedDeliveryTime",
        so.deliverystatus::text as "DeliveryStatus",

        string_agg(
            distinct coalesce(h.horsename, 'תא ציוד'),
            ', '
        )::text as "HorseNames",

        coalesce(pd.payernames, '-')::text as "PayerNames",

        (
            coalesce(pd.expectedamount, 0) > 0
            and coalesce(pd.unpaidamount, 0) = 0
        )::boolean as "IsPaid",

        coalesce(pd.expectedamount, 0)::numeric as "ExpectedAmount",
        coalesce(pd.paidamount, 0)::numeric as "PaidAmount",
        coalesce(pd.unpaidamount, 0)::numeric as "UnpaidAmount"

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
        on r.ranchid = sb.ranchid
    left join public.horse h
        on h.horseid = sb.horseid
    inner join payer_data pd
        on pd.prequestid = pr.prequestid
    inner join public.competition c
        on c.competitionid = pr.competitionid
    where pr.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and p.categoryid = 3
      and sb.ranchid = p_bookingranchid
    group by
        so.shavingsorderid,
        r.ranchname,
        so.requesteddeliverytime,
        so.deliverystatus,
        pd.payernames,
        pd.expectedamount,
        pd.paidamount,
        pd.unpaidamount
    order by
        so.requesteddeliverytime nulls last,
        so.shavingsorderid;
end;
$function$;
