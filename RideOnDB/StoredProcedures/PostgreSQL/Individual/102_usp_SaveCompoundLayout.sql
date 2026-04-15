CREATE OR REPLACE FUNCTION usp_SaveCompoundLayout(
    p_RanchId    INTEGER,
    p_CompoundId SMALLINT,
    p_Layout     JSONB
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_enriched_layout JSONB;
BEGIN
    -- Enrich each cell with stallId by matching stallname to stallNumber
    SELECT jsonb_set(
        p_Layout,
        '{cells}',
        (
            SELECT COALESCE(jsonb_agg(
                CASE
                    WHEN (cell->>'stallNumber') IS NOT NULL
                         AND (cell->>'isEntrance')::boolean = false
                    THEN jsonb_set(cell, '{stallId}', to_jsonb(s.stallid))
                    ELSE cell
                END
            ), '[]'::jsonb)
            FROM jsonb_array_elements(p_Layout->'cells') cell
            LEFT JOIN public.stall s
                ON s.ranchid    = p_RanchId
                AND s.compoundid = p_CompoundId
                AND s.stallname  = cell->>'stallNumber'
        )
    ) INTO v_enriched_layout;

    UPDATE public.stallcompound
    SET layout = COALESCE(v_enriched_layout, p_Layout)
    WHERE ranchid = p_RanchId AND compoundid = p_CompoundId;
END;
$$;
