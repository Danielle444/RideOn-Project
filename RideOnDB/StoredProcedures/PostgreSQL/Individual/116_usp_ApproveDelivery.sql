CREATE OR REPLACE FUNCTION usp_ApproveDelivery(
    p_ShavingsOrderId    INTEGER,
    p_ApprovedByPersonId INTEGER,
    p_ApprovedAt         TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.shavingsorder
    SET
        deliverystatus      = 'Closed',
        approvedbypersonid  = p_ApprovedByPersonId,
        approvedat          = p_ApprovedAt
    WHERE shavingsorderid = p_ShavingsOrderId;
END;
$$;
