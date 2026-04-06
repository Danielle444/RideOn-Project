CREATE OR REPLACE FUNCTION usp_UpdateField(
    p_FieldId   SMALLINT,
    p_FieldName TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE field SET fieldname = p_FieldName WHERE fieldid = p_FieldId;
END;
$$;
