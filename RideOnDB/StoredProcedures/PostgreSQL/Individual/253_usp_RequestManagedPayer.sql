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
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_requestmanagedpayer(p_systemuserid integer, p_firstname character varying, p_lastname character varying, p_email character varying DEFAULT NULL::character varying, p_cellphone character varying DEFAULT NULL::character varying)
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
