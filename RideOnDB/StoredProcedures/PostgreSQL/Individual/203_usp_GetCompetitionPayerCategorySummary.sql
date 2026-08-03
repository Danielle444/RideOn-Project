-- ============================================================================
-- usp_getcompetitionpayercategorysummary - per-payer, per-category account summary
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). No issue specific to this proc was flagged in that audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionpayercategorysummary(p_competitionid integer, p_payerpersonid integer)
 RETURNS TABLE("ChargeOwner" text, "CategoryKey" text, "CategoryName" text, "ChargeCount" integer, "TotalAmount" numeric, "PaidAmount" numeric, "UnpaidAmount" numeric, "PaymentStatus" text)
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
        bc.chargeowner::text as "ChargeOwner",
        bc.categorykey::text as "CategoryKey",

        case
            when bc.categorykey = 'classes' then 'מקצים'
            when bc.categorykey = 'paid-time' then 'פייד טיים'
            when bc.categorykey = 'stalls' then 'תאים'
            when bc.categorykey = 'shavings' then 'נסורת'
            when bc.categorykey = 'fine' then 'קנסות'
            else bc.categorykey
        end::text as "CategoryName",

        count(*)::integer as "ChargeCount",

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

    from public.billcharge bc
    where bc.competitionid = p_competitionid
      and bc.paidbypersonid = p_payerpersonid
      and bc.chargestatus in ('Open', 'Paid')
    group by
        bc.chargeowner,
        bc.categorykey
    order by
        case
            when bc.chargeowner = 'Organizer' then 1
            when bc.chargeowner = 'Federation' then 2
            else 3
        end,
        case
            when bc.categorykey = 'classes' then 1
            when bc.categorykey = 'paid-time' then 2
            when bc.categorykey = 'stalls' then 3
            when bc.categorykey = 'shavings' then 4
            when bc.categorykey = 'fine' then 5
            else 9
        end;
end;
$function$
