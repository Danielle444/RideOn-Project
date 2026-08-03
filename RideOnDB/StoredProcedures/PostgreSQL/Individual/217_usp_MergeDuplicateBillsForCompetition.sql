-- ============================================================================
-- usp_merge_duplicate_bills_for_competition - merge duplicate bill rows per payer
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository - discovered
-- via the pg_proc keyword sweep, not in the originally supplied proc list.
-- Reproduced verbatim via pg_get_functiondef; no behavioral change of any
-- kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Maintenance/reconciliation utility for pre-existing duplicate
-- bill rows per (paidbypersonid, competitionid) - refuses to merge (raises
-- an exception) if it would collide two different billproductrequest rows
-- for the same product request across bills, rather than silently picking
-- one. No issue specific to this proc was flagged in the audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_merge_duplicate_bills_for_competition(p_competitionid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    duplicate_group record;
    primary_bill_id integer;
    duplicate_bill_ids integer[];
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    for duplicate_group in
        select
            paidbypersonid,
            competitionid,
            min(billid) as primarybillid,
            array_agg(billid order by billid) as billids,
            array_remove(array_agg(billid order by billid), min(billid)) as duplicatebillids
        from public.bill
        where competitionid = p_competitionid
        group by paidbypersonid, competitionid
        having count(*) > 1
    loop
        primary_bill_id := duplicate_group.primarybillid;
        duplicate_bill_ids := duplicate_group.duplicatebillids;

        /*
            הגנה: אם יש אותו ProductRequest על כמה Bills של אותו משלם,
            לא מאחדים אוטומטית כדי לא ליצור כפילות או סכום שגוי.
        */
        if exists (
            select 1
            from public.billproductrequest bpr
            where bpr.billid = any(duplicate_group.billids)
            group by bpr.prequestid
            having count(distinct bpr.billid) > 1
        ) then
            raise exception
                'Cannot merge bills for payer %, competition %: duplicate product requests found across bills',
                duplicate_group.paidbypersonid,
                duplicate_group.competitionid;
        end if;

        update public.servicerequest sr
        set billid = primary_bill_id
        where sr.billid = any(duplicate_bill_ids);

        update public.billproductrequest bpr
        set billid = primary_bill_id
        where bpr.billid = any(duplicate_bill_ids);

        update public.billcharge bc
        set billid = primary_bill_id
        where bc.billid = any(duplicate_bill_ids);

        update public.payment p
        set billid = primary_bill_id
        where p.billid = any(duplicate_bill_ids);

        update public.paymentbatch pb
        set billid = primary_bill_id
        where pb.billid = any(duplicate_bill_ids);

        update public.bill b
        set amounttopay = coalesce(
            (
                select sum(bc.amounttopay)
                from public.billcharge bc
                where bc.billid = primary_bill_id
                  and bc.chargestatus in ('Open', 'Paid')
            ),
            0
        )
        where b.billid = primary_bill_id;

        delete from public.bill b
        where b.billid = any(duplicate_bill_ids);
    end loop;

    /*
        בסוף ניישר amounttopay לכל Bills של התחרות לפי billcharge.
        זה חשוב כי amounttopay הישן לא בהכרח אמין אחרי הבנייה מחדש.
    */
    update public.bill b
    set amounttopay = coalesce(
        (
            select sum(bc.amounttopay)
            from public.billcharge bc
            where bc.billid = b.billid
              and bc.chargestatus in ('Open', 'Paid')
        ),
        0
    )
    where b.competitionid = p_competitionid;
end;
$function$
