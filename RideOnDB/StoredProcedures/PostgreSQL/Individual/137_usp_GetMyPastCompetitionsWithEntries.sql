-- ============================================================================
-- usp_GetMyPastCompetitionsWithEntries
-- ============================================================================
-- Returns all competitions (excluding the currently-active one) where the
-- given systemuser has at least 1 active entry. Used by the "duplicate from
-- past competition" feature in the admin mobile flow.
--
-- HOW TO APPLY: copy this whole file into Supabase SQL editor and Run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_getmypastcompetitionswithentries(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getmypastcompetitionswithentries(
    p_orderedbysystemuserid  integer,
    p_excludecompetitionid   integer
)
RETURNS TABLE (
    competitionid           integer,
    competitionname         varchar,
    competitionstartdate    date,
    competitionenddate      date,
    hostranchname           varchar,
    entrycount              integer
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        c.competitionid,
        c.competitionname::varchar,
        c.competitionstartdate,
        c.competitionenddate,
        r.ranchname::varchar                       AS hostranchname,
        COUNT(e.entryid)::integer                  AS entrycount
    FROM public.competition c
    JOIN public.ranch r
        ON r.ranchid = c.hostranchid
    JOIN public.classincompetition cic
        ON cic.competitionid = c.competitionid
    JOIN public.entry e
        ON e.classincompid = cic.classincompid
    JOIN public.servicerequest sr
        ON sr.srequestid = e.entryid
    WHERE sr.orderedbysystemuserid = p_orderedbysystemuserid
      AND c.competitionid <> p_excludecompetitionid
      AND COALESCE(e.entrystatus, 'Active') = 'Active'
    GROUP BY
        c.competitionid,
        c.competitionname,
        c.competitionstartdate,
        c.competitionenddate,
        r.ranchname
    HAVING COUNT(e.entryid) > 0
    ORDER BY c.competitionstartdate DESC;
$$;
