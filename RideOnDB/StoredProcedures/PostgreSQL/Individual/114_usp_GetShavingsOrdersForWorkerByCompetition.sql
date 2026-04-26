CREATE OR REPLACE FUNCTION usp_GetShavingsOrdersForWorkerByCompetition(
    p_CompetitionId INTEGER,
    p_RanchId       INTEGER
)
RETURNS TABLE(
    "ShavingsOrderId"       INTEGER,
    "BagQuantity"           SMALLINT,
    "Notes"                 CHARACTER VARYING,
    "RequestedDeliveryTime" TIMESTAMP WITHOUT TIME ZONE,
    "ArrivalTime"           TIMESTAMP WITHOUT TIME ZONE,
    "DeliveryStatus"        CHARACTER VARYING,
    "DeliveryPhotoUrl"      TEXT,
    "DeliveryPhotoDate"     TIMESTAMP WITH TIME ZONE,
    "PayerFirstName"        CHARACTER VARYING,
    "PayerLastName"         CHARACTER VARYING,
    "StallNumber"           CHARACTER VARYING,
    "WorkerSystemUserId"    INTEGER,
    "WorkerFirstName"       CHARACTER VARYING,
    "WorkerLastName"        CHARACTER VARYING
)
LANGUAGE plpgsql AS $$
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
        worker.lastname
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
$$;
