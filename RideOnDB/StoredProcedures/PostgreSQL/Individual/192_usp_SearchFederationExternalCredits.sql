-- ============================================================================
-- usp_searchfederationexternalcredits - search/list federation credits for a competition
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). No issue specific to this proc was flagged in that audit - it is
-- a straightforward filtered/searched read scoped by p_competitionid, with a
-- computed usagestatuslabel (Hebrew) that mirrors creditstatus/availableamount.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_searchfederationexternalcredits(p_competitionid integer, p_searchtext text DEFAULT NULL::text, p_onlyavailable boolean DEFAULT false)
 RETURNS TABLE(federationexternalcreditid integer, competitionid integer, sourcetype character varying, externalreference character varying, externalname character varying, externalclubname character varying, externalidnumber character varying, originalamount numeric, usedamount numeric, availableamount numeric, creditstatus character varying, usagestatuslabel text, createdat timestamp with time zone, notes text)
 LANGUAGE plpgsql
AS $function$
declare
    v_search text;
begin
    if p_competitionid is null then
        raise exception 'Competition id is required';
    end if;

    v_search := lower(trim(coalesce(p_searchtext, '')));

    return query
    select
        fec.federationexternalcreditid,
        fec.competitionid,
        fec.sourcetype,
        fec.externalreference,
        fec.externalname,
        fec.externalclubname,
        fec.externalidnumber,
        fec.originalamount,
        fec.usedamount,
        fec.availableamount,
        fec.creditstatus,
        case
            when fec.creditstatus = 'NeedsReview' then 'דורש בדיקה'
            when fec.creditstatus = 'Cancelled' then 'בוטל'
            when fec.creditstatus = 'Refunded' then 'הוחזר'
            when fec.creditstatus = 'ClosedManually' then 'נסגר ידנית'
            when fec.creditstatus = 'TransferredToNextCompetition' then 'הועבר כזיכוי לתחרות אחרת'
            when fec.availableamount = fec.originalamount then 'לא נוצל'
            when fec.availableamount > 0 and fec.usedamount > 0 then 'נוצל חלקית'
            when fec.availableamount = 0 then 'נוצל במלואו'
            else 'לא ידוע'
        end as usagestatuslabel,
        fec.createdat,
        fec.notes
    from public.federationexternalcredit fec
    where fec.competitionid = p_competitionid
      and (
            p_onlyavailable = false
            or fec.availableamount > 0
          )
      and (
            v_search = ''
            or lower(coalesce(fec.externalname, '')) like '%' || v_search || '%'
            or lower(coalesce(fec.externalclubname, '')) like '%' || v_search || '%'
            or lower(coalesce(fec.externalidnumber, '')) like '%' || v_search || '%'
            or lower(coalesce(fec.externalreference, '')) like '%' || v_search || '%'
            or fec.originalamount::text like '%' || v_search || '%'
            or fec.usedamount::text like '%' || v_search || '%'
            or fec.availableamount::text like '%' || v_search || '%'
          )
    order by
        case
            when fec.availableamount > 0 then 0
            else 1
        end,
        fec.createdat desc,
        fec.federationexternalcreditid desc;
end;
$function$
