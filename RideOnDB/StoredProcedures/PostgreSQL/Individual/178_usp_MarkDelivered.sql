CREATE OR REPLACE FUNCTION public.usp_markdelivered(p_shavingsorderid integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.shavingsorder
    SET arrivaltime    = COALESCE(arrivaltime, now()),
        deliverystatus = 'Delivered'
    WHERE shavingsorderid = p_ShavingsOrderId
      AND arrivaltime IS NULL;          -- idempotent; don't re-stamp an already-delivered order

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$function$;
