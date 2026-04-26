CREATE OR REPLACE FUNCTION usp_ClaimShavingsOrder(
    p_ShavingsOrderId    INTEGER,
    p_WorkerSystemUserId INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.shavingsorder
    SET workersystemuserid = p_WorkerSystemUserId
    WHERE shavingsorderid = p_ShavingsOrderId
      AND workersystemuserid IS NULL;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;
