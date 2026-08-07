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
-- p_HcRejectionReason is passed through as-is. Trimming and the
-- non-empty check are the BL layer's responsibility
-- (HorseParticipationInCompetition.RejectHealthCertificate), matching how
-- SaveHealthCertificate/ApproveHealthCertificate validate their own
-- arguments in C#, not in SQL -- the TRIM(...) <> '' check below is
-- defense-in-depth via the table CHECK constraint
-- (ck_horseparticipationincompetition_approvalconsistency), not the primary
-- gate.
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
    v_RowCount INTEGER;
BEGIN
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
