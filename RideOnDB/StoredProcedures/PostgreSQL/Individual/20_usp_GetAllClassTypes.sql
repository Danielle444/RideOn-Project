CREATE OR REPLACE FUNCTION usp_GetAllClassTypes(
    p_FieldId SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "ClassTypeId"              SMALLINT,
    "FieldId"                  SMALLINT,
    "FieldName"                TEXT,
    "ClassName"                TEXT,
    "QualificationDescription" TEXT,
    "JudgingSheetFormat"       TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.classtypeid,
        ct.fieldid,
        f.fieldname,
        ct.classname,
        ct.qualificationdescription,
        ct.judgingsheetformat
    FROM classtype ct
    INNER JOIN field f ON ct.fieldid = f.fieldid
    WHERE (p_FieldId IS NULL OR ct.fieldid = p_FieldId)
    ORDER BY f.fieldname ASC, ct.classname ASC;
END;
$$;
