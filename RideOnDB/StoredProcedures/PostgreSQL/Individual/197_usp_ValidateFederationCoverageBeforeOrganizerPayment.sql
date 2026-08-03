-- ============================================================================
-- usp_validatefederationcoveragebeforeorganizerpayment - gate an organizer payment on federation coverage
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Thin wrapper around usp_getfederationcoveragestatusforpayer (195)
-- - inherits that function's scoping and known issues, no additional issue
-- specific to this proc was flagged in the audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_validatefederationcoveragebeforeorganizerpayment(p_competitionid integer, p_paidbypersonid integer)
 RETURNS TABLE(canproceed boolean, competitionid integer, paidbypersonid integer, payerfullname text, totalfederationamount numeric, coveredfederationamount numeric, missingfederationamount numeric, message text)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null then
        raise exception 'Competition id is required';
    end if;

    if p_paidbypersonid is null then
        raise exception 'Paid by person id is required';
    end if;

    return query
    with coverage as (
        select *
        from public.usp_getfederationcoveragestatusforpayer(
            p_competitionid,
            p_paidbypersonid
        )
    )
    select
        case
            when c.missingfederationamount = 0 then true
            else false
        end as canproceed,
        c.competitionid,
        c.paidbypersonid,
        c.payerfullname,
        c.totalfederationamount,
        c.coveredfederationamount,
        c.missingfederationamount,
        case
            when c.totalfederationamount = 0 then
                'אין חיובי התאחדות למשלם זה'
            when c.missingfederationamount = 0 then
                'ניתן להמשיך: תשלומי ההתאחדות מכוסים במלואם'
            else
                'לא ניתן לסגור תשלום מארגן: חסר כיסוי התאחדות בסך ' || c.missingfederationamount::text || ' ₪'
        end as message
    from coverage c;
end;
$function$
