-- Spec 1 / M4 (CAP-7): approval fields dropped, lifecycle fields added.
-- SEQUENCING: this return-type change (DROP + CREATE) is applied to live TOGETHER with the
-- backend deploy, never ahead of it — the previously deployed DAL reads approvedbypersonid/
-- approvedat by name, so dropping them while the old backend is live would crash the read.
-- Until that deploy, live still returns the pre-retirement 12-column shape.
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
    "PrequestDatetime" timestamp with time zone     -- SLA source (pr.prequestdatetime)
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
        pr.prequestdatetime AS "PrequestDatetime"
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
