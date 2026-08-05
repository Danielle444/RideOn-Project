-- 226_usp_GetStallBookingsForCompetitionAndRanch.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. No repo file
-- existed for this proc before this audit (confirmed by exhaustive glob
-- across RideOnDB/StoredProcedures, 2026-08-05). Body captured verbatim
-- from live via pg_get_functiondef on 2026-08-05, per this project's own
-- rule that a proc body must never be guessed from behavior alone.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- p_ranchid here means the guest/requesting ranch the caller (a ranch
-- admin or host secretary) is viewing "their own" stall bookings for --
-- confirmed by this proc having no competition.hostranchid validation at
-- all, unlike the reporting procs whose p_ranchid is host-validated. The
-- filter changed from sb.ranchid = p_ranchid to
-- sb.requestingranchid = p_ranchid (see
-- migrations/add_stallbooking_requestingranchid.sql) so this screen keeps
-- showing only the caller's own ranch's bookings once stallbooking.ranchid
-- means host ranch. No other behavior changed -- payment/change-request
-- computed columns, ordering, and result shape are unchanged.

CREATE OR REPLACE FUNCTION public.usp_getstallbookingsforcompetitionandranch(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE(stallbookingid integer, horseid integer, horsename character varying, isfortack boolean, startdate date, enddate date, compoundid smallint, stallid smallint, pricecatalogid integer, itemprice numeric, notes text, approvaldate timestamp without time zone, iscancelled boolean, haspendingcancellation boolean, haspendingchange boolean, hasapprovedchange boolean, totalamount numeric, ispaid boolean)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    with charge_summary as (
        select
            bc.sourceid as prequestid,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as totalamount,

            (
                coalesce(sum(
                    case
                        when bc.chargestatus in ('Open', 'Paid')
                        then bc.amounttopay
                        else 0
                    end
                ), 0) > 0
                and
                coalesce(sum(
                    case
                        when bc.chargestatus = 'Open'
                        then bc.amounttopay
                        else 0
                    end
                ), 0) = 0
            )::boolean as ispaid

        from public.billcharge bc
        where bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'stalls'
          and bc.competitionid = p_competitionid
          and bc.chargestatus in ('Open', 'Paid')
        group by bc.sourceid
    )

    select
        sb.stallbookingid::integer,
        sb.horseid::integer,
        h.horsename,
        sb.isfortack,
        sb.startdate,
        sb.enddate,
        sb.compoundid,
        sb.stallid,
        pr.pricecatalogid::integer,
        pc.itemprice,
        pr.notes,
        pr.approvaldate,

        exists (
            select 1
            from public.productchangerequest pcr
            where pcr.originalprequestid = pr.prequestid
              and pcr.iscancelled = true
              and pcr.status = 'Approved'
        ) as iscancelled,

        exists (
            select 1
            from public.productchangerequest pcr
            where pcr.originalprequestid = pr.prequestid
              and pcr.iscancelled = true
              and pcr.status = 'Pending'
        ) as haspendingcancellation,

        exists (
            select 1
            from public.productchangerequest pcr
            where pcr.originalprequestid = pr.prequestid
              and pcr.iscancelled = false
              and pcr.status = 'Pending'
              and pcr.newprequestid is not null
        ) as haspendingchange,

        exists (
            select 1
            from public.productchangerequest pcr
            where pcr.originalprequestid = pr.prequestid
              and pcr.status = 'Approved'
              and pcr.newprequestid is not null
        ) as hasapprovedchange,

        coalesce(cs.totalamount, 0)::numeric as totalamount,
        coalesce(cs.ispaid, false)::boolean as ispaid

    from public.stallbooking sb
    inner join public.productrequest pr
        on pr.prequestid = sb.stallbookingid
    left join public.horse h
        on h.horseid = sb.horseid
    inner join public.pricecatalog pc
        on pc.pricecatalogid = pr.pricecatalogid
    left join charge_summary cs
        on cs.prequestid = pr.prequestid
    where pr.competitionid = p_competitionid
      and sb.requestingranchid = p_ranchid
      and not exists (
          select 1
          from public.productchangerequest pcr
          where pcr.newprequestid = pr.prequestid
            and pcr.status = 'Pending'
      )
    order by
        sb.startdate,
        coalesce(h.horsename, 'ציוד');
end;
$function$
