-- 257_usp_GetPaidTimeCandidatesForCompetition.sql
--
-- NEW (HostSecretary Paid-Time creation, Slice B, 2026-08-07). Read-only.
-- Repo file renumbered 254 -> 257 (2026-08-07): 252-254 were claimed by
-- the Managed-Payer feature (usp_AnswerManagedPayerRequest,
-- usp_RequestManagedPayer, usp_GetManagingAdminsForPayer), and 255-256 by
-- this same audit's Slice A branch, both merging/landing after this
-- branch was created. Repo filename/number only -- the live function
-- name, signature, and body below are unchanged from what was already
-- deployed and verified live under this same function name.
--
-- Competition-wide sibling of the existing usp_getpaidtimecandidatesbyranch
-- (repo file 127), which hard-filters h.ranchid = p_RanchId. That proc is
-- left untouched -- it is the mobile RanchAdmin self-service candidate
-- source (feeds the paid-time "smart order"/chatbot flow). This one drops
-- the ranch filter and adds RanchId/RanchName output columns, so a
-- HostSecretary can create a paid-time request on behalf of any
-- participating ranch's horse/rider/coach/payer combination, not just her
-- own ranch's -- there was previously no HostSecretary-facing paid-time
-- request creation flow at all (confirmed by audit: the standalone web
-- Paid Time page only assigns/unassigns/transfers already-existing
-- requests; creation was exclusively a mobile RanchAdmin action).
--
-- Same base query as 127 otherwise (entry -> servicerequest ->
-- classincompetition -> horse -> rider/coach federationmember -> bill ->
-- payer), including its existing sr.coachfederationmemberid IS NOT NULL
-- requirement (a coach is mandatory for a paid-time candidate, matching
-- the existing mobile flow's own constraint) and its documented behavior
-- of returning one row per (horse, coach) combo without deduping across
-- multiple entries for the same horse -- the consumer distincts as needed,
-- unchanged from 127's own contract.
--
-- Live-verified 2026-08-07 (rollback-only, then applied): competition 78
-- returns 203 candidates across 22 ranches, vs. 53 for ranch 11 alone
-- under the old proc -- confirms the fix changes behavior and is
-- consistent with usp_GetParticipatingRanchesForCompetition's 22-ranch
-- result for the same competition (Slice A, proc 255).

CREATE OR REPLACE FUNCTION usp_GetPaidTimeCandidatesForCompetition(
    p_CompetitionId INTEGER
)
RETURNS TABLE(
    "EntryId"                  INTEGER,
    "ClassInCompId"            INTEGER,
    "HorseId"                  INTEGER,
    "HorseName"                TEXT,
    "BarnName"                 TEXT,
    "RanchId"                  INTEGER,
    "RanchName"                TEXT,
    "CoachFederationMemberId"  INTEGER,
    "CoachName"                TEXT,
    "RiderFederationMemberId"  INTEGER,
    "RiderName"                TEXT,
    "PaidByPersonId"           INTEGER,
    "PayerName"                TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.entryid,
        e.classincompid,
        h.horseid,
        h.horsename::TEXT,
        h.barnname::TEXT,
        h.ranchid,
        r.ranchname::TEXT,
        sr.coachfederationmemberid,
        (coach_p.firstname || ' ' || coach_p.lastname)::TEXT,
        sr.riderfederationmemberid,
        (rider_p.firstname || ' ' || rider_p.lastname)::TEXT,
        b.paidbypersonid,
        (payer_p.firstname || ' ' || payer_p.lastname)::TEXT
    FROM entry e
    INNER JOIN servicerequest sr
        ON sr.srequestid = e.entryid
    INNER JOIN classincompetition cic
        ON cic.classincompid = e.classincompid
    INNER JOIN horse h
        ON h.horseid = sr.horseid
    INNER JOIN ranch r
        ON r.ranchid = h.ranchid
    INNER JOIN federationmember rider_fm
        ON rider_fm.federationmemberid = sr.riderfederationmemberid
    INNER JOIN person rider_p
        ON rider_p.personid = rider_fm.federationmemberid
    LEFT JOIN federationmember coach_fm
        ON coach_fm.federationmemberid = sr.coachfederationmemberid
    LEFT JOIN person coach_p
        ON coach_p.personid = coach_fm.federationmemberid
    INNER JOIN bill b
        ON b.billid = sr.billid
    INNER JOIN person payer_p
        ON payer_p.personid = b.paidbypersonid
    WHERE cic.competitionid = p_CompetitionId
      AND sr.coachfederationmemberid IS NOT NULL
    ORDER BY
        r.ranchname,
        sr.coachfederationmemberid,
        h.horsename;
END;
$$;
