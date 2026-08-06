-- RANCHWORKER SHAVINGS CANCELLATION LIFECYCLE (2026-08-06): appends
-- IsCancelled/HasPendingCancellation (own-order state, computed from the
-- shavings order's own productchangerequest via originalprequestid -- same
-- technique already used by usp_getpayercompetitionaccount (212) and
-- usp_getshavingsordersforcompetitionandranch (176)). Before this, the
-- worker competition list had no way to know an order had a pending or
-- approved cancellation -- confirmed live for shavingsorderid 321 (Pending
-- cancellation, unclaimed), which rendered as a normal actionable order with
-- a live claim button. Adding an output column changes the return type =>
-- DROP + CREATE (CREATE OR REPLACE cannot change the TABLE shape). The two
-- new columns are appended LAST and every consumer reads by name, so this is
-- a backward-compatible append. No WHERE-clause filtering added here
-- (deliberately, unlike 190): this screen already has an existing
-- non-actionable historical grouping (past-delivered orders shown collapsed)
-- that a terminal-cancelled order now also folds into on the client -- see
-- mobile/src/utils/workerHomeShavingsFeed.js.
DROP FUNCTION IF EXISTS public.usp_getshavingsordersforworkerbycompetition(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getshavingsordersforworkerbycompetition(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE("ShavingsOrderId" integer, "BagQuantity" smallint, "Notes" character varying, "RequestedDeliveryTime" timestamp without time zone, "ArrivalTime" timestamp without time zone, "DeliveryStatus" character varying, "DeliveryPhotoUrl" text, "DeliveryPhotoDate" timestamp with time zone, "PayerFirstName" character varying, "PayerLastName" character varying, "StallNumber" character varying, "WorkerSystemUserId" integer, "WorkerFirstName" character varying, "WorkerLastName" character varying, "ResponseTime" timestamp without time zone, "IsCancelled" boolean, "HasPendingCancellation" boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
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
    WHERE pr.competitionid = p_CompetitionId
      AND c.hostranchid = p_RanchId
    ORDER BY so.shavingsorderid, so.requesteddeliverytime DESC NULLS LAST;
END;
$function$;
