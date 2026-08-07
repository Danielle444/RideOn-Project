-- 230_usp_GetCompetitionSummaryStallEntries.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. No repo file
-- existed for this proc before this audit (confirmed by exhaustive glob
-- across RideOnDB/StoredProcedures, 2026-08-05). Body captured verbatim
-- from live via pg_get_functiondef on 2026-08-05.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- this proc already has TWO distinct ranch parameters -- p_ranchid
-- (validated against competition.hostranchid) and p_bookingranchid (an
-- unvalidated second parameter that filters/displays by sb.ranchid) --
-- i.e. its signature already anticipated the host-ranch/guest-ranch split
-- this fix formalizes; only the buggy column it read from needed to
-- change. The p_bookingranchid filter and "BookingRanchName" display
-- source changed from sb.ranchid to sb.requestingranchid (see
-- migrations/add_stallbooking_requestingranchid.sql). Parameter names,
-- p_ranchid's host-ranch validation, and all other columns are unchanged.

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummarystallentries(p_competitionid integer, p_ranchid integer, p_bookingranchid integer, p_productid smallint, p_isfortack boolean)
 RETURNS TABLE("StallBookingId" integer, "BookingRanchName" text, "ProductName" text, "IsForTack" boolean, "HorseName" text, "BarnName" text, "StartDate" date, "EndDate" date, "PayerNames" text, "IsPaid" boolean, "ExpectedAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric)
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

    if p_productid is null or p_productid <= 0 then
        raise exception 'Invalid product id';
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
            ), 0)::numeric as unpaidamount,

            bool_or(bc.chargestatus = 'Paid')::boolean as haspaid,
            bool_or(bc.chargestatus = 'Open')::boolean as hasopen

        from public.billcharge bc
        inner join public.person payer_p
            on payer_p.personid = bc.paidbypersonid
        where bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'stalls'
          and bc.chargestatus in ('Open', 'Paid')
        group by bc.sourceid
    )

    select
        sb.stallbookingid::integer as "StallBookingId",
        r.ranchname::text as "BookingRanchName",
        p.productname::text as "ProductName",
        sb.isfortack::boolean as "IsForTack",

        h.horsename::text as "HorseName",
        h.barnname::text as "BarnName",

        sb.startdate::date as "StartDate",
        sb.enddate::date as "EndDate",

        coalesce(pd.payernames, '-')::text as "PayerNames",

        (
            coalesce(pd.expectedamount, 0) > 0
            and coalesce(pd.unpaidamount, 0) = 0
        )::boolean as "IsPaid",

        coalesce(pd.expectedamount, 0)::numeric as "ExpectedAmount",
        coalesce(pd.paidamount, 0)::numeric as "PaidAmount",
        coalesce(pd.unpaidamount, 0)::numeric as "UnpaidAmount"

    from public.stallbooking sb
    inner join public.productrequest pr
        on pr.prequestid = sb.stallbookingid
    inner join public.pricecatalog pc
        on pc.pricecatalogid = pr.pricecatalogid
    inner join public.product p
        on p.productid = pc.productid
    inner join public.ranch r
        on r.ranchid = sb.requestingranchid
    left join public.horse h
        on h.horseid = sb.horseid
    inner join public.competition c
        on c.competitionid = pr.competitionid
    inner join payer_data pd
        on pd.prequestid = pr.prequestid
    where pr.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and sb.requestingranchid = p_bookingranchid
      and p.productid = p_productid
      and sb.isfortack = p_isfortack
    order by
        sb.startdate,
        h.horsename nulls last,
        sb.stallbookingid;
end;
$function$
