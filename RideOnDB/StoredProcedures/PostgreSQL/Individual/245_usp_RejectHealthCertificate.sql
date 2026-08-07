-- 245_usp_RejectHealthCertificate.sql
--
-- Health Certificate rejection foundation. Sibling of
-- 186_usp_ApproveHealthCertificate.sql: same eligibility guard (row exists,
-- hcpath present and non-blank, hcapprovalstatus = 'Pending'), same
-- RETURNS BOOLEAN / row-count contract, same DAL pattern this codebase
-- already uses for this proc family (ExecuteScalar + `result is bool`).
--
-- Only Pending -> Rejected is possible here. There is no Rejected -> Approved
-- or Approved -> Rejected path -- the locked business model treats Pending as
-- the only eligible source state for either terminal action, matching
-- usp_ApproveHealthCertificate's own guard exactly.
--
-- ============================================================================
-- SECURITY HARDENING (2026-08-07, same day as the initial version, BEFORE any
-- live deployment -- this proc has never been created live in its unguarded
-- form).
--
-- The initial version took p_HcRejectedBySystemUserId but never verified it,
-- relying ENTIRELY on HorsesController for authorization. Every proc in this
-- public schema has EXECUTE granted to anon/authenticated via schema-level
-- default privileges (confirmed live via pg_default_acl, 2026-08-07), and the
-- Supabase anon/publishable key is embedded directly in both client apps
-- (supabaseClient.js) -- genuinely public, extractable from any app bundle.
-- Every public-schema function with EXECUTE granted to those roles is
-- auto-exposed by PostgREST as an RPC endpoint
-- (POST /rest/v1/rpc/usp_rejecthealthcertificate). An unguarded body would
-- therefore have let ANY caller holding that public key reject an arbitrary
-- horse's certificate on an arbitrary competition, supplying any
-- p_HcRejectedBySystemUserId value, with a single unauthenticated-relative-
-- to-this-app HTTP call -- a full bypass of HorsesController's HostSecretary
-- role check and host-ranch cross-check. "The app never calls Supabase RPC
-- directly" is not a control; the public key makes the endpoint reachable
-- regardless of what the app does.
--
-- Hardened using the exact RN001 convention and personranchrole/role check
-- already established by the worker shavings-mutation-authorization fix (P0,
-- 2026-08-06/07 -- see 115_usp_ClaimShavingsOrder.sql, and 241/242's
-- original introduction of the convention). Signature is UNCHANGED
-- (p_HcRejectedBySystemUserId already existed in the initial version) -- only
-- the body gained guards, so this remains a plain CREATE OR REPLACE, no DROP
-- needed.
--
-- p_HcRejectedBySystemUserId is checked against personranchrole.personid, not
-- a systemuser-keyed table -- for the same reason 115's header documents at
-- length: systemuser.systemuserid is created equal to person.personid for
-- the same individual (usp_RegisterSystemUserWithRoles inserts both from the
-- same captured id), and the JWT "PersonId" claim -- forwarded unchanged by
-- HorsesController as the rejecting system user id, exactly like
-- ApproveHealthCertificate's existing approverSystemUserId -- is populated
-- from usp_GetSystemUserForLogin's systemuserid column. This is an
-- application-level invariant already verified live for this exact join
-- shape in 115; not re-derived here.
--
-- The host ranch is derived from p_CompetitionId INSIDE this function
-- (competition.hostranchid) and is NEVER accepted as a parameter -- there is
-- nothing for a caller to spoof, because no ranch id is ever taken as input.
-- This is stricter than HorsesController's own check, which trusts a
-- client-supplied RanchId cross-checked against the competition; this proc
-- trusts nothing supplied by the caller except the identity to verify.
-- ============================================================================
--
-- Depends on migration add_health_certificate_rejection_columns.sql having
-- already run (hcrejectionreason/hcrejectiondate/hcrejectedbysystemuserid
-- columns and the tightened CHECK constraint must exist first, or this
-- UPDATE will fail with an undefined-column error).
--
-- NOT YET APPLIED LIVE as of this commit. Proc number 245 chosen after
-- re-fetching origin/main (tip bab8cf6) and confirming no worktree in this
-- workspace claims 245 or higher; 244 was independently confirmed already
-- committed to origin/main (usp_GetStallAssignmentsForCompetitionPayer, the
-- Payer stall-map work) at the time this file was written.

CREATE OR REPLACE FUNCTION public.usp_RejectHealthCertificate(
    p_HorseId                  INTEGER,
    p_CompetitionId             INTEGER,
    p_HcRejectedBySystemUserId  INTEGER,
    p_HcRejectionDate           DATE,
    p_HcRejectionReason         CHARACTER VARYING
)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    v_HostRanchId INTEGER;
    v_RowCount    INTEGER;
BEGIN
    IF p_HorseId IS NULL OR p_HorseId <= 0 THEN
        RAISE EXCEPTION 'Invalid horse id' USING ERRCODE = 'RN001';
    END IF;

    IF p_CompetitionId IS NULL OR p_CompetitionId <= 0 THEN
        RAISE EXCEPTION 'Invalid competition id' USING ERRCODE = 'RN001';
    END IF;

    IF p_HcRejectedBySystemUserId IS NULL OR p_HcRejectedBySystemUserId <= 0 THEN
        RAISE EXCEPTION 'Invalid rejecting system user id' USING ERRCODE = 'RN001';
    END IF;

    IF p_HcRejectionReason IS NULL OR TRIM(p_HcRejectionReason) = '' THEN
        RAISE EXCEPTION 'Rejection reason is required' USING ERRCODE = 'RN001';
    END IF;

    -- Authoritative host ranch, derived here -- never trust a caller-supplied
    -- ranch id (this function does not even accept one).
    SELECT c.hostranchid INTO v_HostRanchId
    FROM public.competition c
    WHERE c.competitionid = p_CompetitionId;

    IF v_HostRanchId IS NULL THEN
        RAISE EXCEPTION 'Competition not found' USING ERRCODE = 'RN001';
    END IF;

    -- The caller must hold an Approved HostSecretary role at the competition's
    -- OWN host ranch -- the same rule HorsesController.RejectHealthCertificate
    -- already enforces in C#, re-verified here so a direct RPC call that
    -- bypasses the controller entirely cannot skip it.
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_HcRejectedBySystemUserId
          AND prr.ranchid = v_HostRanchId
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'מזכירת חווה מארחת'
    ) THEN
        RAISE EXCEPTION 'Caller is not an approved host secretary for this competition''s host ranch' USING ERRCODE = 'RN001';
    END IF;

    UPDATE public.horseparticipationincompetition
    SET
        hcapprovalstatus         = 'Rejected',
        hcrejectionreason        = p_HcRejectionReason,
        hcrejectiondate          = p_HcRejectionDate,
        hcrejectedbysystemuserid = p_HcRejectedBySystemUserId
    WHERE horseid          = p_HorseId
      AND competitionid    = p_CompetitionId
      AND hcapprovalstatus = 'Pending'
      AND hcpath IS NOT NULL
      AND TRIM(hcpath) <> '';

    GET DIAGNOSTICS v_RowCount = ROW_COUNT;

    RETURN v_RowCount = 1;
END;
$$;
