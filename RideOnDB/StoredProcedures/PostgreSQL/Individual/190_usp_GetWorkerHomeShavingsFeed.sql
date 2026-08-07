-- PRE-COMPETITION SHAVINGS FIX MERGED IN (2026-08-06, from
-- fix/worker-home-precompetition-shavings, commit 3513f149): the
-- competition-START-date lower-bound predicate that used to gate this
-- feed is intentionally ABSENT below. Shavings/stall prep legitimately
-- happens before a competition's official start date (live evidence:
-- shavingsorderid 519, 65 live orders with requesteddeliverytime before
-- competitionstartdate), so an order due today must not be hidden just
-- because "today" is still before the competition's own start date. Only
-- the upper bound (competitionenddate) still gates the feed -- an order
-- stops appearing once its competition has actually ended.
--
-- OVERDUE WIDENING (Slice 1, 2026-08-07, business change, kept visibly
-- separate from the destination work below): the date predicate changed
-- from equality (today only) to `<=` (today AND overdue). Approved in
-- principle as part of the Worker shavings UX redesign -- a worker's Home
-- feed previously never surfaced an order that was still undelivered from a
-- prior day, since usp_getworkerhomeshavingsfeed hard-filtered to EXACTLY
-- today's requesteddeliverytime. Every other predicate on this feed
-- (ownership/claim, competition end date, competition status, delivered
-- exclusion, approved-cancellation exclusion) is UNCHANGED -- only the date
-- comparison operator moved from `=` to `<=`. A NULL requesteddeliverytime
-- still evaluates the comparison to NULL/false either way, so that edge
-- case is unaffected.
--
-- DELIVERY DESTINATION (Slice 1, 2026-08-07): same destination aggregation
-- design as usp_getshavingsordersforworkerbycompetition (114) -- see that
-- file's header for the full join-key proof and duplicate-impossibility
-- argument, not repeated here. StallNumber is likewise kept as a typed NULL
-- literal (was already NULL for every live row via the old broken join),
-- with the old single-stall join removed entirely rather than kept
-- alongside the new aggregation. Adding output columns changes the return
-- type => DROP + CREATE; both new columns appended LAST.
DROP FUNCTION IF EXISTS public.usp_getworkerhomeshavingsfeed(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getworkerhomeshavingsfeed(p_workersystemuserid integer, p_ranchid integer)
 RETURNS TABLE("ShavingsOrderId" integer, "BagQuantity" smallint, "Notes" character varying, "RequestedDeliveryTime" timestamp without time zone, "ArrivalTime" timestamp without time zone, "DeliveryStatus" character varying, "DeliveryPhotoUrl" text, "DeliveryPhotoDate" timestamp with time zone, "PayerFirstName" character varying, "PayerLastName" character varying, "StallNumber" character varying, "CompetitionId" integer, "CompetitionName" character varying, "WorkerSystemUserId" integer, "WorkerFirstName" character varying, "WorkerLastName" character varying, "ResponseTime" timestamp without time zone, "IsCancelled" boolean, "HasPendingCancellation" boolean, "DeliveryDestinations" jsonb, "HasUnassignedStalls" boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_businessdate date;
BEGIN
    v_businessdate := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date;

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
        c.competitionid,
        c.competitionname,
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
    WHERE c.hostranchid = p_RanchId
      AND (so.workersystemuserid = p_WorkerSystemUserId OR so.workersystemuserid IS NULL)
      AND so.requesteddeliverytime::date <= v_businessdate
      AND c.competitionenddate >= v_businessdate
      AND (c.competitionstatus IS NULL OR c.competitionstatus NOT IN ('טיוטה','בוטלה'))
      AND so.arrivaltime IS NULL
      AND COALESCE(so.deliverystatus, 'Pending') <> 'Delivered'
      AND NOT EXISTS (
          SELECT 1 FROM public.productchangerequest pcr
          WHERE pcr.originalprequestid = so.shavingsorderid
            AND pcr.iscancelled = true
            AND pcr.status = 'Approved'
      )
    ORDER BY so.shavingsorderid;
END;
$function$;
