-- ============================================================================
-- usp_getcompetitionsummarypaymentbatchmethods - payment rows within one batch
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. This proc had
-- only been recovered at signature level during the initial Stage 1 sweep; a
-- fresh pg_get_functiondef read was performed before writing this file.
-- Reproduced verbatim; no behavioral change of any kind.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Correctly scoped by hostranchid + the exact paymentbatchid. No
-- issue specific to this proc was flagged in the audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummarypaymentbatchmethods(p_competitionid integer, p_ranchid integer, p_paymentbatchid integer)
 RETURNS TABLE("PaymentId" integer, "PaymentBatchId" integer, "PaymentMethodId" integer, "PaymentMethodType" text, "AmountPaid" numeric, "PaymentDate" timestamp with time zone, "InvoiceNumber" text, "TransactionReference" text)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_paymentbatchid is null or p_paymentbatchid <= 0 then
        raise exception 'Invalid payment batch id';
    end if;

    return query
    select
        p.paymentid::integer as "PaymentId",
        p.paymentbatchid::integer as "PaymentBatchId",
        p.paymentmethodid::integer as "PaymentMethodId",
        pm.paymentmethodtype::text as "PaymentMethodType",
        round(p.amountpaid, 2)::numeric as "AmountPaid",
        p.paymentdate as "PaymentDate",
        p.invoicenumber::text as "InvoiceNumber",
        p.transactionreference::text as "TransactionReference"
    from public.payment p
    inner join public.paymentmethod pm
        on pm.paymentmethodid = p.paymentmethodid
    inner join public.paymentbatch pb
        on pb.paymentbatchid = p.paymentbatchid
    inner join public.competition c
        on c.competitionid = pb.competitionid
    where pb.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and p.paymentbatchid = p_paymentbatchid
    order by
        pm.paymentmethodid,
        p.paymentid;
end;
$function$
