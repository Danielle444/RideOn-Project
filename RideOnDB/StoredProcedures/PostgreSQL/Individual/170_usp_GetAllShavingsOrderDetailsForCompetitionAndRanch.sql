-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- ranchid_param means the guest/requesting ranch (no host-ranch validation
-- exists in this proc). Filter changed from sb.ranchid = ranchid_param to
-- sb.requestingranchid = ranchid_param (see
-- migrations/add_stallbooking_requestingranchid.sql). No other behavior
-- changed.

CREATE OR REPLACE FUNCTION public.usp_getallshavingsorderdetailsforcompetitionandranch(competitionid_param integer, ranchid_param integer)
 RETURNS TABLE("ShavingsOrderId" integer, "StallBookingId" integer, "HorseId" integer, "HorseName" character varying, "BagQuantityPerStall" smallint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY

    SELECT
        sosbs.shavingsorderid,
        sosbs.stallbookingid,
        h.horseid,
        h.horsename,
        sosbs.bagquantityperstall

    FROM shavingsorderforstallbooking sosbs

    INNER JOIN stallbooking sb
        ON sb.stallbookingid =
           sosbs.stallbookingid

    LEFT JOIN horse h
        ON h.horseid =
           sb.horseid

    INNER JOIN productrequest pr
        ON pr.prequestid =
           sb.stallbookingid

    WHERE
        pr.competitionid =
            competitionid_param

        AND sb.requestingranchid =
            ranchid_param;
END;
$function$;
