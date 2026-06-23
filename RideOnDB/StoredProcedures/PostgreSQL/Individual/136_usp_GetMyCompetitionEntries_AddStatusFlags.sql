-- ============================================================================
-- usp_GetMyCompetitionEntryStatusFlags
-- ============================================================================
-- Companion SP for usp_getmycompetitionentries.
-- Returns 4 status flags per entry so the admin mobile card can display:
--   - badge: ממתין לאישור מזכירה / בוטל
--   - grayed-out + line-through price
--   - hidden edit/cancel buttons (locked)
--
-- WHY a separate SP: the main usp_getmycompetitionentries body is not in the
-- repo (Supabase-only). Writing a replacement blind would risk breaking joins.
-- This companion is called by DAL after the main SP and merged by entryid.
--
-- HOW TO APPLY: copy this whole file into Supabase SQL editor and Run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_getmycompetitionentrystatusflags(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getmycompetitionentrystatusflags(
    p_competitionid           integer,
    p_orderedbysystemuserid   integer
)
RETURNS TABLE (
    entryid                  integer,
    entrystatus              varchar,
    iscancelledafterstart    boolean,
    haspendingcancellation   boolean,
    haspendingchange         boolean
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        e.entryid,

        COALESCE(e.entrystatus, 'Active')::varchar                    AS entrystatus,

        -- Derived: cancelled, and the cancellation timestamp is on/after the
        -- competition's start date. There is no stored iscancelledafterstart
        -- column on entry (verified against live schema).
        (
            e.cancelledat IS NOT NULL
            AND e.cancelledat >= c.competitionstartdate::timestamp with time zone
        )                                                             AS iscancelledafterstart,

        EXISTS (
            SELECT 1
            FROM public.changeentryrequest cer
            WHERE cer.originalentryid = e.entryid
              AND cer.status = 'Pending'
              AND cer.iscancelled = TRUE
        )                                                             AS haspendingcancellation,

        EXISTS (
            SELECT 1
            FROM public.changeentryrequest cer
            WHERE cer.originalentryid = e.entryid
              AND cer.status = 'Pending'
              AND cer.iscancelled = FALSE
        )                                                             AS haspendingchange

    FROM public.entry e
    JOIN public.classincompetition cic
        ON cic.classincompid = e.classincompid
    JOIN public.competition c
        ON c.competitionid = cic.competitionid
    JOIN public.servicerequest sr
        ON sr.srequestid = e.entryid
    WHERE cic.competitionid = p_competitionid
      AND sr.orderedbysystemuserid = p_orderedbysystemuserid;
$$;
