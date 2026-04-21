CREATE OR REPLACE FUNCTION usp_DeleteClassInCompetition(
    p_ClassInCompId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM entry WHERE classincompid = p_ClassInCompId) THEN
        RAISE EXCEPTION 'Cannot delete class: There are registered entries.';
    END IF;

    DELETE FROM classprize WHERE classincompid = p_ClassInCompId;
    DELETE FROM classjudge  WHERE classincompid = p_ClassInCompId;
    DELETE FROM classincompetition WHERE classincompid = p_ClassInCompId;
END;
$$;
