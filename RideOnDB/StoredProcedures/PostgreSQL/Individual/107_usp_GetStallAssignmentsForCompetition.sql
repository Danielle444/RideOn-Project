-- REPO DRIFT RECONCILIATION (2026-08-05): the repo copy of this file was
-- confirmed stale during the ranch-model architecture audit -- it declared
-- only (CompoundId, StallId, StallNumber, HorseId, HorseName, BarnName)
-- from a plain stallassignment/horse/stall join, while the LIVE function
-- (pg_get_functiondef, read 2026-08-05) has a much larger return shape
-- (AssignmentId, StallBookingId, BookingRanchId, BookingRanchName,
-- IsForTack, ProductName added) sourced from stallbooking/productrequest/
-- pricecatalog/product/ranch joins. Per this project's own rule that repo
-- drift can run either direction, the body below is the LIVE definition,
-- not the stale repo one -- reconstructing from the old repo file would
-- have silently reverted a live proc to a narrower, already-superseded
-- shape.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- "BookingRanchId"/"BookingRanchName" were sourced from sb.ranchid, which
-- before this fix held the (buggy) horse-home-ranch value. Source changed
-- to sb.requestingranchid (see
-- migrations/add_stallbooking_requestingranchid.sql), consistent with
-- 229_usp_GetStallBookingAssignmentOverview.sql's identical display
-- column. No other column or behavior changed.

CREATE OR REPLACE FUNCTION public.usp_getstallassignmentsforcompetition(p_competitionid integer)
 RETURNS TABLE("AssignmentId" integer, "StallBookingId" integer, "CompoundId" smallint, "StallId" smallint, "StallNumber" text, "BookingRanchId" integer, "BookingRanchName" text, "HorseId" integer, "HorseName" text, "BarnName" text, "IsForTack" boolean, "ProductName" text)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select
        sa.assignmentid::integer as "AssignmentId",
        sa.stallbookingid::integer as "StallBookingId",
        sa.compoundid::smallint as "CompoundId",
        sa.stallid::smallint as "StallId",
        s.stallnumber::text as "StallNumber",

        sb.requestingranchid::integer as "BookingRanchId",
        br.ranchname::text as "BookingRanchName",

        sb.horseid::integer as "HorseId",
        h.horsename::text as "HorseName",
        h.barnname::text as "BarnName",

        sb.isfortack::boolean as "IsForTack",
        prod.productname::text as "ProductName"

    from public.stallassignment sa
    inner join public.stallbooking sb
        on sb.stallbookingid = sa.stallbookingid
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
    inner join public.stall s
        on s.ranchid = sa.ranchid
       and s.compoundid = sa.compoundid
       and s.stallid = sa.stallid
    where sa.competitionid = p_competitionid
    order by
        sa.compoundid,
        s.stallnumber;
end;
$function$
