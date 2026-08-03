-- ============================================================================
-- usp_getcompetitionsummarypaymentbatches - list payment batches for a competition
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. This proc had
-- only been recovered at signature level during the initial Stage 1 sweep; a
-- fresh pg_get_functiondef read was performed before writing this file.
-- Reproduced verbatim; no behavioral change of any kind.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Confirms p_chargeowner accepts 'Federation' here too (defaults to
-- 'Organizer') - this is the read side of the usp_createcompetitionpayerpayment
-- (200) double-payment finding: a Federation paymentbatch, once created, is
-- visible through this same summary proc. No additional issue specific to
-- this proc was flagged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummarypaymentbatches(p_competitionid integer, p_ranchid integer, p_chargeowner text DEFAULT 'Organizer'::text, p_paymentmethodid integer DEFAULT NULL::integer)
 RETURNS TABLE("PaymentBatchId" integer, "BillId" integer, "PayerPersonId" integer, "PayerName" text, "InvoiceNumber" text, "CreatedAt" timestamp with time zone, "EnteredByName" text, "BatchTotalAmount" numeric, "SelectedMethodAmount" numeric, "PaymentMethodsText" text)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_chargeowner is null
       or p_chargeowner not in ('Organizer', 'Federation') then
        raise exception 'Charge owner must be Organizer or Federation';
    end if;

    return query
    with method_totals as (
        select
            p.paymentbatchid,
            string_agg(
                pm.paymentmethodtype || ' ₪' || trim(to_char(p.amountpaid, 'FM999G999G999G990D00')),
                ', '
                order by pm.paymentmethodid
            )::text as paymentmethodstext,
            coalesce(sum(
                case
                    when p_paymentmethodid is null
                      or p.paymentmethodid = p_paymentmethodid
                    then p.amountpaid
                    else 0
                end
            ), 0)::numeric as selectedmethodamount
        from public.payment p
        inner join public.paymentmethod pm
            on pm.paymentmethodid = p.paymentmethodid
        group by p.paymentbatchid
    )
    select
        pb.paymentbatchid::integer as "PaymentBatchId",
        pb.billid::integer as "BillId",
        pb.paidbypersonid::integer as "PayerPersonId",
        concat_ws(' ', payer.firstname, payer.lastname)::text as "PayerName",
        pb.invoicenumber::text as "InvoiceNumber",
        pb.createdat as "CreatedAt",
        concat_ws(' ', entered_p.firstname, entered_p.lastname)::text as "EnteredByName",
        round(pb.totalamount, 2)::numeric as "BatchTotalAmount",
        round(mt.selectedmethodamount, 2)::numeric as "SelectedMethodAmount",
        coalesce(mt.paymentmethodstext, '')::text as "PaymentMethodsText"
    from public.paymentbatch pb
    inner join public.competition c
        on c.competitionid = pb.competitionid
    inner join public.person payer
        on payer.personid = pb.paidbypersonid
    left join public.systemuser entered_su
        on entered_su.systemuserid = pb.enteredbysystemuserid
    left join public.person entered_p
        on entered_p.personid = entered_su.systemuserid
    left join method_totals mt
        on mt.paymentbatchid = pb.paymentbatchid
    where pb.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and pb.chargeowner = p_chargeowner
      and (
          p_paymentmethodid is null
          or exists (
              select 1
              from public.payment p
              where p.paymentbatchid = pb.paymentbatchid
                and p.paymentmethodid = p_paymentmethodid
          )
      )
    order by
        pb.createdat desc,
        pb.paymentbatchid desc;
end;
$function$
