CREATE OR REPLACE FUNCTION usp_CreateCompoundWithStalls(
    "RanchId"       INTEGER,
    "CompoundName"  TEXT,
    "NumberOfStalls" SMALLINT,
    "StallType"     SMALLINT
)
RETURNS TABLE("NewCompoundId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_compound_id SMALLINT;
    i             SMALLINT;
BEGIN
    SELECT COALESCE(MAX(sc.compoundid), 0) + 1 INTO v_compound_id
    FROM stallcompound sc WHERE sc.ranchid = "RanchId";

    INSERT INTO stallcompound (ranchid, compoundid, compoundname)
    VALUES ("RanchId", v_compound_id, "CompoundName");

    FOR i IN 1.."NumberOfStalls" LOOP
        INSERT INTO stall (ranchid, compoundid, stallid, stallnumber, stalltype)
        VALUES ("RanchId", v_compound_id, i, CAST(i AS TEXT), "StallType");
    END LOOP;

    RETURN QUERY SELECT v_compound_id AS "NewCompoundId";
END;
$$;
