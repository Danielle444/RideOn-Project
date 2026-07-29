-- 183_usp_DeleteServiceProduct.sql
--
-- QA #53 fix — secretary "delete service" (Service Prices page) never worked.
--
-- The previously DEPLOYED (live-only, never in repo) body guarded usage with
--     SELECT 1 FROM productrequest pr WHERE pr.productid = productid_param
-- but `productrequest` has NO `productid` column (its columns: prequestid,
-- competitionid, prequestdatetime, orderedbysystemuserid, pricecatalogid,
-- notes, approvaldate). So every delete that got past the stall guard threw
-- SQLSTATE 42703 (column does not exist). A second latent bug: `DELETE FROM
-- pricecatalog` had NO guard against `paidtimerequest.pricecatalogid` (an FK
-- onto pricecatalog), so a used paid-time product would FK-explode (23503)
-- even after the column bug was fixed. Live-verified 2026-07-27: paid-time
-- products 1,2 referenced by paidtimerequest; products 3,4,5 by productrequest.
--
-- Fix: detect usage the correct way (through pricecatalog) for BOTH request
-- types, block with a clear Hebrew "deactivate instead" message tagged
-- SQLSTATE 'RN001' (the DAL surfaces RN001 as ValidationException →
-- BadRequest(message)); only hard-delete products with zero stalls and zero
-- orders. Product financial history is never destroyed.
--
-- STATUS: APPLIED TO LIVE 2026-07-30 with Oren's explicit go-ahead, migration
-- `qa53_fix_deleteserviceproduct_guards_rn001`. Body below is byte-identical to the
-- deployed definition (verified via pg_get_functiondef, md5 24a5050417919ade7520bd151088edc8,
-- oid 21844 -- CREATE OR REPLACE, signature unchanged).
--
-- Pre-apply smoke test (rolled back via terminating RAISE, rollback re-read confirmed):
--   unused product 11  -> clean delete, all 3 child tables cleared
--   product 2 (160 paidtimerequest rows) -> RN001, never 23503
--   product 3 (128 stalls)               -> RN001
--   productid 9999                       -> RN001 "not found"
-- Post-apply, against the DEPLOYED proc: products 2, 3 and 5 all raise RN001 with the
-- Hebrew guard text -- the old 42703 crash is gone.
--
-- The matching C# (ServicePriceDAL RN001 catch + controller ValidationException catch)
-- is NOT yet on main as of 2026-07-30, so the guard message still reaches the secretary
-- as the generic Hebrew fallback until that merges. Correct blocking already works.

CREATE OR REPLACE FUNCTION public.usp_deleteserviceproduct(productid_param smallint)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Guard 1: product is a stall type currently assigned to physical stalls
    IF EXISTS (SELECT 1 FROM stall s WHERE s.stalltype = productid_param) THEN
        RAISE EXCEPTION 'לא ניתן למחוק שירות המשויך לתאים קיימים. יש להשבית אותו במקום זאת.'
            USING ERRCODE = 'RN001';
    END IF;

    -- Guard 2: product has been ordered (regular product requests OR paid-time requests)
    IF EXISTS (
        SELECT 1 FROM pricecatalog pc
        WHERE pc.productid = productid_param
          AND (
              EXISTS (SELECT 1 FROM productrequest  pr  WHERE pr.pricecatalogid  = pc.pricecatalogid)
           OR EXISTS (SELECT 1 FROM paidtimerequest ptr WHERE ptr.pricecatalogid = pc.pricecatalogid)
          )
    ) THEN
        RAISE EXCEPTION 'לא ניתן למחוק שירות שכבר שויך להזמנות. יש להשבית אותו במקום זאת.'
            USING ERRCODE = 'RN001';
    END IF;

    -- Safe to hard-delete: nothing references this product
    DELETE FROM paidtimeproduct WHERE productid = productid_param;
    DELETE FROM pricecatalog    WHERE productid = productid_param;

    DELETE FROM product WHERE productid = productid_param;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'השירות לא נמצא.' USING ERRCODE = 'RN001';
    END IF;
END;
$function$;
