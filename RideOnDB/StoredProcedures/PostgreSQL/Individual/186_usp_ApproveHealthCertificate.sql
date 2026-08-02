-- 186_usp_ApproveHealthCertificate.sql
--
-- Health Certificates C1 -- approval eligibility guard.
--
-- Supersedes 119_usp_ApproveHealthCertificate.sql AS THE DEPLOYED DEFINITION.
-- 119 is left in place, unmodified, as a historical record of the prior
-- signature -- do not delete or rename it, and do not re-run it.
--
-- RETURN TYPE CHANGE: VOID -> BOOLEAN. This is not a CREATE OR REPLACE-able
-- change (Postgres rejects a return-type change on an existing function with
-- 42P13), so deployment is DROP FUNCTION + CREATE FUNCTION for this exact
-- overload, in one transaction/migration so the function is never left
-- missing if CREATE fails.
--
-- PROBLEM (Health Certificates C1): the previous body unconditionally
-- UPDATEd horseparticipationincompetition on any (horseid, competitionid)
-- match, with no WHERE-clause check on row existence, hcpath, or
-- hcapprovalstatus, and RETURNED VOID -- giving the C# caller nothing to
-- test. Combined with the DAL discarding ExecuteNonQuery()'s result, a
-- caller could "approve" a certificate that:
--   - did not exist for that horse/competition at all (0 rows silently
--     updated, no error);
--   - had never had a file uploaded (hcpath NULL);
--   - had an empty or whitespace-only hcpath (schema permits it, no CHECK
--     constrains hcpath to be non-empty);
--   - was already Approved, or was Rejected;
-- and the HTTP layer would still return 200 in every one of those cases.
--
-- FIX: the WHERE clause now also requires hcapprovalstatus = 'Pending',
-- hcpath IS NOT NULL, and TRIM(hcpath) <> ''. The function returns TRUE only
-- when exactly one row was updated (the primary key (horseid, competitionid)
-- makes 0/1 the only possible outcomes), FALSE otherwise. No exception is
-- raised for the ineligible cases -- the boolean is the entire contract,
-- matching this codebase's existing scalar-return DAL pattern (ExecuteScalar
-- + Convert.ToBoolean, as already used for other boolean/scalar-returning
-- procs called via CreateCommandWithStoredProcedure).
--
-- The successful-approval side effects are UNCHANGED from 119: only
-- hcapprovalstatus, hcapprovaldate and hcapproversystemuserid are written.
-- No new column, no new parameter, no reordering of the existing four
-- parameters (p_HorseId, p_CompetitionId, p_HcApproverSystemUserId,
-- p_HcApprovalDate) -- the C# DAL binds these positionally via
-- CreateCommandWithStoredProcedure, so parameter ORDER is part of the
-- contract even though parameter NAMES are not read by the app.
--
-- Live dependency audit (2026-08-02, read-only, before DROP):
--   - pg_depend, refobjid = usp_approvehealthcertificate(integer,integer,
--     integer,date), refclassid = pg_proc: 0 rows. No view, trigger, other
--     function, rule or extension object depends on this function.
--   - pg_trigger, tgfoid = this function: 0 rows. Not used as a trigger
--     function.
--   - pg_proc.prosrc ILIKE '%approvehealthcertificate%' across all public
--     functions: 0 rows. No other stored procedure's body calls this one.
--   Conclusion: the only caller is the application (RideOnServer HorseDAL).
--   Safe to DROP + CREATE.
--
-- STATUS: deployed live 2026-08-02 via Supabase migration
-- health_certificate_c1_approval_guard, applied in the same batch as the
-- DROP. Verified post-deploy against pg_proc: proname
-- usp_approvehealthcertificate, args "p_horseid integer, p_competitionid
-- integer, p_hcapproversystemuserid integer, p_hcapprovaldate date",
-- returns boolean.

DROP FUNCTION IF EXISTS public.usp_approvehealthcertificate(integer, integer, integer, date);

CREATE FUNCTION public.usp_ApproveHealthCertificate(
    p_HorseId                INTEGER,
    p_CompetitionId          INTEGER,
    p_HcApproverSystemUserId INTEGER,
    p_HcApprovalDate         DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    v_RowCount INTEGER;
BEGIN
    UPDATE public.horseparticipationincompetition
    SET
        hcapprovalstatus       = 'Approved',
        hcapprovaldate         = p_HcApprovalDate,
        hcapproversystemuserid = p_HcApproverSystemUserId
    WHERE horseid          = p_HorseId
      AND competitionid    = p_CompetitionId
      AND hcapprovalstatus = 'Pending'
      AND hcpath IS NOT NULL
      AND TRIM(hcpath) <> '';

    GET DIAGNOSTICS v_RowCount = ROW_COUNT;

    RETURN v_RowCount = 1;
END;
$$;
