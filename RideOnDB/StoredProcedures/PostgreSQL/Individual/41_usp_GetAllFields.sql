CREATE OR REPLACE FUNCTION usp_GetAllFields()
RETURNS TABLE("FieldId" SMALLINT, "FieldName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT f.fieldid, f.fieldname FROM field f ORDER BY f.fieldname;
END;
$$;
