CREATE OR REPLACE FUNCTION usp_SaveDeliveryPhoto(
    p_ShavingsOrderId   INTEGER,
    p_DeliveryPhotoUrl  TEXT,
    p_DeliveryPhotoDate TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.shavingsorder
    SET
        deliveryphotourl  = p_DeliveryPhotoUrl,
        deliveryphotodate = p_DeliveryPhotoDate,
        deliverystatus    = 'WaitingApproval'
    WHERE shavingsorderid = p_ShavingsOrderId;
END;
$$;
