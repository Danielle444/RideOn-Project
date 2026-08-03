-- ============================================================================
-- usp_recalculatebillamount - recompute bill.amounttopay from its billcharge rows
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). DB-internal helper - never called directly from C#, only from
-- other procs (usp_insertentry, usp_answerproductchangerequest,
-- usp_createcompetitionpayerpayment, usp_merge_duplicate_bills_for_competition,
-- usp_rebuildbillchargesforcompetition). Notably, NEITHER
-- usp_allocatefederationcredittocharge (193) NOR
-- usp_approvefederationmatchingsuggestion (199) NOR usp_secretarydeleteentry
-- (145) NOR usp_insertchangeentryrequest (213, which recalculates inline
-- instead of calling this) call it - an inconsistency noted in the audit but
-- not fixed here, since bill.amounttopay does not appear to be read by the
-- billcharge-based payer summaries.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_recalculatebillamount(p_billid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
    if p_billid is null or p_billid <= 0 then
        raise exception 'Invalid bill id';
    end if;

    update public.bill b
    set amounttopay = coalesce(
        (
            select sum(bc.amounttopay)
            from public.billcharge bc
            where bc.billid = p_billid
              and bc.chargestatus in ('Open', 'Paid')
        ),
        0
    )
    where b.billid = p_billid;
end;
$function$
