CREATE OR REPLACE FUNCTION usp_DeleteClassInCompetition(
    "ClassInCompId" INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM entry WHERE classincompid = "ClassInCompId") THEN
        RAISE EXCEPTION 'Cannot delete class: There are registered entries.';
    END IF;

    DELETE FROM classprize WHERE classincompid = "ClassInCompId";
    DELETE FROM classjudge  WHERE classincompid = "ClassInCompId";
    DELETE FROM classincompetition WHERE classincompid = "ClassInCompId";
END;
$$;
