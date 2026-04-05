CREATE OR REPLACE FUNCTION usp_DeleteField(
    "FieldId" SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM competition c WHERE c.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot delete field: There are competitions associated with this field.';
    END IF;
    IF EXISTS (SELECT 1 FROM classtype ct WHERE ct.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot delete field: There are class types associated with this field.';
    END IF;
    IF EXISTS (SELECT 1 FROM judgefield jf WHERE jf.fieldid = "FieldId") THEN
        RAISE EXCEPTION 'Cannot delete field: There are judges qualified for this field.';
    END IF;

    DELETE FROM field WHERE fieldid = "FieldId";
END;
$$;
