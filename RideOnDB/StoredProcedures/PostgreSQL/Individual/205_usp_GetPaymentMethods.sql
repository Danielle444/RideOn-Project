-- ============================================================================
-- usp_getpaymentmethods - static payment method reference list
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). No parameters, no tenant scoping needed (static reference data,
-- not payer/competition data) - no issue flagged in the audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getpaymentmethods()
 RETURNS TABLE("PaymentMethodId" integer, "PaymentMethodType" text)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select
        pm.paymentmethodid as "PaymentMethodId",
        pm.paymentmethodtype::text as "PaymentMethodType"
    from public.paymentmethod pm
    order by pm.paymentmethodid;
end;
$function$
