CREATE OR REPLACE FUNCTION public.usp_getshavingsorderdetails(p_shavingsorderid integer)
 RETURNS TABLE(stallbookingid integer, horseid integer, horsename character varying, bagquantityperstall smallint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sb.stallbookingid,
        sb.horseid,
        h.horsename,
        sosb.bagquantityperstall
    FROM shavingsorderforstallbooking sosb
    INNER JOIN stallbooking sb
        ON sb.stallbookingid = sosb.stallbookingid
    INNER JOIN horse h
        ON h.horseid = sb.horseid
    WHERE sosb.shavingsorderid = p_shavingsOrderId
    ORDER BY h.horsename;
END;
$function$;
