-- ============================================================================
-- usp_getavailablemanagingadminsforpayer - candidate admins for a payer to add
-- ============================================================================
-- Live-only prior to this file (never committed to the repo). Captured
-- verbatim via pg_get_functiondef on fix/payer-manager-same-ranch-rule
-- (2026-08-08) before any change was made. Feeds the "הוספת מנהל" picker in
-- PayerManagersSection.jsx; each candidate is then submitted through
-- usp_addmanagingadminforpayer (258), which is the actual write-side
-- authority.
--
-- MODIFIED on fix/payer-manager-same-ranch-rule (P0, PROPOSED, NOT YET
-- APPLIED LIVE -- see that branch's report; this change is a UX filter, not
-- the enforcement point, so it is lower-risk and optional relative to
-- 252/253/258). New business rule: an admin may only manage a payer when
-- both hold an Approved role at the SAME ranch. Prior to this change this
-- proc listed every Approved ranch admin in the whole system (minus
-- already-linked ones) regardless of the requesting payer's own ranch
-- roles -- a payer could see, and select, an admin at a ranch where the
-- payer holds no role at all, only to have the pick rejected by 258's new
-- guard. This change adds one more EXISTS condition so only admins sharing
-- an Approved-ranch match with the requesting payer are offered, per the
-- task's "filter invalid options out where the server already exposes
-- enough data safely" preference -- the proc already returns RanchId per
-- row, so no new data exposure is introduced. Everything else, including
-- column list, exclusion-of-already-linked logic, and free-text search, is
-- byte-identical to the captured live definition. Signature is unchanged,
-- safe as a plain CREATE OR REPLACE.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getavailablemanagingadminsforpayer(p_personid integer, p_search_text character varying DEFAULT NULL::character varying)
 RETURNS TABLE("AdminPersonId" integer, "FirstName" character varying, "LastName" character varying, "CellPhone" character varying, "Email" character varying, "RanchId" integer, "RanchName" text, "RoleId" smallint, "RoleName" text)
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
        rl.rolename::text AS "RoleName"
    FROM systemuser su
    INNER JOIN person p
        ON p.personid = su.systemuserid
    INNER JOIN personranchrole prr
        ON prr.personid = su.systemuserid
    INNER JOIN role rl
        ON rl.roleid = prr.roleid
    INNER JOIN ranch r
        ON r.ranchid = prr.ranchid
    WHERE prr.rolestatus = 'Approved'
      AND rl.rolename = 'אדמין חווה'
      AND su.isactive = true

      -- לא מחזיר כאלה שכבר מקושרים למשלם
      AND NOT EXISTS
      (
          SELECT 1
          FROM personmanagedbysystemuser m
          WHERE m.systemuserid = su.systemuserid
            AND m.personid = p_personid
      )

      -- רק אדמינים בחווה בה למשלם יש תפקיד משלם מאושר
      AND EXISTS
      (
          SELECT 1
          FROM personranchrole payer_prr
          INNER JOIN role payer_r ON payer_r.roleid = payer_prr.roleid
          WHERE payer_prr.personid = p_personid
            AND payer_prr.ranchid = prr.ranchid
            AND payer_prr.rolestatus = 'Approved'
            AND payer_r.rolename = 'משלם'
      )

      -- חיפוש
      AND
      (
          p_search_text IS NULL
          OR p.firstname ILIKE '%' || p_search_text || '%'
          OR p.lastname ILIKE '%' || p_search_text || '%'
          OR p.email ILIKE '%' || p_search_text || '%'
          OR p.cellphone ILIKE '%' || p_search_text || '%'
          OR r.ranchname ILIKE '%' || p_search_text || '%'
      )

    ORDER BY p.firstname, p.lastname, r.ranchname;
END;
$function$
