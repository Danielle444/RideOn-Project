CREATE OR REPLACE FUNCTION usp_DeleteClassType(
    p_ClassTypeId SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM classincompetition cic WHERE cic.classtypeid = p_ClassTypeId) THEN
        RAISE EXCEPTION 'Cannot delete class type: It is already used in existing or historical competitions.';
    END IF;
    DELETE FROM classtype WHERE classtypeid = p_ClassTypeId;
END;
$$;
