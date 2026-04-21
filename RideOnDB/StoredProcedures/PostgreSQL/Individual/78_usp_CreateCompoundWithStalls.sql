CREATE OR REPLACE FUNCTION usp_CreateCompoundWithStalls(
    p_RanchId       INTEGER,
    p_CompoundName  TEXT,
    p_NumberOfStalls SMALLINT,
    p_StallType     SMALLINT
)
RETURNS TABLE("NewCompoundId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_compound_id SMALLINT;
    i             SMALLINT;
BEGIN
    SELECT COALESCE(MAX(sc.compoundid), 0) + 1 INTO v_compound_id
    FROM stallcompound sc WHERE sc.ranchid = p_RanchId;

    INSERT INTO stallcompound (ranchid, compoundid, compoundname)
    VALUES (p_RanchId, v_compound_id, p_CompoundName);

    FOR i IN 1..p_NumberOfStalls LOOP
        INSERT INTO stall (ranchid, compoundid, stallid, stallnumber, stalltype)
        VALUES (p_RanchId, v_compound_id, i, CAST(i AS TEXT), p_StallType);
    END LOOP;

    RETURN QUERY SELECT v_compound_id AS "NewCompoundId";
END;
$$;
