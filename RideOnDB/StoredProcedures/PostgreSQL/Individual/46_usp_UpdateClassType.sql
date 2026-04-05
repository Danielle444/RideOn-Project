CREATE OR REPLACE FUNCTION usp_UpdateClassType(
    "ClassTypeId"              SMALLINT,
    "FieldId"                  SMALLINT,
    "ClassName"                TEXT,
    "JudgingSheetFormat"       TEXT,
    "QualificationDescription" TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE classtype SET
        fieldid                  = "FieldId",
        classname                = "ClassName",
        judgingsheetformat       = "JudgingSheetFormat",
        qualificationdescription = "QualificationDescription"
    WHERE classtypeid = "ClassTypeId";
END;
$$;
