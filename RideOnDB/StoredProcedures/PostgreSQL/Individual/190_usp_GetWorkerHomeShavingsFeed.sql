CREATE OR REPLACE FUNCTION public.usp_getworkerhomeshavingsfeed(p_workersystemuserid integer, p_ranchid integer)
 RETURNS TABLE("ShavingsOrderId" integer, "BagQuantity" smallint, "Notes" character varying, "RequestedDeliveryTime" timestamp without time zone, "ArrivalTime" timestamp without time zone, "DeliveryStatus" character varying, "DeliveryPhotoUrl" text, "DeliveryPhotoDate" timestamp with time zone, "PayerFirstName" character varying, "PayerLastName" character varying, "StallNumber" character varying, "CompetitionId" integer, "CompetitionName" character varying, "WorkerSystemUserId" integer, "WorkerFirstName" character varying, "WorkerLastName" character varying, "ResponseTime" timestamp without time zone)
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
        so.responsetime
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
      AND c.competitionstartdate <= v_businessdate
      AND c.competitionenddate >= v_businessdate
      AND (c.competitionstatus IS NULL OR c.competitionstatus NOT IN ('טיוטה','בוטלה'))
      AND so.arrivaltime IS NULL
      AND COALESCE(so.deliverystatus, 'Pending') <> 'Delivered'
    ORDER BY so.shavingsorderid, so.requesteddeliverytime ASC NULLS LAST;
END;
$function$;
