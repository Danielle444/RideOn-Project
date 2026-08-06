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
DROP FUNCTION IF EXISTS public.usp_getworkerhomeshavingsfeed(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getworkerhomeshavingsfeed(p_workersystemuserid integer, p_ranchid integer)
 RETURNS TABLE("ShavingsOrderId" integer, "BagQuantity" smallint, "Notes" character varying, "RequestedDeliveryTime" timestamp without time zone, "ArrivalTime" timestamp without time zone, "DeliveryStatus" character varying, "DeliveryPhotoUrl" text, "DeliveryPhotoDate" timestamp with time zone, "PayerFirstName" character varying, "PayerLastName" character varying, "StallNumber" character varying, "CompetitionId" integer, "CompetitionName" character varying, "WorkerSystemUserId" integer, "WorkerFirstName" character varying, "WorkerLastName" character varying, "ResponseTime" timestamp without time zone, "IsCancelled" boolean, "HasPendingCancellation" boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_businessdate date;
BEGIN
    v_businessdate := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date;

    RETURN QUERY
    SELECT DISTINCT ON (so.shavingsorderid)
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
        s.stallnumber,
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
        ) AS "HasPendingCancellation"
    FROM public.shavingsorder so
    INNER JOIN public.productrequest pr ON pr.prequestid = so.shavingsorderid
    INNER JOIN public.person payer ON payer.personid = pr.orderedbysystemuserid
    INNER JOIN public.competition c ON c.competitionid = pr.competitionid
    LEFT JOIN public.person worker ON worker.personid = so.workersystemuserid
    LEFT JOIN public.shavingsorderforstallbooking sofb ON sofb.shavingsorderid = so.shavingsorderid
    LEFT JOIN public.stallbooking sb ON sb.stallbookingid = sofb.stallbookingid
    LEFT JOIN public.stall s ON s.ranchid = sb.ranchid
                             AND s.compoundid = sb.compoundid
                             AND s.stallid = sb.stallid
    WHERE c.hostranchid = p_RanchId
      AND (so.workersystemuserid = p_WorkerSystemUserId OR so.workersystemuserid IS NULL)
      AND so.requesteddeliverytime::date = v_businessdate
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
    ORDER BY so.shavingsorderid, so.requesteddeliverytime ASC NULLS LAST;
END;
$function$;
