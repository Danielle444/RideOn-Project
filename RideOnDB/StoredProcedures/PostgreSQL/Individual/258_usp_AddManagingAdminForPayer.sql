-- ============================================================================
-- usp_addmanagingadminforpayer - payer directly adds an admin as a manager
-- ============================================================================
-- Live-only prior to this file (never committed to the repo). Captured
-- verbatim via pg_get_functiondef on fix/payer-manager-same-ranch-rule
-- (2026-08-08) before any change was made. Unlike usp_requestmanagedpayer /
-- usp_answermanagedpayerrequest, this path bypasses 'Pending' entirely: the
-- payer picks a candidate from usp_getavailablemanagingadminsforpayer (see
-- 259_usp_GetAvailableManagingAdminsForPayer.sql) and the relationship is
-- inserted directly as 'Approved'. Called from PayersController.
-- AddPayerManager, authorized only by currentPersonId == request.PersonId
-- (no ranch check anywhere above this proc).
--
-- MODIFIED on fix/payer-manager-same-ranch-rule (P0, confirmed applied live
-- 2026-08-08). New business rule: an admin may only manage a
-- payer when both hold an Approved role at the SAME ranch (admin
-- "אדמין חווה", payer "משלם"). This proc had a same-admin-role check but NO
-- ranch logic of any kind before this change -- since it auto-approves,
-- this was the most direct route to creating an invalid cross-ranch
-- relationship (no Pending step for a same-ranch approval-time check to
-- ever run). Added one guard block, placed after the existing
-- admin-is-approved check and before the existing already-linked check.
-- Everything else -- including the two pre-existing RAISE EXCEPTION
-- messages -- is byte-identical to the captured live definition. Signature
-- is unchanged, safe as a plain CREATE OR REPLACE (backward compatible with
-- the currently-deployed backend, which sends the same two parameters
-- either way).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_addmanagingadminforpayer(p_personid integer, p_systemuserid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN

    -- בדיקה שהאדמין קיים והוא אדמין חווה מאושר
    IF NOT EXISTS
    (
        SELECT 1
        FROM systemuser su
        INNER JOIN personranchrole prr
            ON prr.personid = su.systemuserid
        INNER JOIN role rl
            ON rl.roleid = prr.roleid
        WHERE su.systemuserid = p_systemuserid
          AND su.isactive = true
          AND prr.rolestatus = 'Approved'
          AND rl.rolename = 'אדמין חווה'
    ) THEN
        RAISE EXCEPTION 'The selected manager is not an approved ranch admin';
    END IF;

    -- בדיקה שקיימת חווה משותפת שבה גם האדמין וגם המשלם מאושרים
    IF NOT EXISTS
    (
        SELECT 1
        FROM personranchrole admin_prr
        INNER JOIN role admin_r ON admin_r.roleid = admin_prr.roleid
        INNER JOIN personranchrole payer_prr ON payer_prr.ranchid = admin_prr.ranchid
        INNER JOIN role payer_r ON payer_r.roleid = payer_prr.roleid
        WHERE admin_prr.personid = p_systemuserid
          AND admin_prr.rolestatus = 'Approved'
          AND admin_r.rolename = 'אדמין חווה'
          AND payer_prr.personid = p_personid
          AND payer_prr.rolestatus = 'Approved'
          AND payer_r.rolename = 'משלם'
    ) THEN
        RAISE EXCEPTION 'No shared approved ranch between admin and payer';
    END IF;

    -- בדיקה שאין כבר קשר
    IF EXISTS
    (
        SELECT 1
        FROM personmanagedbysystemuser m
        WHERE m.systemuserid = p_systemuserid
          AND m.personid = p_personid
    ) THEN
        RAISE EXCEPTION 'This manager is already linked to this payer';
    END IF;

    -- הכנסת קשר חדש
    INSERT INTO personmanagedbysystemuser
    (
        systemuserid,
        personid,
        requestdate,
        updatedate,
        approvalstatus
    )
    VALUES
    (
        p_systemuserid,
        p_personid,
        NOW(),
        NOW(),
        'Approved'
    );

END;
$function$
