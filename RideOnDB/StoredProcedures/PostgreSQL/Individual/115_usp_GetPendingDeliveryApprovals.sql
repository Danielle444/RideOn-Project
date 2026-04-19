CREATE OR REPLACE FUNCTION usp_GetPendingDeliveryApprovals(
    p_RanchId INTEGER
)
RETURNS TABLE(
    "ShavingsOrderId"   INTEGER,
    "BagQuantity"       INTEGER,
    "Notes"             TEXT,
    "DeliveryPhotoUrl"  TEXT,
    "DeliveryPhotoDate" TIMESTAMP WITH TIME ZONE,
    "PayerFirstName"    TEXT,
    "PayerLastName"     TEXT,
    "StallName"         TEXT,
    "WorkerFirstName"   TEXT,
    "WorkerLastName"    TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        so.shavingsorderid,
        so.bagquantity,
        so.notes,
        so.deliveryphotourl,
        so.deliveryphotodate,
        payer.firstname,
        payer.lastname,
        s.stallname,
        worker.firstname,
        worker.lastname
    FROM public.shavingsorder so
    INNER JOIN public.productrequest pr ON pr.productrequestid = so.shavingsorderid
    INNER JOIN public.person payer ON payer.personid = pr.payerpersonid
    INNER JOIN public.systemuser su ON su.systemuserid = so.workersystemuserid
    INNER JOIN public.person worker ON worker.personid = su.systemuserid
    LEFT JOIN public.shavingsorderforstallbooking sofb ON sofb.shavingsorderid = so.shavingsorderid
    LEFT JOIN public.stallbooking sb ON sb.stallbookingid = sofb.stallbookingid
    LEFT JOIN public.stall s ON s.stallid = sb.stallid
    WHERE pr.ranchid = p_RanchId
      AND so.deliverystatus = 'WaitingApproval'
    ORDER BY so.deliveryphotodate DESC;
END;
$$;
