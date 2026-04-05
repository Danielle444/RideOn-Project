CREATE OR REPLACE FUNCTION usp_InsertField(
    "FieldName" TEXT
)
RETURNS TABLE("NewFieldId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO field (fieldname) VALUES ("FieldName")
    RETURNING fieldid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewFieldId";
END;
$$;
