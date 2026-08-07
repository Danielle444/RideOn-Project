-- ============================================================================
-- usp_getcompetitionpayercharges - unified per-payer charge feed (entries/stalls/paid-time/products)
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. This proc had
-- only been recovered at signature level during the initial Stage 1 sweep; a
-- fresh pg_get_functiondef read was performed before writing this file, per
-- the recovery rule that signature-only procs must be re-fetched, not
-- reconstructed. Reproduced verbatim; no behavioral change of any kind.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). No issue specific to this proc was flagged in the audit beyond
-- what is inherited from billcharge's own known gaps (no double-payment
-- check, "CanSelectForPayment" is a pure chargestatus/paymentbatchid check).
--
-- MODIFIED 2026-08-07 (HostSecretary fine-presentation slice, live-verified
-- against pg_get_functiondef immediately before this change): an Entry-created
-- late-entry fine row (sourcetype='Fine', categorykey='fine', sourceid=
-- EntryId, chargeowner='Organizer' always) previously fell through every
-- sourcetype='Entry' gate below and rendered with MainName='fine',
-- RiderName/HorseName/BarnName/CoachName all null. The `entry e` join and the
-- MainName/RiderName/HorseName/BarnName/CoachName CASE expressions now also
-- match `bc.sourcetype = 'Fine' and bc.categorykey = 'fine'`, so a fine row
-- resolves the same class/rider/horse/barn/coach context as its sibling base
-- charge. This does NOT touch ChangeEntryRequest fines (sourcetype='Fine',
-- categorykey='classes', sourceid=ChangeEntryRequestId) - the added condition
-- requires categorykey='fine', which CER fine rows never carry (verified
-- live 2026-08-07). CER fine rows keep falling through to the pre-existing
-- `else` branches exactly as before (MainName=literal 'classes', no rider/
-- horse/coach) - unchanged, flagged as a known follow-up, not fixed here.
-- No output column added or removed; return signature unchanged.
--
-- MODIFIED 2026-08-07 (HostSecretary fine-presentation slice, ChangeEntryRequest
-- coverage): closes the follow-up noted above. Locked business rule: an Entry
-- has at most ONE payable Organizer fine - never aggregated, never summed,
-- never picked arbitrarily. A new trailing output column, "ResolvedEntryId",
-- carries "the entry this row is really about": bc.sourceid for a base Entry
-- charge or an Entry-created fine (sourceid already IS the entryid for both),
-- and coalesce(cer.newentryid, cer.originalentryid) for a ChangeEntryRequest
-- fine (categorykey='classes', sourcetype='Fine', sourceid=
-- ChangeEntryRequestId) - approved change -> newEntryId, cancellation with no
-- replacement -> originalEntryId fallback, both proven live against
-- usp_answerchangeentryrequest's own code (its change branch raises unless
-- newentryid is set; its cancellation branch never touches newentryid at
-- all). This is a genuinely NEW column, not a redefinition of SourceId's
-- existing meaning (SourceId still always means "the raw FK target implied by
-- SourceType", e.g. a ChangeEntryRequestId for a CER fine row) - the DAL/DTO/
-- frontend chain was traced end to end before this change (a new SQL column
-- does not reach the API by itself; CompetitionPayerChargeItem.cs and
-- CompetitionPaymentDAL.cs were updated in the same slice). The `entry e`
-- join and the MainName/RiderName/HorseName/BarnName/CoachName CASE
-- expressions now also match `sourcetype='Fine' and categorykey='classes'`,
-- resolving via ResolvedEntryId, so a CER fine row (e.g. CER #2/billchargeid
-- 128, a cancellation with no live base charge) now shows its real class/
-- rider/horse context instead of a generic literal "classes" - live-verified.
-- A new upfront integrity guard (v_integrity_entryid/v_integrity_billchargeids)
-- raises before the main query runs if any resolved entry for this payer has
-- more than one payable (Open/Paid) Organizer fine - loud, not silent, scoped
-- to this payer's own charges only. Adding this column changes the return
-- type, so this deployment is DROP FUNCTION + CREATE FUNCTION (a plain
-- CREATE OR REPLACE cannot add an output column) - owner/ACL restoration
-- verified as part of the deployment package, since a DROP removes them.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getcompetitionpayercharges(p_competitionid integer, p_payerpersonid integer, p_chargeowner text DEFAULT NULL::text, p_categorykey text DEFAULT NULL::text)
 RETURNS TABLE("BillChargeId" integer, "BillId" integer, "ChargeOwner" text, "CategoryKey" text, "SourceType" text, "SourceId" integer, "DisplayRowKey" text, "StallBookingId" integer, "DisplayDate" date, "StartDate" date, "EndDate" date, "RequestedDeliveryTime" timestamp without time zone, "MainName" text, "RiderName" text, "HorseName" text, "BarnName" text, "CoachName" text, "PayerName" text, "OrderedByName" text, "StallTypeName" text, "StallNumber" text, "CompoundName" text, "BagQuantity" integer, "SplitPayersCount" integer, "SplitPaymentText" text, "SplitPayersJson" text, "StallAssignmentText" text, "AmountToPay" numeric, "ChargeStatus" text, "PaymentBatchId" integer, "InvoiceNumber" text, "CanSelectForPayment" boolean, "ResolvedEntryId" integer)
 LANGUAGE plpgsql
AS $function$
declare
    v_integrity_entryid integer;
    v_integrity_billchargeids integer[];
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_payerpersonid is null or p_payerpersonid <= 0 then
        raise exception 'Invalid payer person id';
    end if;

    -- Data-integrity guard (locked business rule: at most one payable
    -- Organizer fine per Entry). Scoped to this payer's own charges only -
    -- a bad row for an unrelated payer never breaks this call.
    select
        resolved.resolvedentryid,
        array_agg(resolved.billchargeid order by resolved.billchargeid)
    into
        v_integrity_entryid,
        v_integrity_billchargeids
    from (
        select
            bc.billchargeid,
            bc.chargeowner,
            case
                when bc.categorykey = 'fine' and bc.sourcetype = 'Fine'
                    then bc.sourceid
                when bc.categorykey = 'classes' and bc.sourcetype = 'Fine'
                    then coalesce(cer.newentryid, cer.originalentryid)
            end as resolvedentryid
        from public.billcharge bc
        left join public.changeentryrequest cer
            on bc.categorykey = 'classes' and bc.sourcetype = 'Fine'
           and cer.changeentryrequestid = bc.sourceid
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.sourcetype = 'Fine'
          and bc.chargestatus in ('Open', 'Paid')
    ) resolved
    where resolved.resolvedentryid is not null
    group by resolved.resolvedentryid, resolved.chargeowner
    having count(*) > 1
    limit 1;

    if v_integrity_entryid is not null then
        raise exception 'Data integrity violation: % payable fines resolve to Entry % (billChargeIds: %) - refusing to compute charges',
            array_length(v_integrity_billchargeids, 1), v_integrity_entryid, v_integrity_billchargeids;
    end if;

    return query
    with source_split_payers as (
        select
            bc.competitionid,
            bc.chargeowner,
            bc.categorykey,
            bc.sourcetype,
            bc.sourceid,
            count(distinct bc.paidbypersonid)::integer as splitpayerscount,
            jsonb_agg(
                jsonb_build_object(
                    'payerPersonId', bc.paidbypersonid,
                    'payerName', concat_ws(' ', p.firstname, p.lastname),
                    'amountToPay', bc.amounttopay,
                    'chargeStatus', bc.chargestatus,
                    'isCurrentPayer', bc.paidbypersonid = p_payerpersonid
                )
                order by concat_ws(' ', p.firstname, p.lastname)
            )::text as splitpayersjson
        from public.billcharge bc
        inner join public.person p
            on p.personid = bc.paidbypersonid
        where bc.competitionid = p_competitionid
          and bc.chargestatus in ('Open', 'Paid')
        group by
            bc.competitionid,
            bc.chargeowner,
            bc.categorykey,
            bc.sourcetype,
            bc.sourceid
    ),

    stall_payers as (
        select
            bc.sourceid as stallbookingid,
            bc.paidbypersonid,
            concat_ws(' ', p.firstname, p.lastname)::text as payername,
            bc.amounttopay,
            bc.chargestatus
        from public.billcharge bc
        inner join public.person p
            on p.personid = bc.paidbypersonid
        where bc.competitionid = p_competitionid
          and bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'stalls'
          and bc.chargestatus in ('Open', 'Paid')
    ),

    stall_payer_count as (
        select
            sp.stallbookingid,
            count(distinct sp.paidbypersonid)::integer as payercount
        from stall_payers sp
        group by sp.stallbookingid
    ),

    stall_details as (
        select
            sb.stallbookingid,
            sb.startdate,
            sb.enddate,
            st.stallnumber::text as stallnumber,
            sc.compoundname::text as compoundname,
            stall_product.productname::text as stalltypename,
            h.horsename::text as horsename,
            h.barnname::text as barnname,
            case
                when sb.isfortack = true then 'תא ציוד'
                when h.horseid is not null then
                    concat_ws(
                        ' · ',
                        case
                            when st.stallnumber is null then 'טרם שובץ תא'
                            else 'תא ' || st.stallnumber::text
                        end,
                        coalesce(h.barnname, h.horsename)
                    )
                else
                    concat_ws(
                        ' · ',
                        case
                            when st.stallnumber is null then 'טרם שובץ תא'
                            else 'תא ' || st.stallnumber::text
                        end,
                        'ללא סוס'
                    )
            end::text as stallassignmenttext
        from public.stallbooking sb
        left join public.stall st
            on st.ranchid = sb.ranchid
           and st.compoundid = sb.compoundid
           and st.stallid = sb.stallid
        left join public.stallcompound sc
            on sc.ranchid = sb.ranchid
           and sc.compoundid = sb.compoundid
        left join public.product stall_product
            on stall_product.productid = st.stalltype
        left join public.horse h
            on h.horseid = sb.horseid
    ),

    shavings_stall_split as (
        select
            so.shavingsorderid,
            sosb.stallbookingid,
            jsonb_agg(
                jsonb_build_object(
                    'payerPersonId', sp.paidbypersonid,
                    'payerName', sp.payername,
                    'amountToPay',
                        ceil(
                            (sosb.bagquantityperstall::numeric * pc.itemprice)
                            / nullif(spc.payercount, 0)
                        ),
                    'chargeStatus', coalesce(shavings_bc.chargestatus, 'Open'),
                    'isCurrentPayer', sp.paidbypersonid = p_payerpersonid
                )
                order by sp.payername
            )::text as splitpayersjson,
            max(spc.payercount)::integer as splitpayerscount
        from public.shavingsorder so
        inner join public.productrequest pr
            on pr.prequestid = so.shavingsorderid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.shavingsorderforstallbooking sosb
            on sosb.shavingsorderid = so.shavingsorderid
        inner join stall_payer_count spc
            on spc.stallbookingid = sosb.stallbookingid
        inner join stall_payers sp
            on sp.stallbookingid = sosb.stallbookingid
        left join public.billcharge shavings_bc
            on shavings_bc.competitionid = pr.competitionid
           and shavings_bc.categorykey = 'shavings'
           and shavings_bc.sourcetype = 'ProductRequest'
           and shavings_bc.sourceid = so.shavingsorderid
           and shavings_bc.paidbypersonid = sp.paidbypersonid
           and shavings_bc.chargestatus in ('Open', 'Paid')
        where pr.competitionid = p_competitionid
        group by
            so.shavingsorderid,
            sosb.stallbookingid
    ),

    federation_invoice_references as (
        select
            fca.billchargeid,
            string_agg(
                distinct fec.externalreference,
                ', '
                order by fec.externalreference
            )::text as federationinvoicereferences
        from public.federationcreditallocation fca
        inner join public.federationexternalcredit fec
            on fec.federationexternalcreditid = fca.federationexternalcreditid
        where fec.externalreference is not null
          and trim(fec.externalreference) <> ''
        group by
            fca.billchargeid
    )

    select
        bc.billchargeid::integer as "BillChargeId",
        bc.billid::integer as "BillId",
        bc.chargeowner::text as "ChargeOwner",
        bc.categorykey::text as "CategoryKey",
        bc.sourcetype::text as "SourceType",
        bc.sourceid::integer as "SourceId",
        bc.billchargeid::text as "DisplayRowKey",

        case
            when bc.categorykey = 'stalls' then sb.stallbookingid
            else null::integer
        end as "StallBookingId",

        case
            when bc.sourcetype = 'Entry'
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'fine')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'classes')
            then cic.classdatetime::date
            when bc.sourcetype = 'PaidTimeRequest' then ptsic.slotdate::date
            when bc.categorykey = 'stalls' then sd.startdate
            when bc.sourcetype = 'ProductRequest' then pr.prequestdatetime::date
            else bc.createdat::date
        end as "DisplayDate",

        case
            when bc.categorykey = 'stalls' then sd.startdate
            else null::date
        end as "StartDate",

        case
            when bc.categorykey = 'stalls' then sd.enddate
            else null::date
        end as "EndDate",

        null::timestamp without time zone as "RequestedDeliveryTime",

        case
            when bc.sourcetype = 'Entry'
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'fine')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'classes')
            then ct.classname::text
            when bc.sourcetype = 'PaidTimeRequest' then prod.productname::text
            when bc.categorykey = 'stalls' then coalesce(sd.stalltypename, prod_pr.productname)::text
            when bc.sourcetype = 'ProductRequest' then prod_pr.productname::text
            else bc.categorykey::text
        end as "MainName",

        case
            when bc.sourcetype in ('Entry', 'PaidTimeRequest')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'fine')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'classes')
            then concat_ws(' ', rider_p.firstname, rider_p.lastname)::text
            else null::text
        end as "RiderName",

        case
            when bc.sourcetype in ('Entry', 'PaidTimeRequest')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'fine')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'classes')
            then h.horsename::text
            when bc.categorykey = 'stalls' then sd.horsename::text
            else null::text
        end as "HorseName",

        case
            when bc.sourcetype in ('Entry', 'PaidTimeRequest')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'fine')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'classes')
            then h.barnname::text
            when bc.categorykey = 'stalls' then sd.barnname::text
            else null::text
        end as "BarnName",

        case
            when bc.sourcetype in ('Entry', 'PaidTimeRequest')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'fine')
              or (bc.sourcetype = 'Fine' and bc.categorykey = 'classes')
            then concat_ws(' ', coach_p.firstname, coach_p.lastname)::text
            else null::text
        end as "CoachName",

        concat_ws(' ', payer_p.firstname, payer_p.lastname)::text as "PayerName",

        case
            when pr_ordered_p.personid is not null
            then concat_ws(' ', pr_ordered_p.firstname, pr_ordered_p.lastname)::text
            else null::text
        end as "OrderedByName",

        case
            when bc.categorykey = 'stalls'
            then coalesce(sd.stalltypename, prod_pr.productname)::text
            else null::text
        end as "StallTypeName",

        case
            when bc.categorykey = 'stalls' then sd.stallnumber::text
            else null::text
        end as "StallNumber",

        case
            when bc.categorykey = 'stalls' then sd.compoundname::text
            else null::text
        end as "CompoundName",

        null::integer as "BagQuantity",

        coalesce(ssp.splitpayerscount, 1)::integer as "SplitPayersCount",

        case
            when coalesce(ssp.splitpayerscount, 1) > 1
            then 'מתחלק בין ' || ssp.splitpayerscount::text || ' משלמים'
            else 'משלם יחיד'
        end::text as "SplitPaymentText",

        coalesce(ssp.splitpayersjson, '[]')::text as "SplitPayersJson",

        case
            when bc.categorykey = 'stalls' then sd.stallassignmenttext
            else null::text
        end as "StallAssignmentText",

        bc.amounttopay::numeric as "AmountToPay",
        bc.chargestatus::text as "ChargeStatus",
        bc.paymentbatchid::integer as "PaymentBatchId",

        coalesce(
            pb.invoicenumber::text,
            fir.federationinvoicereferences
        ) as "InvoiceNumber",

        (bc.chargestatus = 'Open' and bc.paymentbatchid is null)::boolean as "CanSelectForPayment",

        case
            when bc.sourcetype = 'Entry' then bc.sourceid
            when bc.sourcetype = 'Fine' and bc.categorykey = 'fine' then bc.sourceid
            when bc.sourcetype = 'Fine' and bc.categorykey = 'classes'
                then coalesce(cer.newentryid, cer.originalentryid)
            else null::integer
        end as "ResolvedEntryId"

    from public.billcharge bc

    inner join public.person payer_p
        on payer_p.personid = bc.paidbypersonid

    left join public.paymentbatch pb
        on pb.paymentbatchid = bc.paymentbatchid

    left join federation_invoice_references fir
        on fir.billchargeid = bc.billchargeid

    left join source_split_payers ssp
        on ssp.competitionid = bc.competitionid
       and ssp.chargeowner = bc.chargeowner
       and ssp.categorykey = bc.categorykey
       and ssp.sourcetype = bc.sourcetype
       and ssp.sourceid = bc.sourceid

    left join public.changeentryrequest cer
        on bc.sourcetype = 'Fine' and bc.categorykey = 'classes'
       and cer.changeentryrequestid = bc.sourceid

    left join public.entry e
        on (
            bc.sourcetype = 'Entry'
            or (bc.sourcetype = 'Fine' and bc.categorykey = 'fine')
            or (bc.sourcetype = 'Fine' and bc.categorykey = 'classes')
        )
       and e.entryid = case
            when bc.sourcetype = 'Fine' and bc.categorykey = 'classes'
                then coalesce(cer.newentryid, cer.originalentryid)
            else bc.sourceid
        end

    left join public.servicerequest sr_entry
        on sr_entry.srequestid = e.entryid

    left join public.classincompetition cic
        on cic.classincompid = e.classincompid

    left join public.classtype ct
        on ct.classtypeid = cic.classtypeid

    left join public.horse h_entry
        on h_entry.horseid = sr_entry.horseid

    left join public.paidtimerequest ptr
        on bc.sourcetype = 'PaidTimeRequest'
       and ptr.paidtimerequestid = bc.sourceid

    left join public.servicerequest sr_paidtime
        on sr_paidtime.srequestid = ptr.paidtimerequestid

    left join public.paidtimeslotincompetition ptsic
        on ptsic.paidtimeslotincompid = ptr.requestedcompslotid

    left join public.pricecatalog pc_paidtime
        on pc_paidtime.pricecatalogid = ptr.pricecatalogid

    left join public.product prod
        on prod.productid = pc_paidtime.productid

    left join public.horse h_paidtime
        on h_paidtime.horseid = sr_paidtime.horseid

    left join public.productrequest pr
        on bc.sourcetype = 'ProductRequest'
       and pr.prequestid = bc.sourceid

    left join public.pricecatalog pc_pr
        on pc_pr.pricecatalogid = pr.pricecatalogid

    left join public.product prod_pr
        on prod_pr.productid = pc_pr.productid

    left join public.systemuser pr_ordered_su
        on pr_ordered_su.systemuserid = pr.orderedbysystemuserid

    left join public.person pr_ordered_p
        on pr_ordered_p.personid = pr_ordered_su.systemuserid

    left join public.stallbooking sb
        on bc.categorykey = 'stalls'
       and sb.stallbookingid = bc.sourceid

    left join stall_details sd
        on sd.stallbookingid = sb.stallbookingid

    left join public.federationmember rider_fm
        on rider_fm.federationmemberid =
            coalesce(
                sr_entry.riderfederationmemberid,
                sr_paidtime.riderfederationmemberid
            )

    left join public.person rider_p
        on rider_p.personid = rider_fm.federationmemberid

    left join public.federationmember coach_fm
        on coach_fm.federationmemberid =
            coalesce(
                sr_entry.coachfederationmemberid,
                sr_paidtime.coachfederationmemberid
            )

    left join public.person coach_p
        on coach_p.personid = coach_fm.federationmemberid

    left join public.horse h
        on h.horseid =
            coalesce(
                h_entry.horseid,
                h_paidtime.horseid
            )

    where bc.competitionid = p_competitionid
      and bc.paidbypersonid = p_payerpersonid
      and bc.chargestatus in ('Open', 'Paid')
      and bc.categorykey <> 'shavings'
      and (
          p_chargeowner is null
          or bc.chargeowner = p_chargeowner
      )
      and (
          p_categorykey is null
          or bc.categorykey = p_categorykey
      )

    union all

    select
        bc.billchargeid::integer as "BillChargeId",
        bc.billid::integer as "BillId",
        bc.chargeowner::text as "ChargeOwner",
        bc.categorykey::text as "CategoryKey",
        bc.sourcetype::text as "SourceType",
        bc.sourceid::integer as "SourceId",
        (bc.billchargeid::text || '-' || sosb.stallbookingid::text) as "DisplayRowKey",
        sosb.stallbookingid::integer as "StallBookingId",

        pr.prequestdatetime::date as "DisplayDate",

        null::date as "StartDate",

        null::date as "EndDate",

        so.requesteddeliverytime as "RequestedDeliveryTime",

        prod_pr.productname::text as "MainName",

        null::text as "RiderName",

        h.horsename::text as "HorseName",

        h.barnname::text as "BarnName",

        null::text as "CoachName",

        concat_ws(' ', payer_p.firstname, payer_p.lastname)::text as "PayerName",

        concat_ws(' ', ordered_p.firstname, ordered_p.lastname)::text as "OrderedByName",

        null::text as "StallTypeName",

        st.stallnumber::text as "StallNumber",

        sc.compoundname::text as "CompoundName",

        sosb.bagquantityperstall::integer as "BagQuantity",

        coalesce(shsplit.splitpayerscount, 1)::integer as "SplitPayersCount",

        case
            when coalesce(shsplit.splitpayerscount, 1) > 1
            then 'מתחלק בין ' || shsplit.splitpayerscount::text || ' משלמים'
            else 'משלם יחיד'
        end::text as "SplitPaymentText",

        coalesce(shsplit.splitpayersjson, '[]')::text as "SplitPayersJson",

        concat_ws(
            ' · ',
            case
                when st.stallnumber is null then 'טרם שובץ תא'
                else 'תא ' || st.stallnumber::text
            end,
            coalesce(h.barnname, h.horsename, 'ללא סוס'),
            sosb.bagquantityperstall::text || ' שקים'
        )::text as "StallAssignmentText",

        ceil(
            (sosb.bagquantityperstall::numeric * pc_pr.itemprice)
            / nullif(spc.payercount, 0)
        )::numeric as "AmountToPay",

        bc.chargestatus::text as "ChargeStatus",
        bc.paymentbatchid::integer as "PaymentBatchId",

        coalesce(
            pb.invoicenumber::text,
            fir.federationinvoicereferences
        ) as "InvoiceNumber",

        (bc.chargestatus = 'Open' and bc.paymentbatchid is null)::boolean as "CanSelectForPayment",

        null::integer as "ResolvedEntryId"

    from public.billcharge bc

    inner join public.person payer_p
        on payer_p.personid = bc.paidbypersonid

    left join public.paymentbatch pb
        on pb.paymentbatchid = bc.paymentbatchid

    left join federation_invoice_references fir
        on fir.billchargeid = bc.billchargeid

    inner join public.shavingsorder so
        on so.shavingsorderid = bc.sourceid

    inner join public.productrequest pr
        on pr.prequestid = so.shavingsorderid

    inner join public.pricecatalog pc_pr
        on pc_pr.pricecatalogid = pr.pricecatalogid

    inner join public.product prod_pr
        on prod_pr.productid = pc_pr.productid

    inner join public.systemuser ordered_su
        on ordered_su.systemuserid = pr.orderedbysystemuserid

    inner join public.person ordered_p
        on ordered_p.personid = ordered_su.systemuserid

    inner join public.shavingsorderforstallbooking sosb
        on sosb.shavingsorderid = so.shavingsorderid

    inner join public.stallbooking sb
        on sb.stallbookingid = sosb.stallbookingid

    inner join stall_payer_count spc
        on spc.stallbookingid = sb.stallbookingid

    inner join stall_payers current_stall_payer
        on current_stall_payer.stallbookingid = sb.stallbookingid
       and current_stall_payer.paidbypersonid = p_payerpersonid

    left join shavings_stall_split shsplit
        on shsplit.shavingsorderid = so.shavingsorderid
       and shsplit.stallbookingid = sosb.stallbookingid

    left join public.stall st
        on st.ranchid = sb.ranchid
       and st.compoundid = sb.compoundid
       and st.stallid = sb.stallid

    left join public.stallcompound sc
        on sc.ranchid = sb.ranchid
       and sc.compoundid = sb.compoundid

    left join public.horse h
        on h.horseid = sb.horseid

    where bc.competitionid = p_competitionid
      and bc.paidbypersonid = p_payerpersonid
      and bc.chargestatus in ('Open', 'Paid')
      and bc.categorykey = 'shavings'
      and bc.sourcetype = 'ProductRequest'
      and (
          p_chargeowner is null
          or bc.chargeowner = p_chargeowner
      )
      and (
          p_categorykey is null
          or bc.categorykey = p_categorykey
      )

    order by
        "DisplayDate" asc nulls last,
        "ChargeOwner",
        "CategoryKey",
        "BillChargeId",
        "StallBookingId" nulls last;
end;
$function$
