-- ============================================================================
-- usp_getchangeentryrequestauthorizationcontext - read-only authorization
-- context for POST /api/ChangeEntryRequests (Stage 1 security hardening,
-- 2026-08-04)
-- ============================================================================
-- NEW PROC. Never called by any deployed code before this slice - a pure
-- addition, zero compatibility impact on anything already live.
--
-- Computes every fact ChangeEntryRequestsController.Create needs to classify
-- a request BEFORE calling the mutation SP, and is called a SECOND time from
-- inside usp_insertchangeentryrequestsecured (219) as an independent
-- SP-level re-check (defense-in-depth). One function, two callers - no
-- duplicated Model C SQL anywhere in the codebase.
--
-- ALWAYS RETURNS EXACTLY ONE ROW, even when the original/new entry does not
-- exist - every column is its own scalar subquery/EXISTS, never a JOIN that
-- could itself yield zero rows. This is deliberate: 219 calls this via
-- "SELECT * INTO v_ctx FROM usp_getchangeentryrequestauthorizationcontext(...)"
-- in plpgsql. If this function could return ZERO rows, v_ctx would come back
-- entirely NULL, and "IF NOT v_ctx.entryexists THEN" would evaluate
-- NOT NULL = NULL, which plpgsql treats as not-true (branch SKIPPED, not
-- entered) - silently defeating the not-found guard. Returning one row with
-- entryexists=false sidesteps that trap entirely.
--
-- OWNERSHIP MODEL ("Model C"), per the approved Stage 1 design: a RanchAdmin
-- may act on an Entry when EITHER
--   (a) they created it directly - servicerequest.orderedbysystemuserid = the
--       caller (the "creator" path); OR
--   (b) the Entry's payer (billcharge.paidbypersonid, sourcetype='Entry') is
--       Approved-managed by the caller (personmanagedbysystemuser) AND that
--       payer holds an Approved 'משלם' role in the Entry's ACTUAL host ranch
--       (personranchrole/role) - the "managed payer" path.
-- billcharge.paidbypersonid is used rather than bill.paidbypersonid per the
-- live consistency check run 2026-08-04 (zero rows disagree) and because it
-- is the same join usp_getregistrationstepstatus (220) already uses for the
-- identical Model C shape.
--
-- ROLE CHECK (isranchadmininhostranch, added per owner correction 2): purely
-- SQL-side re-derivation of whether the caller holds an Approved
-- 'אדמין חווה' role in the Entry's actual host ranch. This is a deliberate
-- SP-level duplicate of what UserAccessValidator.EnsureUserHasRoleInRanch
-- already proves in C# (which remains the primary, first-line check,
-- unchanged) - so that a bug or omission in the C# layer alone cannot let an
-- unauthorized write through 219.
--
-- New-entry fields are populated only when p_newentryid is not null (change
-- requests); for cancellations (p_newentryid null) they read as
-- false/null and the caller must simply not consult them.
-- ============================================================================

CREATE FUNCTION public.usp_getchangeentryrequestauthorizationcontext(
    p_originalentryid integer,
    p_newentryid      integer,
    p_competitionid   integer,
    p_personid        integer
)
RETURNS TABLE (
    entryexists                boolean,
    actualcompetitionid        integer,
    hostranchid                integer,
    competitionenddate         date,
    iscompetitionended         boolean,
    isranchadmininhostranch    boolean,
    iscreatedbyadmin           boolean,
    isownedthroughmanagedpayer boolean,
    iswithinmodelcscope        boolean,
    newentryexists             boolean,
    newentrycompetitionid      integer,
    newentryhostranchid        integer,
    newentrycreatedbyadmin     boolean
)
LANGUAGE sql
STABLE
AS $function$
WITH original AS (
    SELECT
        e.entryid,
        cic.competitionid,
        c.hostranchid,
        c.competitionenddate
    FROM public.entry e
    JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
    JOIN public.competition c ON c.competitionid = cic.competitionid
    WHERE e.entryid = p_originalentryid
),
newentry AS (
    SELECT
        e.entryid,
        cic.competitionid,
        c.hostranchid,
        sr.orderedbysystemuserid
    FROM public.entry e
    JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
    JOIN public.competition c ON c.competitionid = cic.competitionid
    JOIN public.servicerequest sr ON sr.srequestid = e.entryid
    WHERE p_newentryid IS NOT NULL
      AND e.entryid = p_newentryid
),
checks AS (
    SELECT
        EXISTS (
            SELECT 1
            FROM public.personranchrole prr
            JOIN public.role r ON r.roleid = prr.roleid
            WHERE prr.personid = p_personid
              AND prr.ranchid = (SELECT hostranchid FROM original)
              AND prr.rolestatus = 'Approved'
              AND r.rolename = 'אדמין חווה'
        ) AS isranchadmininhostranch,
        EXISTS (
            SELECT 1
            FROM public.servicerequest sr
            WHERE sr.srequestid = p_originalentryid
              AND sr.orderedbysystemuserid = p_personid
        ) AS iscreatedbyadmin,
        EXISTS (
            SELECT 1
            FROM public.billcharge bc
            JOIN public.personmanagedbysystemuser pmsu ON pmsu.personid = bc.paidbypersonid
            JOIN public.personranchrole prr ON prr.personid = bc.paidbypersonid
            JOIN public.role r ON r.roleid = prr.roleid
            WHERE bc.sourcetype = 'Entry'
              AND bc.sourceid = p_originalentryid
              AND pmsu.systemuserid = p_personid
              AND pmsu.approvalstatus = 'Approved'
              AND prr.ranchid = (SELECT hostranchid FROM original)
              AND prr.rolestatus = 'Approved'
              AND r.rolename = 'משלם'
        ) AS isownedthroughmanagedpayer
)
SELECT
    EXISTS (SELECT 1 FROM original) AS entryexists,

    (SELECT competitionid FROM original) AS actualcompetitionid,
    (SELECT hostranchid FROM original) AS hostranchid,
    (SELECT competitionenddate FROM original) AS competitionenddate,

    COALESCE(
        (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > competitionenddate
         FROM original),
        false
    ) AS iscompetitionended,

    checks.isranchadmininhostranch,
    checks.iscreatedbyadmin,
    checks.isownedthroughmanagedpayer,
    (checks.iscreatedbyadmin OR checks.isownedthroughmanagedpayer) AS iswithinmodelcscope,

    EXISTS (SELECT 1 FROM newentry) AS newentryexists,
    (SELECT competitionid FROM newentry) AS newentrycompetitionid,
    (SELECT hostranchid FROM newentry) AS newentryhostranchid,
    COALESCE(
        (SELECT orderedbysystemuserid = p_personid FROM newentry),
        false
    ) AS newentrycreatedbyadmin
FROM checks
$function$;
