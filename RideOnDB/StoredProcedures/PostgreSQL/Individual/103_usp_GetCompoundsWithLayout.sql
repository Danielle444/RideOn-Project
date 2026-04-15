CREATE OR REPLACE FUNCTION usp_GetCompoundsWithLayout(
    p_RanchId INTEGER
)
RETURNS TABLE(
    "CompoundId"   SMALLINT,
    "CompoundName" VARCHAR,
    "Layout"       JSONB
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT sc.compoundid, sc.compoundname, sc.layout
    FROM public.stallcompound sc
    WHERE sc.ranchid = p_RanchId
    ORDER BY sc.compoundid;
END;
$$;
