CREATE OR REPLACE FUNCTION usp_InsertClassType(
    "FieldId"                  SMALLINT,
    "ClassName"                TEXT,
    "JudgingSheetFormat"       TEXT,
    "QualificationDescription" TEXT DEFAULT NULL
)
RETURNS TABLE("NewClassTypeId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO classtype (fieldid, classname, judgingsheetformat, qualificationdescription)
    VALUES ("FieldId", "ClassName", "JudgingSheetFormat", "QualificationDescription")
    RETURNING classtypeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassTypeId";
END;
$$;
