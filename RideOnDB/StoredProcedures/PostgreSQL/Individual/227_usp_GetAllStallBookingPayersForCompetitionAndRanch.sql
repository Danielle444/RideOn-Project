-- 227_usp_GetAllStallBookingPayersForCompetitionAndRanch.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. No repo file
-- existed for this proc before this audit (confirmed by exhaustive glob
-- across RideOnDB/StoredProcedures, 2026-08-05). Body captured verbatim
-- from live via pg_get_functiondef on 2026-08-05.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- same reasoning as 226_usp_GetStallBookingsForCompetitionAndRanch.sql --
-- p_ranchid means the guest/requesting ranch, no host-ranch validation
-- exists in this proc. Filter changed from sb.ranchid = p_ranchId to
-- sb.requestingranchid = p_ranchId. No other behavior changed.

CREATE OR REPLACE FUNCTION public.usp_getallstallbookingpayersforcompetitionandranch(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE(stallbookingid integer, billid integer, paidbypersonid integer, payerfullname text, amounttopay numeric, dateopened timestamp with time zone, dateclosed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sb.stallbookingid,
        b.billid,
        b.paidbypersonid,
        (p.firstname || ' ' || p.lastname)::TEXT AS payerfullname,
        bpr.amounttopay,
        b.dateopened,
        b.dateclosed
    FROM stallbooking sb
    INNER JOIN productrequest pr
        ON pr.prequestid = sb.stallbookingid
    INNER JOIN billproductrequest bpr
        ON bpr.prequestid = sb.stallbookingid
    INNER JOIN bill b
        ON b.billid = bpr.billid
    INNER JOIN person p
        ON p.personid = b.paidbypersonid
    WHERE pr.competitionid = p_competitionId
      AND sb.requestingranchid = p_ranchId
    ORDER BY sb.stallbookingid, payerfullname;
END;
$function$
