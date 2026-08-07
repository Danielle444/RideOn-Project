-- ============================================================================
-- usp_getmanagingadminsforpayer - admins linked to a payer (self-service view)
-- ============================================================================
-- MODIFIED on feat/managed-payer-approval-flow (2026-08-07). Repo previously
-- had no copy of this proc at all (live-only, found by the managed-payer
-- relationship audit). Prior live behavior filtered
-- "m.approvalstatus = 'Approved'" only, so an Admin-initiated Pending
-- request was invisible to the payer on the only screen that reads this
-- proc (mobile Profile -> "Admins managing me").
--
-- Change: filter widened to "m.approvalstatus IN ('Approved', 'Pending')".
-- Same columns, same return type, same ORDER BY -- CREATE OR REPLACE is
-- signature-compatible with live. Callers already carried ApprovalStatus
-- through untouched (RideOnServer PayerManagerItem DTO, PayerDAL.
-- GetPayerManagers) -- only the mobile client needed to start splitting the
-- response by ApprovalStatus into an approved-managers list and a
-- pending-requests list. Rejected rows are still excluded on purpose: once
-- rejected, the row is either gone (no relationship) or has already been
-- reused as Pending by a later usp_requestmanagedpayer call.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getmanagingadminsforpayer(p_personid integer)
 RETURNS TABLE("AdminPersonId" integer, "FirstName" character varying, "LastName" character varying, "CellPhone" character varying, "Email" character varying, "RanchId" integer, "RanchName" text, "RoleId" smallint, "RoleName" text, "ApprovalStatus" character varying, "RequestDate" timestamp with time zone, "UpdateDate" timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        su.systemuserid AS "AdminPersonId",
        p.firstname AS "FirstName",
        p.lastname AS "LastName",
        p.cellphone AS "CellPhone",
        p.email AS "Email",
        prr.ranchid AS "RanchId",
        r.ranchname::text AS "RanchName",
        prr.roleid AS "RoleId",
        rl.rolename::text AS "RoleName",
        m.approvalstatus AS "ApprovalStatus",
        m.requestdate AS "RequestDate",
        m.updatedate AS "UpdateDate"
    FROM personmanagedbysystemuser m
    INNER JOIN systemuser su
        ON su.systemuserid = m.systemuserid
    INNER JOIN person p
        ON p.personid = su.systemuserid
    INNER JOIN personranchrole prr
        ON prr.personid = su.systemuserid
    INNER JOIN role rl
        ON rl.roleid = prr.roleid
    INNER JOIN ranch r
        ON r.ranchid = prr.ranchid
    WHERE m.personid = p_personid
      AND m.approvalstatus IN ('Approved', 'Pending')
      AND prr.rolestatus = 'Approved'
      AND rl.rolename = 'אדמין חווה'
    ORDER BY p.firstname, p.lastname, r.ranchname;
END;
$function$
