-- ============================================================================
-- usp_answermanagedpayerrequest - payer answers a Pending managed-payer request
-- ============================================================================
-- Added on feat/managed-payer-approval-flow (2026-08-07), closing the gap
-- found by the "Admin/Payer managed-payer relationship" audit: an
-- Admin-initiated usp_requestmanagedpayer call always created a
-- personmanagedbysystemuser row with approvalstatus='Pending', but no proc,
-- endpoint, or screen anywhere ever transitioned it out of Pending. Every
-- downstream authorization gate (usp_admincreateentry,
-- usp_admincancelstallbooking, usp_admineditstallbooking,
-- usp_admincancelshavingsorder, usp_getchangeentryrequestauthorizationcontext,
-- usp_insertchangeentryrequestadminranchsecured, usp_getpayercompetitionaccount,
-- usp_getcompetitionpayersbysystemuser, usp_getregistrationstepstatus) already
-- correctly required approvalstatus='Approved', so the admin was genuinely
-- blocked -- the row just had no path forward.
--
-- Only transitions FROM 'Pending' TO 'Approved' or 'Rejected'. Answering an
-- Approved or already-Rejected row raises (NOT FOUND), matching this proc's
-- exact WHERE-clause scoping by (systemuserid, personid) -- the same pair
-- personmanagedbysystemuser's primary key enforces, so there can never be
-- more than one row to answer per admin/payer pair.
--
-- Authorization is enforced at the caller (PayersController.
-- AnswerPayerManagerRequest): the JWT-authenticated currentPersonId must
-- equal the payer's own personId. p_personid here is never client-suppliable
-- independent of that check -- an admin can never answer their own request.
--
-- MODIFIED on fix/payer-manager-same-ranch-rule (P0, not yet applied live --
-- see that branch's report before deploying). New business rule: an admin
-- may only manage a payer when both hold an Approved role at the SAME
-- ranch (admin "אדמין חווה", payer "משלם"). This proc had zero ranch logic
-- before this change -- it is the only place that can gate the
-- Payer-approval direction, since the answer DTO carries no ranchId and the
-- controller performs no ranch check at all (see AnswerPayerManagerRequest
-- in PayersController.cs). The guard runs ONLY on the Approved path --
-- Rejected keeps its exact prior behavior. Existing-row/not-found detection
-- was pulled out ahead of the guard so a request that doesn't exist (or
-- isn't Pending) still raises the original, more specific
-- "Pending managed payer request not found" instead of a same-ranch error
-- that would be misleading when there is no pending row at all. Signature
-- and the Rejected path are otherwise byte-identical to the pre-existing
-- live definition -- safe as a plain CREATE OR REPLACE.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_answermanagedpayerrequest(
    p_personid integer,
    p_systemuserid integer,
    p_answerstatus character varying
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_answerstatus NOT IN ('Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid answer status';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM personmanagedbysystemuser
        WHERE systemuserid = p_systemuserid
          AND personid = p_personid
          AND approvalstatus = 'Pending'
    ) THEN
        RAISE EXCEPTION 'Pending managed payer request not found';
    END IF;

    IF p_answerstatus = 'Approved' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM personranchrole admin_prr
            JOIN role admin_r ON admin_r.roleid = admin_prr.roleid
            JOIN personranchrole payer_prr ON payer_prr.ranchid = admin_prr.ranchid
            JOIN role payer_r ON payer_r.roleid = payer_prr.roleid
            WHERE admin_prr.personid = p_systemuserid
              AND admin_prr.rolestatus = 'Approved'
              AND admin_r.rolename = 'אדמין חווה'
              AND payer_prr.personid = p_personid
              AND payer_prr.rolestatus = 'Approved'
              AND payer_r.rolename = 'משלם'
        ) THEN
            RAISE EXCEPTION 'No shared approved ranch between admin and payer';
        END IF;
    END IF;

    UPDATE personmanagedbysystemuser
    SET approvalstatus = p_answerstatus,
        updatedate = NOW()
    WHERE systemuserid = p_systemuserid
      AND personid = p_personid
      AND approvalstatus = 'Pending';
END;
$function$
