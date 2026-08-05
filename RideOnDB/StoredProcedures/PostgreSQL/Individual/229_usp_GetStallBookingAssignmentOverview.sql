-- 229_usp_GetStallBookingAssignmentOverview.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. No repo file
-- existed for this proc before this audit (confirmed by exhaustive glob
-- across RideOnDB/StoredProcedures, 2026-08-05). Body captured verbatim
-- from live via pg_get_functiondef on 2026-08-05.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- this proc's p_hostranchid parameter is not referenced anywhere in its
-- WHERE clause (a pre-existing, unchanged characteristic -- it returns a
-- competition-wide result set regardless of that argument's value; left
-- as-is, not in scope for this fix). What IS in scope: "BookingRanchId"/
-- "BookingRanchName" were previously sourced from sb.ranchid, which before
-- this fix held the (buggy) horse-home-ranch value -- this is the
-- secretary's physical stall-map screen, where "which guest ranch does
-- this booking belong to" is exactly the label a host secretary handling
-- many guest ranches' horses needs at a glance. Source changed to
-- sb.requestingranchid (see
-- migrations/add_stallbooking_requestingranchid.sql). No other column,
-- join, or behavior changed.

CREATE OR REPLACE FUNCTION public.usp_getstallbookingassignmentoverview(p_competitionid integer, p_hostranchid integer)
 RETURNS TABLE("StallBookingId" integer, "BookingRanchId" integer, "BookingRanchName" text, "HorseId" integer, "HorseName" text, "BarnName" text, "IsForTack" boolean, "StartDate" date, "EndDate" date, "StayDays" integer, "PriceCatalogId" integer, "ProductId" smallint, "ProductName" text, "ItemPrice" numeric, "TotalAmount" numeric, "IsPaid" boolean, "PaymentStatus" text, "PayerNames" text, "Notes" text, "AssignedCompoundId" smallint, "AssignedStallId" smallint, "AssignedStallNumber" text, "IsAssigned" boolean)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    with charge_summary as (
        select
            bc.sourceid as stallbookingid,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as totalamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Open'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as openamount,

            string_agg(
                distinct trim(coalesce(p.firstname, '') || ' ' || coalesce(p.lastname, '')),
                ', '
                order by trim(coalesce(p.firstname, '') || ' ' || coalesce(p.lastname, ''))
            ) as payernames

        from public.billcharge bc
        left join public.person p
            on p.personid = bc.paidbypersonid
        where bc.competitionid = p_competitionid
          and bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'stalls'
          and bc.chargestatus in ('Open', 'Paid')
        group by bc.sourceid
    )

    select
        sb.stallbookingid::integer as "StallBookingId",
        sb.requestingranchid::integer as "BookingRanchId",
        br.ranchname::text as "BookingRanchName",

        sb.horseid::integer as "HorseId",
        h.horsename::text as "HorseName",
        h.barnname::text as "BarnName",

        sb.isfortack::boolean as "IsForTack",
        sb.startdate::date as "StartDate",
        sb.enddate::date as "EndDate",
        (sb.enddate - sb.startdate + 1)::integer as "StayDays",

        pr.pricecatalogid::integer as "PriceCatalogId",
        pc.productid::smallint as "ProductId",
        prod.productname::text as "ProductName",
        pc.itemprice::numeric as "ItemPrice",

        coalesce(cs.totalamount, 0)::numeric as "TotalAmount",

        (
            coalesce(cs.totalamount, 0) > 0
            and coalesce(cs.openamount, 0) = 0
        )::boolean as "IsPaid",

        case
            when coalesce(cs.totalamount, 0) = 0 then 'Unpaid'
            when coalesce(cs.openamount, 0) = 0 then 'Paid'
            when coalesce(cs.openamount, 0) < coalesce(cs.totalamount, 0) then 'Partial'
            else 'Unpaid'
        end::text as "PaymentStatus",

        coalesce(cs.payernames, '')::text as "PayerNames",
        pr.notes::text as "Notes",

        sa.compoundid::smallint as "AssignedCompoundId",
        sa.stallid::smallint as "AssignedStallId",
        assigned_stall.stallnumber::text as "AssignedStallNumber",
        (sa.assignmentid is not null)::boolean as "IsAssigned"

    from public.stallbooking sb
    inner join public.productrequest pr
        on pr.prequestid = sb.stallbookingid
    inner join public.pricecatalog pc
        on pc.pricecatalogid = pr.pricecatalogid
    inner join public.product prod
        on prod.productid = pc.productid
    inner join public.ranch br
        on br.ranchid = sb.requestingranchid
    left join public.horse h
        on h.horseid = sb.horseid
    inner join charge_summary cs
        on cs.stallbookingid = sb.stallbookingid
    left join public.stallassignment sa
        on sa.competitionid = pr.competitionid
       and sa.stallbookingid = sb.stallbookingid
    left join public.stall assigned_stall
        on assigned_stall.ranchid = sa.ranchid
       and assigned_stall.compoundid = sa.compoundid
       and assigned_stall.stallid = sa.stallid
    where pr.competitionid = p_competitionid
      and not exists (
          select 1
          from public.productchangerequest pcr
          where pcr.newprequestid = pr.prequestid
            and pcr.status = 'Pending'
      )
    order by
        br.ranchname,
        sb.isfortack,
        coalesce(h.horsename, 'תא ציוד'),
        sb.startdate,
        sb.stallbookingid;
end;
$function$
