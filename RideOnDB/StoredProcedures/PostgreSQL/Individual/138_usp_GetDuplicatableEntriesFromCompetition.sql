-- ============================================================================
-- usp_GetDuplicatableEntriesFromCompetition
-- ============================================================================
-- Lists active entries from a SOURCE competition that the user wants to copy
-- into a TARGET competition. For each source entry, also tries to find a
-- matching class in the target competition (matched by classtypeid).
--
-- Output flags:
--   targetclassincompid  : NULL => no matching class in target competition
--   alreadyexists        : TRUE => same horse+rider already entered in
--                          target class (would be a duplicate)
--
-- The mobile UI uses these flags to disable / explain ineligible entries.
--
-- HOW TO APPLY: copy this whole file into Supabase SQL editor and Run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_getduplicatableentriesfromcompetition(
    integer, integer, integer
);

CREATE OR REPLACE FUNCTION public.usp_getduplicatableentriesfromcompetition(
    p_sourcecompetitionid    integer,
    p_targetcompetitionid    integer,
    p_orderedbysystemuserid  integer
)
RETURNS TABLE (
    sourceentryid             integer,
    sourceclassincompid       integer,
    sourceclassname           varchar,
    sourceclassdate           timestamptz,

    targetclassincompid       integer,
    targetclassname           varchar,
    targetclassdate           timestamptz,

    horseid                   integer,
    horsename                 varchar,
    barnname                  varchar,

    riderfederationmemberid   integer,
    ridername                 varchar,

    coachfederationmemberid   integer,
    coachname                 varchar,

    paidbypersonid            integer,
    payername                 varchar,

    prizerecipientname        varchar,

    alreadyexists             boolean
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        e.entryid                                                       AS sourceentryid,
        e.classincompid                                                 AS sourceclassincompid,
        ct_src.classname::varchar                                       AS sourceclassname,
        cic_src.classdatetime                                           AS sourceclassdate,

        cic_tgt.classincompid                                           AS targetclassincompid,
        ct_tgt.classname::varchar                                       AS targetclassname,
        cic_tgt.classdatetime                                           AS targetclassdate,

        sr.horseid,
        h.horsename::varchar,
        h.barnname::varchar,

        sr.riderfederationmemberid,
        (rider_p.firstname || ' ' || rider_p.lastname)::varchar         AS ridername,

        sr.coachfederationmemberid,
        CASE
            WHEN sr.coachfederationmemberid IS NULL THEN NULL
            ELSE (coach_p.firstname || ' ' || coach_p.lastname)::varchar
        END                                                             AS coachname,

        b.paidbypersonid,
        (payer_p.firstname || ' ' || payer_p.lastname)::varchar         AS payername,

        e.prizerecipientname::varchar,

        CASE
            WHEN cic_tgt.classincompid IS NULL THEN FALSE
            ELSE EXISTS (
                SELECT 1
                FROM public.entry e2
                JOIN public.servicerequest sr2
                    ON sr2.srequestid = e2.entryid
                WHERE e2.classincompid = cic_tgt.classincompid
                  AND sr2.horseid = sr.horseid
                  AND sr2.riderfederationmemberid = sr.riderfederationmemberid
                  AND COALESCE(e2.entrystatus, 'Active') = 'Active'
            )
        END                                                             AS alreadyexists

    FROM public.entry e
    JOIN public.servicerequest sr
        ON sr.srequestid = e.entryid
    JOIN public.classincompetition cic_src
        ON cic_src.classincompid = e.classincompid
    JOIN public.classtype ct_src
        ON ct_src.classtypeid = cic_src.classtypeid
    JOIN public.bill b
        ON b.billid = sr.billid
    JOIN public.horse h
        ON h.horseid = sr.horseid
    JOIN public.person rider_p
        ON rider_p.personid = sr.riderfederationmemberid
    LEFT JOIN public.person coach_p
        ON coach_p.personid = sr.coachfederationmemberid
    JOIN public.person payer_p
        ON payer_p.personid = b.paidbypersonid

    LEFT JOIN public.classincompetition cic_tgt
        ON cic_tgt.competitionid = p_targetcompetitionid
       AND cic_tgt.classtypeid   = cic_src.classtypeid
    LEFT JOIN public.classtype ct_tgt
        ON ct_tgt.classtypeid = cic_tgt.classtypeid

    WHERE cic_src.competitionid = p_sourcecompetitionid
      AND sr.orderedbysystemuserid = p_orderedbysystemuserid
      AND COALESCE(e.entrystatus, 'Active') = 'Active'
    ORDER BY cic_src.classdatetime;
$$;
