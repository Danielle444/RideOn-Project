# Migration & Deploy Runbook — QA #53 Service Delete

Load-bearing operational companion to `SPEC.md`. The executor needs this to satisfy CAP-2, CAP-3, and the deploy-coupling / live-DB constraints.

## The migration to apply

**New proc body:** `RideOnDB/StoredProcedures/PostgreSQL/Individual/183_usp_DeleteServiceProduct.sql` (a `CREATE OR REPLACE FUNCTION`). Apply that file's body verbatim.

Behavior: raises SQLSTATE `RN001` with a Hebrew message when the product is (a) a stall type assigned to physical stalls, or (b) referenced by any `pricecatalog` row that a `productrequest` **or** `paidtimerequest` points at. Otherwise it hard-deletes `paidtimeproduct` → `pricecatalog` → `product`, and raises `RN001` "not found" if no product row matched.

## Rollback body (exact currently-deployed definition, captured 2026-07-27 before any change)

```sql
CREATE OR REPLACE FUNCTION public.usp_deleteserviceproduct(productid_param smallint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (SELECT 1 FROM stall s WHERE s.stalltype = productid_param) THEN
        RAISE EXCEPTION 'Cannot delete product because it is used by stalls';
    END IF;
    IF EXISTS (SELECT 1 FROM productrequest pr WHERE pr.productid = productid_param) THEN
        RAISE EXCEPTION 'Cannot delete product because it is used by requests';
    END IF;
    DELETE FROM paidtimeproduct WHERE productid = productid_param;
    DELETE FROM pricecatalog WHERE productid = productid_param;
    DELETE FROM product WHERE productid = productid_param;
END;
$function$
```

> Note: the rollback body itself contains the `productrequest.productid` bug — it is the *broken* definition to restore only if the new proc must be reverted, never a target state.

## Smoke test (side-effect-free, per the live-DB `DO $$` pattern)

1. Create a throwaway product with a `pricecatalog` row and a `paidtimerequest` referencing that catalog row; call the proc → expect an `RN001` "already ordered" raise.
2. Create a product with no references; call the proc → expect a clean delete.
3. Capture before/after counts and use `RAISE EXCEPTION 'SMOKE_RESULT ...'` to roll the whole block back.
4. Confirm rollback with a follow-up read (throwaway rows gone, real data untouched).

## Deploy-coupling ordering

Fully-correct behavior needs the new proc **and** the C# (DAL RN001 catch + controller `ValidationException` → `BadRequest`) live together. Apply the proc in the same window as the branch merge → Render.

| State | Result |
|---|---|
| old proc + new C# | delete still blocked/crashes as today; generic message (no worse than today) |
| new proc + old C# | correct block, but message still generic (no worse than today) |
| **new proc + new C#** | **correct block + Hebrew guard reaches the user** ✅ |

Neither transitional ordering degrades below today's behavior, so there is no unsafe intermediate — but "done" means both are live.
