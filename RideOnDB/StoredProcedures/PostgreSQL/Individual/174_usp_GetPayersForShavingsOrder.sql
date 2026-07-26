CREATE OR REPLACE FUNCTION public.usp_getpayersforshavingsorder(p_shavingsorderid integer)
 RETURNS TABLE(shavingsorderid integer, billid integer, paidbypersonid integer, payerfullname text, amounttopay numeric, dateopened timestamp with time zone, dateclosed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        so.shavingsorderid,
        b.billid,
        b.paidbypersonid,
        (p.firstname || ' ' || p.lastname)::TEXT AS payerfullname,
        bpr.amounttopay,
        b.dateopened,
        b.dateclosed
    FROM shavingsorder so
    INNER JOIN billproductrequest bpr
        ON bpr.prequestid = so.shavingsorderid
    INNER JOIN bill b
        ON b.billid = bpr.billid
    INNER JOIN person p
        ON p.personid = b.paidbypersonid
    WHERE so.shavingsorderid = p_shavingsOrderId
    ORDER BY payerfullname;
END;
$function$;
