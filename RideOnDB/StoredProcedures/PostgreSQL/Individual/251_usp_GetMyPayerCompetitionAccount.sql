-- ============================================================================
-- usp_getmypayercompetitionaccount - self-service payer account view
-- ============================================================================
-- Added on fix/payer-proc212-self-service-hardening (2026-08-07), as part of
-- the payer-proc212-self-service audit. Root cause: PayersController's
-- GET /Payers/my-competition-account forced payerPersonId = currentPersonId
-- and called the SAME usp_getpayercompetitionaccount used by the Admin
-- "view a managed payer" screen -- whose only authorization check is
-- "does p_adminsystemuserid manage p_payerpersonid via
-- personmanagedbysystemuser". A legitimate, logged-in Payer who has no
-- self-managed personmanagedbysystemuser row (the normal case -- see the
-- audit: the only 53 live self-rows are a one-time 2026-03-25 bulk seed, not
-- a real self-registration mechanism) got a hard failure and the entire
-- account screen never loaded.
--
-- DOES NOT use personmanagedbysystemuser at all -- there is no "admin" in
-- this call, only the payer viewing their own data, so the managed-payer
-- relationship table is the wrong model entirely for this path (see the
-- audit's Q1/Q2).
--
-- SECURITY (read this before ever changing the guard below):
-- 1. PRIMARY boundary: EXECUTE on this function is revoked from
--    PUBLIC/anon/authenticated/service_role in the same migration that
--    creates it. It is reachable ONLY through RideOnServer's own DB
--    connection (which authenticates directly as the owning DB role, never
--    through PostgREST/anon/authenticated -- confirmed live, see the
--    migration's companion audit notes), and ONLY after
--    PayersController.GetMyCompetitionAccount has already verified, from a
--    real JWT, that the caller IS p_payerpersonid and holds an Approved
--    'משלם' role in p_ranchid via UserAccessValidator.EnsureUserHasRoleInRanch
--    (a fresh DB read, not a stale claim). p_payerpersonid is NEVER
--    client-suppliable on this path -- the controller forces it to
--    currentPersonId from the JWT, always.
-- 2. The Approved-Payer-role check immediately below is DEFENSE IN DEPTH
--    ONLY. It proves that the SUPPLIED p_payerpersonid holds an Approved
--    Payer role in p_ranchid -- it does NOT and CANNOT prove that whoever
--    is making this call IS that person. A caller who could invoke this
--    function directly (e.g. if the EXECUTE revoke above were ever
--    accidentally reverted) could still supply any real payer's id and
--    pass this check. Do not treat this guard as sufficient on its own --
--    the real boundary is #1. This was proven empirically during the audit:
--    Proc 245 (usp_RejectHealthCertificate) shipped with only this class of
--    guard and remained spoofable via direct RPC by anyone who knew a valid
--    id, until its own RPC exposure was separately investigated.
-- ============================================================================

CREATE FUNCTION public.usp_getmypayercompetitionaccount(p_competitionid integer, p_ranchid integer, p_payerpersonid integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    v_has_approved_payer_role boolean;
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_payerpersonid is null or p_payerpersonid <= 0 then
        raise exception 'Invalid payer person id';
    end if;

    select exists (
        select 1
        from public.personranchrole prr
        inner join public.role r
            on r.roleid = prr.roleid
        where prr.personid = p_payerpersonid
          and prr.ranchid = p_ranchid
          and prr.rolestatus = 'Approved'
          and r.rolename = 'משלם'
    )
    into v_has_approved_payer_role;

    if v_has_approved_payer_role = false then
        raise exception 'Payer does not hold an approved Payer role in this ranch';
    end if;

    return public.usp_getpayercompetitionaccount_body(p_competitionid, p_ranchid, p_payerpersonid);
end;
$function$
