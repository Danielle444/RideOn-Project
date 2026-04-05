CREATE OR REPLACE FUNCTION usp_UpdateField(
    "FieldId"   SMALLINT,
    "FieldName" TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE field SET fieldname = "FieldName" WHERE fieldid = "FieldId";
END;
$$;
