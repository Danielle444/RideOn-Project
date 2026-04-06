CREATE OR REPLACE FUNCTION usp_InsertClassType(
    p_FieldId                  SMALLINT,
    p_ClassName                TEXT,
    p_JudgingSheetFormat       TEXT,
    p_QualificationDescription TEXT DEFAULT NULL
)
RETURNS TABLE("NewClassTypeId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id SMALLINT;
BEGIN
    INSERT INTO classtype (fieldid, classname, judgingsheetformat, qualificationdescription)
    VALUES (p_FieldId, p_ClassName, p_JudgingSheetFormat, p_QualificationDescription)
    RETURNING classtypeid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewClassTypeId";
END;
$$;
