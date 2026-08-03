-- ============================================================================
-- usp_getcompetitionsummarypaymentbatchcharges - charges paid within one batch
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. This proc had
-- only been recovered at signature level during the initial Stage 1 sweep; a
-- fresh pg_get_functiondef read was performed before writing this file.
-- Reproduced verbatim (including the live body's own lack of a blank line
-- between the dollar-quote and `begin`, exactly as pg_get_functiondef
-- returned it); no behavioral change of any kind.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Correctly scoped by hostranchid + the exact paymentbatchid; only
-- returns bc.chargestatus = 'Paid' rows. No issue specific to this proc was
-- flagged in the audit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionsummarypaymentbatchcharges(p_competitionid integer, p_ranchid integer, p_paymentbatchid integer)
 RETURNS TABLE("BillChargeId" integer, "ChargeOwner" text, "CategoryKey" text, "SourceType" text, "SourceId" integer, "MainName" text, "ProductDetailsText" text, "RiderName" text, "HorseName" text, "BarnName" text, "AmountToPay" numeric, "Notes" text)
 LANGUAGE plpgsql
AS $function$begin
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
    with shavings_details as (
        select
            so.shavingsorderid,
            stall_payer.paidbypersonid,
            string_agg(
                concat_ws(
                    ' · ',
                    coalesce(h.horsename, 'ללא סוס'),
                    case
                        when h.barnname is not null and h.barnname <> ''
                        then '(' || h.barnname || ')'
                        else null
                    end,
                    sosb.bagquantityperstall::text || ' שקים'
                ),
                ', '
                order by h.horsename nulls last, sosb.stallbookingid
            )::text as detailstext,
            string_agg(
                coalesce(h.horsename, 'ללא סוס'),
                ', '
                order by h.horsename nulls last, sosb.stallbookingid
            )::text as horsenames,
            string_agg(
                h.barnname,
                ', '
                order by h.horsename nulls last, sosb.stallbookingid
            )::text as barnnames
        from public.shavingsorder so
        inner join public.shavingsorderforstallbooking sosb
            on sosb.shavingsorderid = so.shavingsorderid
        inner join public.stallbooking sb
            on sb.stallbookingid = sosb.stallbookingid
        inner join public.billcharge stall_payer
            on stall_payer.sourcetype = 'ProductRequest'
           and stall_payer.categorykey = 'stalls'
           and stall_payer.sourceid = sosb.stallbookingid
           and stall_payer.chargestatus in ('Open', 'Paid')
        left join public.horse h
            on h.horseid = sb.horseid
        group by
            so.shavingsorderid,
            stall_payer.paidbypersonid
    ),

    stall_details as (
        select
            sb.stallbookingid,
            concat_ws(
                ' · ',
                coalesce(h.horsename, case when sb.isfortack then 'תא ציוד' else 'ללא סוס' end),
                case
                    when h.barnname is not null and h.barnname <> ''
                    then '(' || h.barnname || ')'
                    else null
                end,
                case
                    when sb.startdate is not null and sb.enddate is not null
                    then to_char(sb.startdate, 'DD/MM/YYYY') || ' - ' || to_char(sb.enddate, 'DD/MM/YYYY')
                    else null
                end
            )::text as detailstext,
            h.horsename::text as horsename,
            h.barnname::text as barnname
        from public.stallbooking sb
        left join public.horse h
            on h.horseid = sb.horseid
    )

    select
        bc.billchargeid::integer as "BillChargeId",
        bc.chargeowner::text as "ChargeOwner",
        bc.categorykey::text as "CategoryKey",
        bc.sourcetype::text as "SourceType",
        bc.sourceid::integer as "SourceId",

        case
            when bc.sourcetype = 'Entry' then ct.classname::text
            when bc.sourcetype = 'Fine' then 'קנס שינוי/ביטול כניסה'
            when bc.sourcetype = 'PaidTimeRequest' then paid_product.productname::text
            when bc.sourcetype = 'ProductRequest' then product_request_product.productname::text
            else bc.categorykey::text
        end as "MainName",

        case
            when bc.sourcetype = 'Entry' then
                concat_ws(
                    ' · ',
                    ct.classname,
                    concat_ws(' ', rider_p.firstname, rider_p.lastname),
                    coalesce(entry_horse.horsename, ''),
                    case
                        when entry_horse.barnname is not null and entry_horse.barnname <> ''
                        then '(' || entry_horse.barnname || ')'
                        else null
                    end
                )::text

            when bc.sourcetype = 'Fine' then
                coalesce(bc.notes, 'קנס שינוי/ביטול כניסה')::text

            when bc.sourcetype = 'PaidTimeRequest' then
                concat_ws(
                    ' · ',
                    paid_product.productname,
                    concat_ws(' ', paid_rider_p.firstname, paid_rider_p.lastname),
                    coalesce(paid_horse.horsename, ''),
                    case
                        when paid_horse.barnname is not null and paid_horse.barnname <> ''
                        then '(' || paid_horse.barnname || ')'
                        else null
                    end
                )::text

            when bc.categorykey = 'stalls' then
                sd.detailstext

            when bc.categorykey = 'shavings' then
                shd.detailstext

            else
                product_request_product.productname::text
        end as "ProductDetailsText",

        case
            when bc.sourcetype = 'Entry'
            then concat_ws(' ', rider_p.firstname, rider_p.lastname)::text
            when bc.sourcetype = 'PaidTimeRequest'
            then concat_ws(' ', paid_rider_p.firstname, paid_rider_p.lastname)::text
            else null::text
        end as "RiderName",

        case
            when bc.sourcetype = 'Entry' then entry_horse.horsename::text
            when bc.sourcetype = 'PaidTimeRequest' then paid_horse.horsename::text
            when bc.categorykey = 'stalls' then sd.horsename::text
            when bc.categorykey = 'shavings' then shd.horsenames::text
            else null::text
        end as "HorseName",

        case
            when bc.sourcetype = 'Entry' then entry_horse.barnname::text
            when bc.sourcetype = 'PaidTimeRequest' then paid_horse.barnname::text
            when bc.categorykey = 'stalls' then sd.barnname::text
            when bc.categorykey = 'shavings' then shd.barnnames::text
            else null::text
        end as "BarnName",

        round(bc.amounttopay, 2)::numeric as "AmountToPay",
        bc.notes::text as "Notes"

    from public.billcharge bc
    inner join public.paymentbatch pb
        on pb.paymentbatchid = bc.paymentbatchid
    inner join public.competition c
        on c.competitionid = pb.competitionid

    left join public.entry e
        on bc.sourcetype = 'Entry'
       and e.entryid = bc.sourceid
    left join public.servicerequest entry_sr
        on entry_sr.srequestid = e.entryid
    left join public.classincompetition cic
        on cic.classincompid = e.classincompid
    left join public.classtype ct
        on ct.classtypeid = cic.classtypeid
    left join public.horse entry_horse
        on entry_horse.horseid = entry_sr.horseid
    left join public.federationmember rider_fm
        on rider_fm.federationmemberid = entry_sr.riderfederationmemberid
    left join public.person rider_p
        on rider_p.personid = rider_fm.federationmemberid

    left join public.paidtimerequest ptr
        on bc.sourcetype = 'PaidTimeRequest'
       and ptr.paidtimerequestid = bc.sourceid
    left join public.servicerequest paid_sr
        on paid_sr.srequestid = ptr.paidtimerequestid
    left join public.pricecatalog paid_pc
        on paid_pc.pricecatalogid = ptr.pricecatalogid
    left join public.product paid_product
        on paid_product.productid = paid_pc.productid
    left join public.horse paid_horse
        on paid_horse.horseid = paid_sr.horseid
    left join public.federationmember paid_rider_fm
        on paid_rider_fm.federationmemberid = paid_sr.riderfederationmemberid
    left join public.person paid_rider_p
        on paid_rider_p.personid = paid_rider_fm.federationmemberid

    left join public.productrequest pr
        on bc.sourcetype = 'ProductRequest'
       and pr.prequestid = bc.sourceid
    left join public.pricecatalog product_request_pc
        on product_request_pc.pricecatalogid = pr.pricecatalogid
    left join public.product product_request_product
        on product_request_product.productid = product_request_pc.productid

    left join stall_details sd
        on bc.categorykey = 'stalls'
       and sd.stallbookingid = bc.sourceid

    left join shavings_details shd
        on bc.categorykey = 'shavings'
       and shd.shavingsorderid = bc.sourceid
       and shd.paidbypersonid = bc.paidbypersonid

    where pb.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and bc.paymentbatchid = p_paymentbatchid
      and bc.chargestatus = 'Paid'
    order by
        bc.categorykey,
        bc.billchargeid;
end;$function$
