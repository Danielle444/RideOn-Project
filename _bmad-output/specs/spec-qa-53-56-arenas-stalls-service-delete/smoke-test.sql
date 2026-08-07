-- Smoke test for QA #53 — usp_deleteserviceproduct
--
-- Companion to migration-and-deploy.md, which describes this test in prose only.
-- Run STEP 0 and STEP 1 before applying the migration; run STEP 2 AFTER applying it.
--
-- PROVENANCE / TRUST WARNING: the INSERT column lists below were derived from
-- RideOnDB/schema.sql, which ride-on-system-knowledge explicitly marks as STALE
-- (fieldconfig and smartconfig exist live with no CREATE TABLE in that file).
-- Nothing here has been verified against the live database — the session that
-- wrote it had no Supabase access. STEP 0 exists to close that gap. If STEP 0
-- shows a column set that differs from what STEP 2 inserts, fix STEP 2 first.
--
-- STEP 2 is side-effect-free: every row it creates is rolled back by the final
-- RAISE EXCEPTION, which is also how the results are carried out (the live-DB
-- protocol's DO $$ pattern). Confirm the rollback with STEP 3.


-- ============================================================
-- STEP 0 — read-only: confirm the schema this test assumes
-- ============================================================
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('product','pricecatalog','productrequest','paidtimerequest',
                     'paidtimeproduct','stall','bill','servicerequest')
ORDER BY table_name, ordinal_position;


-- ============================================================
-- STEP 1 — read-only: capture the CURRENTLY DEPLOYED definition
-- ============================================================
-- Diff this against migration-and-deploy.md's "rollback body". If they differ,
-- live has drifted from what the spec captured on 2026-07-27 — STOP and report.
-- This output IS the rollback source of truth; a repo file is not.
SELECT p.oid, pg_get_function_arguments(p.oid) AS args, pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'usp_deleteserviceproduct';

-- Which products are actually in use (confirms CAP-3 has a real target).
-- Spec says: paid-time products 1,2 via paidtimerequest; 3,4,5 via productrequest.
SELECT pc.productid,
       count(*) FILTER (WHERE pr.prequestid  IS NOT NULL) AS product_requests,
       count(*) FILTER (WHERE ptr.paidtimerequestid IS NOT NULL) AS paidtime_requests
FROM pricecatalog pc
LEFT JOIN productrequest  pr  ON pr.pricecatalogid  = pc.pricecatalogid
LEFT JOIN paidtimerequest ptr ON ptr.pricecatalogid = pc.pricecatalogid
GROUP BY pc.productid
ORDER BY pc.productid;


-- ============================================================
-- STEP 2 — the smoke test (run AFTER applying the new proc)
-- ============================================================
DO $$
DECLARE
    v_cat       smallint;
    v_ranch     integer;
    v_person    integer;
    v_horse     integer;
    v_fedmem    integer;
    v_sysuser   integer;
    v_slot      integer;

    v_prod_used     smallint;
    v_prod_unused   smallint;
    v_pc_used       integer;
    v_bill          integer;
    v_sreq          integer;

    v_used_outcome   text := 'NOT_BLOCKED';
    v_used_sqlstate  text := '-';
    v_used_msg       text := '-';

    v_unused_outcome text := 'OK';
    v_unused_msg     text := '-';
    v_prod_after     integer;
    v_pc_after       integer;
BEGIN
    -- Borrow existing rows for the FK chain; never create people/horses/ranches.
    SELECT categoryid          INTO v_cat     FROM productcategory ORDER BY categoryid LIMIT 1;
    SELECT ranchid             INTO v_ranch   FROM ranch           ORDER BY ranchid LIMIT 1;
    SELECT personid            INTO v_person  FROM person          ORDER BY personid LIMIT 1;
    SELECT horseid             INTO v_horse   FROM horse           ORDER BY horseid LIMIT 1;
    SELECT federationmemberid  INTO v_fedmem  FROM federationmember ORDER BY federationmemberid LIMIT 1;
    SELECT systemuserid        INTO v_sysuser FROM systemuser      ORDER BY systemuserid LIMIT 1;
    SELECT paidtimeslotincompid INTO v_slot   FROM paidtimeslotincompetition ORDER BY paidtimeslotincompid LIMIT 1;

    IF v_cat IS NULL OR v_ranch IS NULL OR v_person IS NULL OR v_horse IS NULL
       OR v_fedmem IS NULL OR v_sysuser IS NULL OR v_slot IS NULL THEN
        RAISE EXCEPTION 'SMOKE_SETUP_FAILED cat=% ranch=% person=% horse=% fedmem=% sysuser=% slot=%',
            v_cat, v_ranch, v_person, v_horse, v_fedmem, v_sysuser, v_slot;
    END IF;

    ---------------------------------------------------------
    -- Case A: a USED product must be BLOCKED with RN001
    ---------------------------------------------------------
    INSERT INTO product (categoryid, productname)
    VALUES (v_cat, 'SMOKE_TEST_QA53_USED')
    RETURNING productid INTO v_prod_used;

    INSERT INTO pricecatalog (productid, ranchid, creationdate, itemprice, isactive)
    VALUES (v_prod_used, v_ranch, now(), 1, true)
    RETURNING pricecatalogid INTO v_pc_used;

    -- paidtimerequest.paidtimerequestid is NOT identity; it FKs to servicerequest.srequestid,
    -- so the bill -> servicerequest chain has to exist first.
    INSERT INTO bill (paidbypersonid, amounttopay, dateopened)
    VALUES (v_person, 0, now())
    RETURNING billid INTO v_bill;

    INSERT INTO servicerequest (orderedbysystemuserid, horseid, riderfederationmemberid, billid)
    VALUES (v_sysuser, v_horse, v_fedmem, v_bill)
    RETURNING srequestid INTO v_sreq;

    INSERT INTO paidtimerequest (paidtimerequestid, pricecatalogid, requestedcompslotid, status)
    VALUES (v_sreq, v_pc_used, v_slot, 'Pending');

    BEGIN
        PERFORM usp_deleteserviceproduct(v_prod_used);
        v_used_outcome := 'NOT_BLOCKED';   -- FAILURE: the guard did not fire
    EXCEPTION WHEN OTHERS THEN
        v_used_outcome  := 'BLOCKED';
        v_used_sqlstate := SQLSTATE;
        v_used_msg      := SQLERRM;
    END;

    ---------------------------------------------------------
    -- Case B: an UNUSED product must DELETE cleanly
    ---------------------------------------------------------
    INSERT INTO product (categoryid, productname)
    VALUES (v_cat, 'SMOKE_TEST_QA53_UNUSED')
    RETURNING productid INTO v_prod_unused;

    INSERT INTO pricecatalog (productid, ranchid, creationdate, itemprice, isactive)
    VALUES (v_prod_unused, v_ranch, now(), 1, true);

    BEGIN
        PERFORM usp_deleteserviceproduct(v_prod_unused);
    EXCEPTION WHEN OTHERS THEN
        v_unused_outcome := 'FAILED(' || SQLSTATE || ')';
        v_unused_msg     := SQLERRM;
    END;

    SELECT count(*) INTO v_prod_after FROM product      WHERE productid = v_prod_unused;
    SELECT count(*) INTO v_pc_after   FROM pricecatalog WHERE productid = v_prod_unused;

    ---------------------------------------------------------
    -- Carry results out AND roll everything back.
    ---------------------------------------------------------
    -- PASS looks like:
    --   A=BLOCKED sqlstate=RN001 msg=<Hebrew "...יש להשבית אותו במקום זאת">
    --   B=OK product_rows_after=0 pricecatalog_rows_after=0
    RAISE EXCEPTION 'SMOKE_RESULT || A=% sqlstate=% msg=% || B=% msg=% product_rows_after=% pricecatalog_rows_after=%',
        v_used_outcome, v_used_sqlstate, v_used_msg,
        v_unused_outcome, v_unused_msg, v_prod_after, v_pc_after;
END $$;


-- ============================================================
-- STEP 3 — confirm the rollback (must return ZERO rows)
-- ============================================================
SELECT productid, productname
FROM product
WHERE productname LIKE 'SMOKE_TEST_QA53%';
