CREATE OR REPLACE FUNCTION usp_GetWorkerShavingsOrders(
    p_WorkerSystemUserId INTEGER
)
RETURNS TABLE(
    "ShavingsOrderId"       INTEGER,
    "BagQuantity"           INTEGER,
    "Notes"                 TEXT,
    "RequestedDeliveryTime" TIMESTAMP WITH TIME ZONE,
    "ArrivalTime"           TIMESTAMP WITH TIME ZONE,
    "DeliveryStatus"        CHARACTER VARYING,
    "DeliveryPhotoUrl"      TEXT,
    "DeliveryPhotoDate"     TIMESTAMP WITH TIME ZONE,
    "PayerFirstName"        TEXT,
    "PayerLastName"         TEXT,
    "StallName"             TEXT,
    "RanchName"             TEXT,
    "CompetitionName"       TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        so.shavingsorderid,
        so.bagquantity,
        so.notes,
        so.requesteddeliverytime,
        so.arrivaltime,
        so.deliverystatus,
        so.deliveryphotourl,
        so.deliveryphotodate,
        p.firstname,
        p.lastname,
        s.stallname,
        r.ranchname,
        c.competitionname
    FROM public.shavingsorder so
    INNER JOIN public.productrequest pr ON pr.productrequestid = so.shavingsorderid
    INNER JOIN public.person p ON p.personid = pr.payerpersonid
    LEFT JOIN public.shavingsorderforstallbooking sofb ON sofb.shavingsorderid = so.shavingsorderid
    LEFT JOIN public.stallbooking sb ON sb.stallbookingid = sofb.stallbookingid
    LEFT JOIN public.stall s ON s.stallid = sb.stallid
    LEFT JOIN public.ranch r ON r.ranchid = pr.ranchid
    LEFT JOIN public.competition c ON c.competitionid = pr.competitionid
    WHERE so.workersystemuserid = p_WorkerSystemUserId
    ORDER BY so.requesteddeliverytime DESC;
END;
$$;
