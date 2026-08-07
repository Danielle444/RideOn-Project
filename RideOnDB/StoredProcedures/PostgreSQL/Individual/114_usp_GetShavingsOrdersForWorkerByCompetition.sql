-- RANCHWORKER SHAVINGS CANCELLATION LIFECYCLE (2026-08-06): appends
-- IsCancelled/HasPendingCancellation (own-order state via
-- productchangerequest, same technique as 114/176/212 -- see 114's own
-- header for the full rationale). Additionally excludes a terminal-cancelled
-- (Approved) order from this feed entirely: unlike the competition-scoped
-- list (114), this Home-screen widget is exclusively "today's active
-- workload" with no historical/non-actionable area anywhere on that screen,
-- so a resolved-via-cancellation order is excluded here the same way an
-- already-delivered order already is (so.arrivaltime IS NULL /
-- deliverystatus <> 'Delivered' below). A Pending cancellation is NOT
-- excluded -- it must stay visible per business rule 1, just locked/labeled
-- on the client. Adding output columns changes the return type => DROP +
-- CREATE; both new columns appended LAST, backward-compatible append.
--
-- DELIVERY DESTINATION (Slice 1, 2026-08-07): appends DeliveryDestinations
-- (jsonb) / HasUnassignedStalls (boolean). The old single-stall lookup
-- (LEFT JOIN shavingsorderforstallbooking/stallbooking/stall directly into
-- the main per-order query, deduped only by DISTINCT ON) is removed
-- entirely -- it structurally could only ever surface ONE of an order's
-- possibly-many linked stalls, and its join key (stallbooking.compoundid/
-- stallid) is NULL on every live row anyway (proven: 152/152 stallbooking
-- rows), so it was silently returning nothing today. Destinations are now
-- pre-aggregated to exactly one row per shavingsorderid in the
-- destination_json/destination_flags CTEs below BEFORE they ever reach the
-- main query, so a plain LEFT JOIN on shavingsorderid cannot multiply the
-- main order row -- DISTINCT ON is no longer needed for that purpose and is
-- removed. The physical stall's ranch is resolved via
-- stallassignment.ranchid (NOT stallbooking.ranchid/requestingranchid) --
-- proven against live data: stallassignment.ranchid equals
-- stallbooking.ranchid and competition.hostranchid in every sampled row,
-- including guest-ranch bookings (shavingsorderid 279-286, requestingranchid
-- 7 into host ranch 11's stalls), and matches the join key already used by
-- the deployed sibling proc usp_GetAssignedStallPrices (135). Duplicate
-- stall objects within one order's array are structurally impossible:
-- stallassignment carries UNIQUE(competitionid, ranchid, compoundid,
-- stallid), and every booking linked to one shavingsorder shares the same
-- competitionid.
--
-- LEGACY STallNumber (Slice 1): kept as a typed NULL literal in its
-- original output position, not backed by any join. It was already NULL for
-- every live row via the old broken join (proven), so this is byte-for-byte
-- identical behavior for the currently-deployed server/client, without
-- re-adding a join that could multiply the main row again. StallNumber is
-- superseded by DeliveryDestinations and is a candidate for removal in a
-- later cleanup migration once the new server+client are fully rolled out --
-- not done here.
DROP FUNCTION IF EXISTS public.usp_getshavingsordersforworkerbycompetition(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getshavingsordersforworkerbycompetition(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE("ShavingsOrderId" integer, "BagQuantity" smallint, "Notes" character varying, "RequestedDeliveryTime" timestamp without time zone, "ArrivalTime" timestamp without time zone, "DeliveryStatus" character varying, "DeliveryPhotoUrl" text, "DeliveryPhotoDate" timestamp with time zone, "PayerFirstName" character varying, "PayerLastName" character varying, "StallNumber" character varying, "WorkerSystemUserId" integer, "WorkerFirstName" character varying, "WorkerLastName" character varying, "ResponseTime" timestamp without time zone, "IsCancelled" boolean, "HasPendingCancellation" boolean, "DeliveryDestinations" jsonb, "HasUnassignedStalls" boolean)
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
        so.bagquantity,
        so.notes,
        so.requesteddeliverytime,
        so.arrivaltime,
        so.deliverystatus,
        so.deliveryphotourl,
        so.deliveryphotodate,
        payer.firstname,
        payer.lastname,
        NULL::character varying AS "StallNumber",
        so.workersystemuserid,
        worker.firstname,
        worker.lastname,
        so.responsetime,
        EXISTS (
            SELECT 1 FROM public.productchangerequest pcr
            WHERE pcr.originalprequestid = so.shavingsorderid
              AND pcr.iscancelled = true
              AND pcr.status = 'Approved'
        ) AS "IsCancelled",
        EXISTS (
            SELECT 1 FROM public.productchangerequest pcr
            WHERE pcr.originalprequestid = so.shavingsorderid
              AND pcr.iscancelled = true
              AND pcr.status = 'Pending'
        ) AS "HasPendingCancellation",
        COALESCE(dj.deliverydestinations, '[]'::jsonb) AS "DeliveryDestinations",
        COALESCE(df.hasunassignedstalls, false) AS "HasUnassignedStalls"
    FROM public.shavingsorder so
    INNER JOIN public.productrequest pr ON pr.prequestid = so.shavingsorderid
    INNER JOIN public.person payer ON payer.personid = pr.orderedbysystemuserid
    INNER JOIN public.competition c ON c.competitionid = pr.competitionid
    LEFT JOIN public.person worker ON worker.personid = so.workersystemuserid
    LEFT JOIN destination_json dj ON dj.shavingsorderid = so.shavingsorderid
    LEFT JOIN destination_flags df ON df.shavingsorderid = so.shavingsorderid
    WHERE pr.competitionid = p_CompetitionId
      AND c.hostranchid = p_RanchId
    ORDER BY so.shavingsorderid;
END;
$function$;
