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

    UPDATE personmanagedbysystemuser
    SET approvalstatus = p_answerstatus,
        updatedate = NOW()
    WHERE systemuserid = p_systemuserid
      AND personid = p_personid
      AND approvalstatus = 'Pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending managed payer request not found';
    END IF;
END;
$function$
