-- Spec 1 / M4 (CAP-7): approval fields dropped, lifecycle fields added.
-- Spec 2 / DEP-1: expose DeliveryPhotoUrl so the secretary page can flag "delivered without photo".
--   Adding an output column changes the return type => DROP + CREATE (CREATE OR REPLACE cannot change
--   the TABLE shape). The new column is appended LAST and every consumer reads by name, so the deployed
--   DAL keeps working unchanged. The DROP+CREATE runs atomically in one migration (no window where the
--   function is missing), so this may be applied ahead of the web deploy (backward-compatible append).
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- p_ranchid means the guest/requesting ranch (no host-ranch validation
-- exists in this proc). Filter changed from sb.ranchid = p_ranchid to
-- sb.requestingranchid = p_ranchid (see
-- migrations/add_stallbooking_requestingranchid.sql). Return shape and
-- every other column/behavior unchanged -- no DROP+CREATE needed this time
-- since the parameter list itself is unchanged from the prior signature.
-- STANDALONE SHAVINGS CANCELLATION (2026-08-06): appends IsCancelled and
-- HasPendingCancellation (own-order state, computed from the shavings
-- order's own productchangerequest via originalprequestid -- same
-- technique already used for usp_getpayercompetitionaccount's
-- stall_items/shavings_items). Before this, the secretary web shavings page
-- had NO way to know a shavings order had been cancelled -- neither this
-- proc nor any consumer column expressed it -- so a standalone-cancelled
-- order would have kept rendering as a normal active row. Another DROP +
-- CREATE (two new output columns), appended LAST per the established
-- convention; every existing column/behavior is otherwise unchanged.
--
-- DELIVERY DESTINATION (Slice 1, 2026-08-07): appends DeliveryDestinations
-- (jsonb) / HasUnassignedStalls (boolean) -- this proc previously exposed NO
-- stall/compound information at all (it only ever joined
-- shavingsorderforstallbooking/stallbooking to test ranch membership, never
-- selected any booking-specific column). That inline join is REMOVED from
-- the main query and replaced with a non-multiplying EXISTS that preserves
-- the exact same "does this order have >=1 booking requested by this ranch"
-- filtering semantics the old INNER JOIN + SELECT DISTINCT achieved --
-- SELECT DISTINCT is no longer needed and is removed too. Destination data
-- itself is resolved via a SEPARATE, unfiltered-by-ranch aggregation
-- (shavingsorderforstallbooking -> stallbooking -> stallassignment -> stall
-- -> stallcompound, pre-aggregated to one row per shavingsorderid before
-- ever joining into the main query), showing the order's FULL destination
-- regardless of which ranch requested which booking -- see
-- usp_getshavingsordersforworkerbycompetition (114)'s header for the full
-- ranch-key proof (stallassignment.ranchid, not stallbooking.ranchid/
-- requestingranchid) and the duplicate-impossibility argument, not repeated
-- here. Requesting-ranch scoping (WHO may see the order) and every billing
-- column/subquery are unchanged.
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
    "DeliveryPhotoUrl" text,                        -- DEP-1: appended LAST
    "IsCancelled" boolean,                          -- standalone shavings cancellation: appended LAST
    "HasPendingCancellation" boolean,               -- standalone shavings cancellation: appended LAST
    "DeliveryDestinations" jsonb,                   -- Slice 1: appended LAST
    "HasUnassignedStalls" boolean                   -- Slice 1: appended LAST
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH destination_rows AS (
        SELECT
            sofb.shavingsorderid,
            sa.ranchid   AS assignment_ranchid,
            sa.compoundid,
            sc.compoundname,
            sa.stallid,
            s.stallnumber,
            sb.isfortack
        FROM public.shavingsorderforstallbooking sofb
        JOIN public.stallbooking sb
            ON sb.stallbookingid = sofb.stallbookingid
        LEFT JOIN public.stallassignment sa
            ON sa.stallbookingid = sb.stallbookingid
        LEFT JOIN public.stall s
            ON s.ranchid = sa.ranchid
           AND s.compoundid = sa.compoundid
           AND s.stallid = sa.stallid
        LEFT JOIN public.stallcompound sc
            ON sc.ranchid = sa.ranchid
           AND sc.compoundid = sa.compoundid
    ),
    destination_compounds AS (
        SELECT
            shavingsorderid,
            compoundid,
            compoundname,
            jsonb_agg(
                jsonb_build_object(
                    'StallId', stallid,
                    'StallNumber', stallnumber,
                    'IsTackStall', isfortack
                )
                ORDER BY stallid
            ) AS stalls
        FROM destination_rows
        WHERE compoundid IS NOT NULL
        GROUP BY shavingsorderid, compoundid, compoundname
    ),
    destination_json AS (
        SELECT
            shavingsorderid,
            jsonb_agg(
                jsonb_build_object(
                    'CompoundId', compoundid,
                    'CompoundName', compoundname,
                    'Stalls', stalls
                )
                ORDER BY compoundid
            ) AS deliverydestinations
        FROM destination_compounds
        GROUP BY shavingsorderid
    ),
    destination_flags AS (
        SELECT
            shavingsorderid,
            bool_or(compoundid IS NULL) AS hasunassignedstalls
        FROM destination_rows
        GROUP BY shavingsorderid
    )
    SELECT
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
        so.deliveryphotourl AS "DeliveryPhotoUrl",
        EXISTS (
            SELECT 1 FROM productchangerequest pcr
            WHERE pcr.originalprequestid = pr.prequestid
              AND pcr.iscancelled = true
              AND pcr.status = 'Approved'
        ) AS "IsCancelled",
        EXISTS (
            SELECT 1 FROM productchangerequest pcr
            WHERE pcr.originalprequestid = pr.prequestid
              AND pcr.iscancelled = true
              AND pcr.status = 'Pending'
        ) AS "HasPendingCancellation",
        COALESCE(dj.deliverydestinations, '[]'::jsonb) AS "DeliveryDestinations",
        COALESCE(df.hasunassignedstalls, false) AS "HasUnassignedStalls"
    FROM shavingsorder so
    INNER JOIN productrequest pr ON pr.prequestid = so.shavingsorderid
    INNER JOIN pricecatalog pc  ON pc.pricecatalogid = pr.pricecatalogid
    INNER JOIN systemuser su    ON su.systemuserid = pr.orderedbysystemuserid
    INNER JOIN person p         ON p.personid = su.systemuserid
    LEFT JOIN (
        SELECT bpr.prequestid, SUM(bpr.amounttopay) AS totalamount
        FROM billproductrequest bpr
        GROUP BY bpr.prequestid
    ) bpr_total ON bpr_total.prequestid = pr.prequestid
    LEFT JOIN destination_json dj ON dj.shavingsorderid = so.shavingsorderid
    LEFT JOIN destination_flags df ON df.shavingsorderid = so.shavingsorderid
    WHERE pr.competitionid = p_competitionid
      AND EXISTS (
          SELECT 1
          FROM public.shavingsorderforstallbooking sofb2
          JOIN public.stallbooking sb2 ON sb2.stallbookingid = sofb2.stallbookingid
          WHERE sofb2.shavingsorderid = so.shavingsorderid
            AND sb2.requestingranchid = p_ranchid
      )
    ORDER BY so.requesteddeliverytime DESC;
END;
$function$;
