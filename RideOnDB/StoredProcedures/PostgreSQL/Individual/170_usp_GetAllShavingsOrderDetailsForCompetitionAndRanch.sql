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

        AND sb.ranchid =
            ranchid_param;
END;
$function$;
