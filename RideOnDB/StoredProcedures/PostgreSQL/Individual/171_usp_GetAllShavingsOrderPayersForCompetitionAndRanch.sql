-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- p_ranchid means the guest/requesting ranch (no host-ranch validation
-- exists in this proc). Filter changed from sb.ranchid = p_ranchId to
-- sb.requestingranchid = p_ranchId (see
-- migrations/add_stallbooking_requestingranchid.sql). No other behavior
-- changed.

CREATE OR REPLACE FUNCTION public.usp_getallshavingsorderpayersforcompetitionandranch(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE(shavingsorderid integer, billid integer, paidbypersonid integer, payerfullname text, amounttopay numeric, dateopened timestamp with time zone, dateclosed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        so.shavingsorderid,
        b.billid,
        b.paidbypersonid,
        (p.firstname || ' ' || p.lastname)::TEXT AS payerfullname,
        bpr.amounttopay,
        b.dateopened,
        b.dateclosed
    FROM shavingsorder so
    INNER JOIN productrequest pr
        ON pr.prequestid = so.shavingsorderid
    INNER JOIN billproductrequest bpr
        ON bpr.prequestid = so.shavingsorderid
    INNER JOIN bill b
        ON b.billid = bpr.billid
    INNER JOIN person p
        ON p.personid = b.paidbypersonid
    INNER JOIN shavingsorderforstallbooking sosb
        ON sosb.shavingsorderid = so.shavingsorderid
    INNER JOIN stallbooking sb
        ON sb.stallbookingid = sosb.stallbookingid
    WHERE pr.competitionid = p_competitionId
      AND sb.requestingranchid = p_ranchId
    ORDER BY so.shavingsorderid, payerfullname;
END;
$function$;
