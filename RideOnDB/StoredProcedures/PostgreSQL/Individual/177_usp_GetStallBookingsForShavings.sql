-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- p_ranchid means the guest/requesting ranch (no host-ranch validation
-- exists in this proc). Filter changed from sb.ranchid = p_ranchId to
-- sb.requestingranchid = p_ranchId (see
-- migrations/add_stallbooking_requestingranchid.sql) so this shavings-order
-- stall picker keeps showing only the caller's own ranch's non-tack stalls
-- once stallbooking.ranchid means host ranch. No other behavior changed.

CREATE OR REPLACE FUNCTION public.usp_getstallbookingsforshavings(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE(stallbookingid integer, horseid integer, horsename character varying, startdate date, enddate date, compoundid smallint, stallid smallint, payernames text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sb.stallbookingid,
        sb.horseid,
        h.horsename,
        sb.startdate,
        sb.enddate,
        sb.compoundid,
        sb.stallid,
        COALESCE(
            string_agg(DISTINCT (p.firstname || ' ' || p.lastname), ', '),
            ''
        )::text AS payernames
    FROM stallbooking sb
    INNER JOIN productrequest pr
        ON pr.prequestid = sb.stallbookingid
    INNER JOIN horse h
        ON h.horseid = sb.horseid
    LEFT JOIN billproductrequest bpr
        ON bpr.prequestid = sb.stallbookingid
    LEFT JOIN bill b
        ON b.billid = bpr.billid
    LEFT JOIN person p
        ON p.personid = b.paidbypersonid
    LEFT JOIN productchangerequest pcr
        ON pcr.originalprequestid = pr.prequestid
       AND pcr.status = 'Approved'
    WHERE pr.competitionid = p_competitionId
      AND sb.requestingranchid = p_ranchId
      AND sb.isfortack = false
      AND (
            pcr.productchangerequestid IS NULL
            OR (
                pcr.iscancelled = false
                AND pcr.newprequestid IS NULL
            )
          )
    GROUP BY
        sb.stallbookingid,
        sb.horseid,
        h.horsename,
        sb.startdate,
        sb.enddate,
        sb.compoundid,
        sb.stallid
    ORDER BY sb.startdate, h.horsename;
END;
$function$;
