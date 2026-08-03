-- ============================================================================
-- usp_getcompetitionpayeraccountsummary - per-payer, per-chargeowner account summary
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). No issue specific to this proc was flagged in that audit. Note
-- for context: "PaidAmount" here is purely chargestatus-driven (the charge's
-- own face value once marked Paid), so it would read as normal/consistent
-- even for a charge affected by the double-payment gap documented on 193/199/
-- 200 - the leak is invisible at this summary level and only detectable by
-- cross-referencing paymentbatchid against federationcreditallocation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionpayeraccountsummary(p_competitionid integer, p_payerpersonid integer)
 RETURNS TABLE("BillId" integer, "PayerPersonId" integer, "PayerName" text, "ChargeOwner" text, "TotalAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric, "PaymentStatus" text)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_payerpersonid is null or p_payerpersonid <= 0 then
        raise exception 'Invalid payer person id';
    end if;

    return query
    select
        b.billid as "BillId",
        b.paidbypersonid as "PayerPersonId",
        concat_ws(' ', p.firstname, p.lastname)::text as "PayerName",
        bc.chargeowner::text as "ChargeOwner",

        coalesce(sum(
            case
                when bc.chargestatus in ('Open', 'Paid') then bc.amounttopay
                else 0
            end
        ), 0) as "TotalAmount",

        coalesce(sum(
            case
                when bc.chargestatus = 'Paid' then bc.amounttopay
                else 0
            end
        ), 0) as "PaidAmount",

        coalesce(sum(
            case
                when bc.chargestatus = 'Open' then bc.amounttopay
                else 0
            end
        ), 0) as "UnpaidAmount",

        case
            when coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid') then bc.amounttopay
                    else 0
                end
            ), 0) = 0 then 'NoCharges'

            when coalesce(sum(
                case
                    when bc.chargestatus = 'Paid' then bc.amounttopay
                    else 0
                end
            ), 0) = 0 then 'Unpaid'

            when coalesce(sum(
                case
                    when bc.chargestatus = 'Open' then bc.amounttopay
                    else 0
                end
            ), 0) = 0 then 'Paid'

            else 'Partial'
        end::text as "PaymentStatus"

    from public.bill b
    inner join public.person p
        on p.personid = b.paidbypersonid
    inner join public.billcharge bc
        on bc.billid = b.billid
       and bc.competitionid = p_competitionid
       and bc.chargestatus in ('Open', 'Paid')
    where b.competitionid = p_competitionid
      and b.paidbypersonid = p_payerpersonid
    group by
        b.billid,
        b.paidbypersonid,
        p.firstname,
        p.lastname,
        bc.chargeowner
    order by
        case
            when bc.chargeowner = 'Organizer' then 1
            when bc.chargeowner = 'Federation' then 2
            else 3
        end;
end;
$function$
