-- ============================================================================
-- usp_GetEntryFineDetails
-- ============================================================================
-- Companion SP to enrich existing entry queries with fine info.
-- Returns one or more rows per entry covering both sources:
--   - source = 'Entry'         → fine stamped on entry.fineid (e.g.
--                                LateRegistration set by trigger 154)
--   - source = 'ChangeRequest' → fine stamped on changeentryrequest.fineid
--                                (e.g. EntryCancellation set by trigger 153)
--
-- An entry can therefore appear up to twice (LateRegistration on creation +
-- EntryCancellation on cancel).
--
-- DAL merges by entryid + source. Existing entry SPs untouched.
--
-- HOW TO APPLY: paste into Supabase SQL editor and Run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_getentryfinedetails(integer);

CREATE OR REPLACE FUNCTION public.usp_getentryfinedetails(
    p_competitionid  integer
)
RETURNS TABLE (
    entryid     integer,
    source      varchar,
    fineid      integer,
    finename    varchar,
    fineamount  numeric,
    finereason  varchar
)
LANGUAGE sql
STABLE
AS $$
    -- Fines that live on the entry itself (e.g. LateRegistration)
    SELECT
        e.entryid,
        'Entry'::varchar          AS source,
        f.fineid,
        f.finename::varchar       AS finename,
        f.fineamount,
        f.finereason::varchar     AS finereason
    FROM public.entry e
    JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
    JOIN public.fine f ON f.fineid = e.fineid
    WHERE cic.competitionid = p_competitionid
      AND e.fineid IS NOT NULL

    UNION ALL

    -- Fines that live on a change/cancel request against the entry
    -- (use snapshot amount so historical value is preserved even if fine
    -- table edits the amount later)
    SELECT
        cer.originalentryid       AS entryid,
        'ChangeRequest'::varchar  AS source,
        cer.fineid,
        f.finename::varchar       AS finename,
        COALESCE(cer.fineamountsnapshot, f.fineamount)::numeric AS fineamount,
        f.finereason::varchar     AS finereason
    FROM public.changeentryrequest cer
    JOIN public.entry e ON e.entryid = cer.originalentryid
    JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
    JOIN public.fine f ON f.fineid = cer.fineid
    WHERE cic.competitionid = p_competitionid
      AND cer.fineid IS NOT NULL;
$$;
