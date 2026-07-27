-- Spec 1 / M4 (CAP-7): approval fields dropped, lifecycle fields added.
-- Spec 2 / DEP-1: expose DeliveryPhotoUrl so the secretary page can flag "delivered without photo".
--   Adding an output column changes the return type => DROP + CREATE (CREATE OR REPLACE cannot change
--   the TABLE shape). The new column is appended LAST and every consumer reads by name, so the deployed
--   DAL keeps working unchanged. The DROP+CREATE runs atomically in one migration (no window where the
--   function is missing), so this may be applied ahead of the web deploy (backward-compatible append).
DROP FUNCTION IF EXISTS public.usp_getshavingsordersforcompetitionandranch(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getshavingsordersforcompetitionandranch(
    p_competitionid integer,
    p_ranchid integer
)
 RETURNS TABLE(
    "ShavingsOrderId" integer,
    "RequestedDeliveryTime" timestamp without time zone,
    "BagQuantity" smallint,
    "DeliveryStatus" character varying,
    "Notes" character varying,
    "WorkerSystemUserId" integer,
    "OrderedByName" text,
    "PriceCatalogId" integer,
    "ItemPrice" numeric,
    "TotalAmount" numeric,
    "Seen" timestamp without time zone,             -- responsetime
    "Delivered" timestamp without time zone,        -- arrivaltime
    "PrequestDatetime" timestamp with time zone,    -- SLA source (pr.prequestdatetime)
    "DeliveryPhotoUrl" text                         -- DEP-1: appended LAST
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        so.shavingsorderid,
        so.requesteddeliverytime,
        so.bagquantity,
        so.deliverystatus,
        so.notes,
        so.workersystemuserid,
        CONCAT(p.firstname, ' ', p.lastname) AS orderedbyname,
        pr.pricecatalogid,
        pc.itemprice,
        COALESCE(bpr_total.totalamount, 0) AS totalamount,
        so.responsetime AS "Seen",
        so.arrivaltime  AS "Delivered",
        pr.prequestdatetime AS "PrequestDatetime",
        so.deliveryphotourl AS "DeliveryPhotoUrl"
    FROM shavingsorder so
    INNER JOIN productrequest pr ON pr.prequestid = so.shavingsorderid
    INNER JOIN pricecatalog pc  ON pc.pricecatalogid = pr.pricecatalogid
    INNER JOIN systemuser su    ON su.systemuserid = pr.orderedbysystemuserid
    INNER JOIN person p         ON p.personid = su.systemuserid
    INNER JOIN shavingsorderforstallbooking sosb ON sosb.shavingsorderid = so.shavingsorderid
    INNER JOIN stallbooking sb  ON sb.stallbookingid = sosb.stallbookingid
    LEFT JOIN (
        SELECT bpr.prequestid, SUM(bpr.amounttopay) AS totalamount
        FROM billproductrequest bpr
        GROUP BY bpr.prequestid
    ) bpr_total ON bpr_total.prequestid = pr.prequestid
    WHERE pr.competitionid = p_competitionid
      AND sb.ranchid = p_ranchid
    ORDER BY so.requesteddeliverytime DESC;
END;
$function$;
