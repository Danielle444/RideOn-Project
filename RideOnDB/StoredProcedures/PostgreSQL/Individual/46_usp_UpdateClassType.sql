CREATE OR REPLACE FUNCTION usp_UpdateClassType(
    p_ClassTypeId              SMALLINT,
    p_FieldId                  SMALLINT,
    p_ClassName                TEXT,
    p_JudgingSheetFormat       TEXT,
    p_QualificationDescription TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classtype SET
        fieldid                  = p_FieldId,
        classname                = p_ClassName,
        judgingsheetformat       = p_JudgingSheetFormat,
        qualificationdescription = p_QualificationDescription
    WHERE classtypeid = p_ClassTypeId;
END;
$$;
