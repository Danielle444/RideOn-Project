-- ============================================================================
-- usp_getcompetitionpayerspaymentsummary - per-payer payment summary for a competition
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). No issue specific to this proc was flagged in that audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionpayerspaymentsummary(p_competitionid integer)
 RETURNS TABLE("BillId" integer, "PayerPersonId" integer, "PayerName" text, "TotalAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric, "PaymentStatus" text, "LastUpdatedAt" timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    return query
    with charge_summary as (
        select
            bc.billid,
            bc.paidbypersonid,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid') then bc.amounttopay
                    else 0
                end
            ), 0) as totalamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid' then bc.amounttopay
                    else 0
                end
            ), 0) as paidamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Open' then bc.amounttopay
                    else 0
                end
            ), 0) as unpaidamount,

            max(bc.createdat) as lastchargeat

        from public.billcharge bc
        where bc.competitionid = p_competitionid
          and bc.chargestatus in ('Open', 'Paid')
        group by
            bc.billid,
            bc.paidbypersonid
    ),
    payment_summary as (
        select
            pb.billid,
            max(pb.createdat) as lastpaymentat
        from public.paymentbatch pb
        where pb.competitionid = p_competitionid
        group by pb.billid
    )
    select
        b.billid as "BillId",
        b.paidbypersonid as "PayerPersonId",
        concat_ws(' ', p.firstname, p.lastname)::text as "PayerName",

        cs.totalamount::numeric as "TotalAmount",
        cs.paidamount::numeric as "PaidAmount",
        cs.unpaidamount::numeric as "UnpaidAmount",

        case
            when cs.paidamount = 0 then 'Unpaid'
            when cs.unpaidamount = 0 then 'Paid'
            else 'Partial'
        end::text as "PaymentStatus",

        greatest(
            coalesce(cs.lastchargeat, b.dateopened),
            coalesce(ps.lastpaymentat, b.dateopened)
        ) as "LastUpdatedAt"

    from public.bill b
    inner join public.person p
        on p.personid = b.paidbypersonid
    inner join charge_summary cs
        on cs.billid = b.billid
    left join payment_summary ps
        on ps.billid = b.billid
    where b.competitionid = p_competitionid
      and cs.totalamount > 0
    order by
        "PaymentStatus",
        "PayerName";
end;
$function$
