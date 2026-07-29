-- =============================================================================
-- usp_GetRealHorsesByRanch
-- Bounded, real-horse-only lookup for on-demand horse pickers.
--
-- CAP-1 (SPEC-mobile-horse-picker-performance). The mobile admin registration
-- horse picker used to load the entire ranch horse table at screen load. Ranch
-- 11 (Double K) holds 8,871 rows of which only 69 carry a federation number —
-- the other 8,802 are fabricated historical-import "ghost" horses. This proc
-- returns only the real ones and caps every result set at 200 rows.
--
-- A SEPARATE SIBLING of usp_gethorsesbyranch, deliberately NOT a new parameter
-- on it: the C# DAL binds its Dictionary POSITIONALLY (@p1, @p2…), so adding a
-- parameter would shift every existing caller's binding. usp_gethorsesbyranch
-- is untouched and still serves AdminHorsesScreen (the full horse-management
-- list) and the paid-time preload.
--
-- Mirrors the live usp_gethorsesbyranch body (captured via pg_get_functiondef
-- 2026-07-29) — same 9 output columns, same ranch predicate, same 4-column
-- ILIKE search, same ORDER BY h.horsename — and differs ONLY by:
--   * the real-horse filter: btrim(coalesce(federationnumber,'')) <> ''
--   * LIMIT v_limit on BOTH branches (empty/null search and searched)
-- Keeping the same result shape means HorseListItem maps identically.
--
-- v_limit is a single literal at the top so the bound is trivially tunable.
-- 200 is generous: the largest known real stock is 69 (ranch 11), so the
-- on-open list shows every real horse while still bounding a pathological ranch.
--
-- Unlike usp_gethorsesbyranch, an EMPTY search string is treated as "no search"
-- (not as an ILIKE '%%'), so the picker's cleared search box returns the
-- bounded default list.
--
-- Deployed 2026-07-29 via migration `add_usp_getrealhorsesbyranch`; the body
-- below is pg_get_functiondef output, re-read live after apply.
-- Verified live on ranch 11: NULL search -> 69 rows / 0 ghosts,
-- '' -> 69 / 0, 'a' -> 48 / 0, while usp_gethorsesbyranch(11, NULL) still
-- returns all 8,871.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.usp_getrealhorsesbyranch(p_ranchid integer, p_search_text character varying DEFAULT NULL::character varying)
 RETURNS TABLE("HorseId" integer, "RanchId" integer, "RanchName" character varying, "HorseName" character varying, "BarnName" character varying, "FederationNumber" character varying, "ChipNumber" character varying, "BirthYear" smallint, "Gender" character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_limit constant integer := 200;
BEGIN
    IF p_search_text IS NULL OR btrim(p_search_text) = '' THEN
        RETURN QUERY
        SELECT
            h.horseid,
            h.ranchid,
            r.ranchname,
            h.horsename,
            h.barnname,
            h.federationnumber,
            h.chipnumber,
            h.birthyear,
            h.gender
        FROM horse h
        INNER JOIN ranch r
            ON r.ranchid = h.ranchid
        WHERE h.ranchid = p_ranchid
          AND btrim(coalesce(h.federationnumber, '')) <> ''
        ORDER BY h.horsename
        LIMIT v_limit;
    ELSE
        RETURN QUERY
        SELECT
            h.horseid,
            h.ranchid,
            r.ranchname,
            h.horsename,
            h.barnname,
            h.federationnumber,
            h.chipnumber,
            h.birthyear,
            h.gender
        FROM horse h
        INNER JOIN ranch r
            ON r.ranchid = h.ranchid
        WHERE h.ranchid = p_ranchid
          AND btrim(coalesce(h.federationnumber, '')) <> ''
          AND (
                h.horsename ILIKE '%' || p_search_text || '%'
                OR h.barnname ILIKE '%' || p_search_text || '%'
                OR h.federationnumber ILIKE '%' || p_search_text || '%'
                OR h.chipnumber ILIKE '%' || p_search_text || '%'
              )
        ORDER BY h.horsename
        LIMIT v_limit;
    END IF;
END;
$function$
