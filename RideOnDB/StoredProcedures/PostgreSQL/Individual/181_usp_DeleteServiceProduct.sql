-- 181_usp_DeleteServiceProduct.sql
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
-- STATUS: NOT YET APPLIED TO LIVE as of 2026-07-27. Apply with Oren's explicit
-- go-ahead + smoke test (see handoff). Deploy alongside the matching C# change
-- (ServicePriceDAL RN001 catch + controller ValidationException catch).

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
