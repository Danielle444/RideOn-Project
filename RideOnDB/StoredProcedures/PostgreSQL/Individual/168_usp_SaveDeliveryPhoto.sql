CREATE OR REPLACE FUNCTION public.usp_savedeliveryphoto(p_shavingsorderid integer, p_deliveryphotourl text, p_deliveryphotodate timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.shavingsorder
    SET deliveryphotourl  = p_DeliveryPhotoUrl,
        deliveryphotodate = p_DeliveryPhotoDate,
        arrivaltime       = COALESCE(arrivaltime, now()),  -- delivered-at (idempotent)
        deliverystatus    = 'Delivered'
    WHERE shavingsorderid = p_ShavingsOrderId;
END;
$function$;
