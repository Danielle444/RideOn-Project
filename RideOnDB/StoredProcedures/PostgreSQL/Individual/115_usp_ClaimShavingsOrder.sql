CREATE OR REPLACE FUNCTION public.usp_claimshavingsorder(p_shavingsorderid integer, p_workersystemuserid integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.shavingsorder
    SET workersystemuserid = p_WorkerSystemUserId,
        responsetime       = now()           -- "seen by worker" clock; deliverystatus untouched (stays 'Pending')
    WHERE shavingsorderid = p_ShavingsOrderId
      AND workersystemuserid IS NULL;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$function$;
