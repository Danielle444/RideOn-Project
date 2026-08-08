-- ============================================================================
-- usp_requestmanagedpayer - admin requests to manage a payer
-- ============================================================================
-- MODIFIED on feat/managed-payer-approval-flow (2026-08-07). Repo previously
-- had no copy of this proc at all (live-only, found by the managed-payer
-- relationship audit). Prior live behavior: if a personmanagedbysystemuser
-- row already existed for (systemuserid, v_personid) in ANY status, a
-- re-request silently no-opped -- a Rejected relationship could never be
-- re-requested by the same admin.
--
-- Change: added the ELSE branch. A re-request now only affects a row
-- currently 'Rejected' -- it is transitioned back to 'Pending' with fresh
-- requestdate/updatedate, reusing the same row (personmanagedbysystemuser's
-- primary key is (systemuserid, personid), so no duplicate row is possible
-- either way). Pending and Approved rows are untouched by the ELSE branch's
-- WHERE clause -- a pending request is not silently reset, and an approved
-- relationship is never overwritten/reactivated by a later request.
--
-- MODIFIED on fix/payer-manager-same-ranch-rule (P0, confirmed applied live
-- 2026-08-08, signature change already deployed). New business
-- rule: an admin may only manage a payer when both hold an Approved role at
-- the SAME ranch (admin "אדמין חווה", payer "משלם"). New required parameter
-- p_ranchid inserted as the 2nd positional parameter (before the existing
-- optional p_email/p_cellphone, since Postgres requires DEFAULT params to
-- trail) -- this is the admin's active ranch, already validated server-side
-- by PayersController.RequestManagedPayer's existing
-- EnsureUserHasRoleInRanch(currentPersonId, request.RanchId, RanchAdmin)
-- call before this proc is ever invoked, so the admin side of the rule is
-- NOT re-checked here (matches the precedent in usp_InsertEntry /
-- usp_GetPayerCompetitionAccount / usp_GetRegistrationStepStatus, none of
-- which re-validate the admin's own role either -- see the branch report).
-- Only the payer side (previously unchecked anywhere on this write path) is
-- new here: the resolved payer (existing match OR newly-created partial
-- person) must hold an Approved "משלם" role at p_ranchid. A brand-new
-- partial-person invitee (no personranchrole rows yet) will always fail
-- this check -- flagged explicitly in the branch report as a material
-- behavior change from today's "invite anyone, pending forever" flow, not
-- something to silently absorb.
--
-- REQUIRES DROP + CREATE (new required parameter is not appended at the
-- end -- see report for exact DROP statement). Deployed live 2026-08-08
-- alongside the matching PayerDAL.cs 6-parameter call -- confirmed in sync.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_requestmanagedpayer(p_systemuserid integer, p_ranchid integer, p_firstname character varying, p_lastname character varying, p_email character varying DEFAULT NULL::character varying, p_cellphone character varying DEFAULT NULL::character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_personid integer;
BEGIN
    SELECT fp."PersonId"
    INTO v_personid
    FROM public.usp_findpotentialpayerbycontact(p_email, p_cellphone) fp
    LIMIT 1;

    IF v_personid IS NULL THEN
        v_personid := public.usp_insertpartialperson(
            p_firstname,
            p_lastname,
            p_email,
            p_cellphone
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM personranchrole prr
        JOIN role r ON r.roleid = prr.roleid
        WHERE prr.personid = v_personid
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'משלם'
    ) THEN
        RAISE EXCEPTION 'Payer does not hold an approved Payer role in this ranch';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM personmanagedbysystemuser m
        WHERE m.systemuserid = p_systemuserid
          AND m.personid = v_personid
    ) THEN
        INSERT INTO personmanagedbysystemuser (
            systemuserid,
            personid,
            requestdate,
            approvalstatus
        )
        VALUES (
            p_systemuserid,
            v_personid,
            NOW(),
            'Pending'
        );
    ELSE
        UPDATE personmanagedbysystemuser
        SET requestdate = NOW(),
            updatedate = NOW(),
            approvalstatus = 'Pending'
        WHERE systemuserid = p_systemuserid
          AND personid = v_personid
          AND approvalstatus = 'Rejected';
    END IF;

    RETURN v_personid;
END;
$function$
