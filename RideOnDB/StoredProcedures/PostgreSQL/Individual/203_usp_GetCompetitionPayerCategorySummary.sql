-- ============================================================================
-- usp_getcompetitionpayercategorysummary - per-payer, per-category account summary
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217).
--
-- Updated 2026-08-07 (Secretary fine-presentation gap): this proc was missed
-- by the PR #327 fold of Organizer late-entry fines into the 'classes'
-- category (206/247/248/204 were fixed; this proc, which backs the Secretary
-- Payments page's per-payer category-summary sidebar, was not audited in
-- that slice and kept surfacing a standalone Organizer 'fine'/'קנסות' row).
-- The folded_charges CTE now folds chargeowner='Organizer' and
-- categorykey='fine' into 'classes', matching the same rule already live on
-- proc 206. Federation is untouched -- the fold condition is Organizer-only
-- by construction. Live-verified for competition 78 / payer 79: Organizer
-- classes goes from 250 to 300 (ChargeCount 1 -> 2), no standalone fine row,
-- stalls/shavings/Federation unchanged, Organizer grand total unchanged
-- (1060). Reproduced verbatim via pg_get_functiondef.
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
    with folded_charges as (
        select
            bc.chargeowner,
            case
                when bc.chargeowner = 'Organizer' and bc.categorykey = 'fine' then 'classes'
                else bc.categorykey
            end as categorykey,
            bc.chargestatus,
            bc.amounttopay
        from public.billcharge bc
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.chargestatus in ('Open', 'Paid')
    )
    select
        fc.chargeowner::text as "ChargeOwner",
        fc.categorykey::text as "CategoryKey",

        case
            when fc.categorykey = 'classes' then 'מקצים'
            when fc.categorykey = 'paid-time' then 'פייד טיים'
            when fc.categorykey = 'stalls' then 'תאים'
            when fc.categorykey = 'shavings' then 'נסורת'
            when fc.categorykey = 'fine' then 'קנסות'
            else fc.categorykey
        end::text as "CategoryName",

        count(*)::integer as "ChargeCount",

        coalesce(sum(
            case
                when fc.chargestatus in ('Open', 'Paid') then fc.amounttopay
                else 0
            end
        ), 0) as "TotalAmount",

        coalesce(sum(
            case
                when fc.chargestatus = 'Paid' then fc.amounttopay
                else 0
            end
        ), 0) as "PaidAmount",

        coalesce(sum(
            case
                when fc.chargestatus = 'Open' then fc.amounttopay
                else 0
            end
        ), 0) as "UnpaidAmount",

        case
            when coalesce(sum(
                case
                    when fc.chargestatus in ('Open', 'Paid') then fc.amounttopay
                    else 0
                end
            ), 0) = 0 then 'NoCharges'

            when coalesce(sum(
                case
                    when fc.chargestatus = 'Paid' then fc.amounttopay
                    else 0
                end
            ), 0) = 0 then 'Unpaid'

            when coalesce(sum(
                case
                    when fc.chargestatus = 'Open' then fc.amounttopay
                    else 0
                end
            ), 0) = 0 then 'Paid'

            else 'Partial'
        end::text as "PaymentStatus"

    from folded_charges fc
    group by
        fc.chargeowner,
        fc.categorykey
    order by
        case
            when fc.chargeowner = 'Organizer' then 1
            when fc.chargeowner = 'Federation' then 2
            else 3
        end,
        case
            when fc.categorykey = 'classes' then 1
            when fc.categorykey = 'paid-time' then 2
            when fc.categorykey = 'stalls' then 3
            when fc.categorykey = 'shavings' then 4
            when fc.categorykey = 'fine' then 5
            else 9
        end;
end;
$function$
