-- payer_proc212_self_service_split.sql
-- ============================================================================
-- Phase C migration package for fix/payer-proc212-self-service-hardening.
-- NOT YET APPLIED -- for review only. See the audit trail in
-- 212_usp_GetPayerCompetitionAccount.sql, 250_usp_GetPayerCompetitionAccountBody.sql,
-- and 251_usp_GetMyPayerCompetitionAccount.sql for full context.
--
-- One logical change, applied atomically (Postgres DDL is transactional --
-- all four statement groups below succeed or none do):
--   1. Create the shared body function (no authorization logic).
--   2. Create the new self-service entry point (Approved-Payer-role check,
--      no personmanagedbysystemuser).
--   3. Replace the existing Admin proc's body ONLY -- same 4-arg signature,
--      same personmanagedbysystemuser check, unchanged -- to delegate to #1.
--   4. Revoke EXECUTE from PUBLIC/anon/authenticated/service_role on ALL
--      THREE functions (Oren's explicit security decision: Proc 212's
--      pre-existing RPC exposure is not left behind as a follow-up).
--
-- Order matters only for statement 3's runtime correctness (a plpgsql body
-- is not resolved against callees until first execution, but creating the
-- callee first removes any doubt) -- 1 and 2 both reference nothing that
-- doesn't already exist, so this order is safe regardless.
-- ============================================================================

-- 1. Shared body -- verbatim content, see 250_usp_GetPayerCompetitionAccountBody.sql
--    for the exact function body (omitted here for length; apply that file's
--    CREATE FUNCTION statement as-is).

-- 2. Self-service entry point -- verbatim content, see
--    251_usp_GetMyPayerCompetitionAccount.sql for the exact function body
--    (omitted here for length; apply that file's CREATE FUNCTION statement
--    as-is).

-- 3. Admin proc -- body-only replace, same signature -- see
--    212_usp_GetPayerCompetitionAccount.sql for the exact CREATE OR REPLACE
--    statement (omitted here for length; apply that file's statement as-is).

-- 4. ACL hardening -- all three functions, all four grantees.
REVOKE EXECUTE ON FUNCTION public.usp_getpayercompetitionaccount(integer, integer, integer, integer)
    FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.usp_getpayercompetitionaccount_body(integer, integer, integer)
    FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.usp_getmypayercompetitionaccount(integer, integer, integer)
    FROM PUBLIC, anon, authenticated, service_role;

-- No GRANT statement is needed for the owning DB role (postgres) -- object
-- owners retain EXECUTE on their own objects regardless of REVOKE statements
-- targeting other grantees. This was confirmed against live pg_roles before
-- writing this migration: RideOnServer's Npgsql connection authenticates
-- directly as that owning role and never presents anon/authenticated/
-- service_role credentials, so it is unaffected by any of the four REVOKEs
-- above.
-- ============================================================================
