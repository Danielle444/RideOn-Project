-- =============================================================================
-- usp_GetSecretaryCompetitionChangeRequests
-- Secretary Change Tracking list (entry + product change/cancel requests).
--
-- CAP-1a (SPEC-change-tracking-improvements): hide PAID Pending "zombie" rows.
-- A change/cancel request whose source item is already Paid can never be
-- answered (both answer procs RAISE P0001 above the approve/reject split), so it
-- must not appear as a Pending row. This is a pure WHERE-clause addition to each
-- UNION ALL branch, mirroring the answer procs' exact paid definition
-- (billcharge.chargestatus='Paid', keyed by sourcetype/sourceid). It is
-- Pending-scoped: answered (Approved/Rejected) history stays visible even if the
-- source is paid. 20 output columns unchanged -> CREATE OR REPLACE is safe.
--
-- These procs are live-only historically; this file is the first committed copy.
-- Body captured from live via pg_get_functiondef on 2026-07-27.
--
-- fix/federation-fine-window-timezone-complete: this proc's preview logic
-- (the "AmountAfter" case expression and the effective_fine lateral join,
-- both keyed off cer.requestdatetime vs. registrationenddate/
-- competitionstartdate) used the same implicit-timezone
-- requestdatetime::date pattern as usp_answerchangeentryrequestsecured (221)
-- before that function's own fix. Since 179 is the read/preview path shown
-- to the secretary before answering, and 221 is the write/approval path,
-- the two must resolve the same Israel-local business date for the same
-- requestdatetime or the previewed amount can disagree with the amount
-- actually charged on approval near the Asia/Jerusalem midnight boundary.
-- All nine comparisons below now wrap cer.requestdatetime in
-- (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date, matching 221's
-- convention. No column, alias, join, or unrelated logic changed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.usp_getsecretarycompetitionchangerequests(p_competitionid integer, p_ranchid integer, p_status text DEFAULT 'Pending'::text)
 RETURNS TABLE("RequestId" integer, "RequestSource" text, "RequestType" text, "CompetitionId" integer, "CompetitionName" text, "RequestDate" timestamp with time zone, "RequestedByPersonId" integer, "RequestedByName" text, "EntityType" text, "EntityName" text, "BeforeText" text, "AfterText" text, "Status" text, "IsCancelled" boolean, "OriginalEntityId" integer, "NewEntityId" integer, "FineId" integer, "FineAmountSnapshot" numeric, "AmountBefore" numeric, "AmountAfter" numeric)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    return query

    /* =========================
       Entry change requests
       ========================= */
    select
        cer.changeentryrequestid::integer as "RequestId",
        'Entry'::text as "RequestSource",
        case
            when cer.iscancelled = true then 'ביטול מקצה'
            else 'שינוי מקצה'
        end as "RequestType",

        original_cic.competitionid::integer as "CompetitionId",
        c.competitionname::text as "CompetitionName",

        cer.requestdatetime as "RequestDate",

        original_sr.orderedbysystemuserid::integer as "RequestedByPersonId",
        concat_ws(' ', requested_by.firstname, requested_by.lastname)::text as "RequestedByName",

        'מקצה'::text as "EntityType",

        concat_ws(
            ' - ',
            original_ct.classname,
            original_h.horsename
        )::text as "EntityName",

        concat_ws(
            ' | ',
            'מקצה: ' || original_ct.classname,
            'סוס: ' || original_h.horsename,
            'רוכב: ' || concat_ws(' ', original_rider_p.firstname, original_rider_p.lastname),
            'משלם: ' || concat_ws(' ', original_payer_p.firstname, original_payer_p.lastname)
        )::text as "BeforeText",

        case
            when cer.iscancelled = true then
                'ביטול הרשמה למקצה'::text
            else
                concat_ws(
                    ' | ',
                    'מקצה: ' || new_ct.classname,
                    'סוס: ' || new_h.horsename,
                    'רוכב: ' || concat_ws(' ', new_rider_p.firstname, new_rider_p.lastname),
                    'משלם: ' || concat_ws(' ', new_payer_p.firstname, new_payer_p.lastname)
                )::text
        end as "AfterText",

        cer.status::text as "Status",
        cer.iscancelled::boolean as "IsCancelled",

        cer.originalentryid::integer as "OriginalEntityId",
        cer.newentryid::integer as "NewEntityId",

        coalesce(
            cer.fineid,
            effective_fine.fineid,
            new_f.fineid,
            original_f.fineid
        )::integer as "FineId",

        coalesce(
            cer.fineamountsnapshot,
            effective_fine.fineamount,
            new_f.fineamount,
            original_f.fineamount
        )::numeric as "FineAmountSnapshot",

        (
            coalesce(original_cic.organizercost, 0)
            + coalesce(original_cic.federationcost, 0)
            + coalesce(original_f.fineamount, 0)
        )::numeric as "AmountBefore",

        case
            when cer.iscancelled = true
                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date <= c.registrationenddate then
                0

            when cer.iscancelled = true
                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > c.registrationenddate
                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < c.competitionstartdate then
                coalesce(
                    cer.fineamountsnapshot,
                    effective_fine.fineamount,
                    0
                )

            when cer.iscancelled = true
                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date >= c.competitionstartdate then
                (
                    coalesce(original_cic.organizercost, 0)
                    + coalesce(original_cic.federationcost, 0)
                    + coalesce(original_f.fineamount, 0)
                )

            else
                (
                    coalesce(new_cic.organizercost, 0)
                    + coalesce(new_cic.federationcost, 0)
                    + coalesce(
                        cer.fineamountsnapshot,
                        effective_fine.fineamount,
                        new_f.fineamount,
                        0
                    )
                )
        end::numeric as "AmountAfter"

    from public.changeentryrequest cer

    inner join public.entry original_e
        on original_e.entryid = cer.originalentryid

    inner join public.servicerequest original_sr
        on original_sr.srequestid = original_e.entryid

    inner join public.bill original_b
        on original_b.billid = original_sr.billid

    inner join public.person original_payer_p
        on original_payer_p.personid = original_b.paidbypersonid

    inner join public.horse original_h
        on original_h.horseid = original_sr.horseid

    inner join public.federationmember original_rider_fm
        on original_rider_fm.federationmemberid = original_sr.riderfederationmemberid

    inner join public.person original_rider_p
        on original_rider_p.personid = original_rider_fm.federationmemberid

    inner join public.classincompetition original_cic
        on original_cic.classincompid = original_e.classincompid

    inner join public.classtype original_ct
        on original_ct.classtypeid = original_cic.classtypeid

    inner join public.competition c
        on c.competitionid = original_cic.competitionid

    inner join public.person requested_by
        on requested_by.personid = original_sr.orderedbysystemuserid

    left join public.fine original_f
        on original_f.fineid = original_e.fineid

    left join public.entry new_e
        on new_e.entryid = cer.newentryid

    left join public.servicerequest new_sr
        on new_sr.srequestid = new_e.entryid

    left join public.bill new_b
        on new_b.billid = new_sr.billid

    left join public.person new_payer_p
        on new_payer_p.personid = new_b.paidbypersonid

    left join public.horse new_h
        on new_h.horseid = new_sr.horseid

    left join public.federationmember new_rider_fm
        on new_rider_fm.federationmemberid = new_sr.riderfederationmemberid

    left join public.person new_rider_p
        on new_rider_p.personid = new_rider_fm.federationmemberid

    left join public.classincompetition new_cic
        on new_cic.classincompid = new_e.classincompid

    left join public.classtype new_ct
        on new_ct.classtypeid = new_cic.classtypeid

    left join public.fine new_f
        on new_f.fineid = new_e.fineid

    left join lateral (
        select
            f.fineid,
            f.fineamount
        from public.fine f
        where f.isactive = true
          and (
                (
                    cer.iscancelled = true
                    and f.finereason = 'EntryCancellation'
                    and f.triggermode = 'Between'
                    and f.startevent = 'RegistrationEnd'
                    and f.endevent = 'CompetitionStart'
                    and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > c.registrationenddate
                    and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < c.competitionstartdate
                )
                or
                (
                    cer.iscancelled = false
                    and f.finereason = 'LateRegistration'
                    and (
                        (
                            f.triggermode = 'Between'
                            and f.startevent = 'RegistrationEnd'
                            and f.endevent = 'CompetitionStart'
                            and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > c.registrationenddate
                            and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < c.competitionstartdate
                        )
                        or
                        (
                            f.triggermode = 'After'
                            and f.startevent = 'CompetitionStart'
                            and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date >= c.competitionstartdate
                        )
                    )
                )
          )
        order by
            case when f.triggermode = 'After' then 1 else 2 end,
            f.fineamount desc
        limit 1
    ) effective_fine on true

    where original_cic.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and (
            p_status is null
            or lower(cer.status) = lower(p_status)
      )
      -- CAP-1a: hide paid Pending zombies (Pending-scoped; answered history kept)
      and (
            lower(cer.status) <> 'pending'
            or not exists (
                select 1 from public.billcharge bc
                where bc.sourcetype = 'Entry'
                  and bc.sourceid = cer.originalentryid
                  and bc.chargestatus = 'Paid'
            )
      )

    union all

    /* =========================
       Product change requests
       ========================= */
    select
        pcr.productchangerequestid::integer as "RequestId",
        'Product'::text as "RequestSource",
        case
            when pcr.iscancelled = true then 'ביטול מוצר'
            else 'שינוי מוצר'
        end as "RequestType",

        original_pr.competitionid::integer as "CompetitionId",
        c.competitionname::text as "CompetitionName",

        pcr.requestdate as "RequestDate",

        original_pr.orderedbysystemuserid::integer as "RequestedByPersonId",
        concat_ws(' ', requested_by.firstname, requested_by.lastname)::text as "RequestedByName",

        coalesce(original_product_category.categoryname, 'מוצר')::text as "EntityType",

        case
            when original_sb.stallbookingid is not null
                 and original_sb.isfortack = true then
                original_product.productname || ' - תא ציוד'
            when original_sb.stallbookingid is not null then
                original_product.productname || ' - ' || coalesce(original_h.horsename, '-')
            else
                original_product.productname
        end::text as "EntityName",

        case
            when original_sb.stallbookingid is not null then
                concat_ws(
                    ' | ',
                    'מוצר: ' || original_product.productname,
                    'קטגוריה: ' || coalesce(original_product_category.categoryname, '-'),
                    'סוג תא: ' ||
                        case
                            when original_sb.isfortack = true then 'תא ציוד'
                            else 'תא לסוס'
                        end,
                    'סוס: ' ||
                        case
                            when original_sb.isfortack = true then '-'
                            else coalesce(
                                original_h.horsename ||
                                case
                                    when original_h.barnname is not null
                                         and original_h.barnname <> ''
                                    then ' (' || original_h.barnname || ')'
                                    else ''
                                end,
                                '-'
                            )
                        end,
                    'תאריכים: ' ||
                        coalesce(to_char(original_sb.startdate, 'DD/MM/YYYY'), '-') ||
                        ' - ' ||
                        coalesce(to_char(original_sb.enddate, 'DD/MM/YYYY'), '-'),
                    'משלמים: ' || coalesce(original_payers.payernames, '-'),
                    'חיוב: ₪' ||
                        coalesce(
                            original_bpr.amounttopay,
                            original_price.itemprice *
                                (original_sb.enddate - original_sb.startdate + 1),
                            0
                        ),
                    'הערות: ' || coalesce(original_pr.notes, '-')
                )
            else
                concat_ws(
                    ' | ',
                    'מוצר: ' || original_product.productname,
                    'קטגוריה: ' || coalesce(original_product_category.categoryname, '-'),
                    'משלמים: ' || coalesce(original_payers.payernames, '-'),
                    'מחיר מחירון: ₪' || coalesce(original_price.itemprice, 0),
                    'חיוב: ₪' || coalesce(original_bpr.amounttopay, original_price.itemprice, 0),
                    'הערות: ' || coalesce(original_pr.notes, '-')
                )
        end::text as "BeforeText",

        case
            when pcr.iscancelled = true then
                'ביטול בקשת מוצר'::text

            when new_sb.stallbookingid is not null then
                concat_ws(
                    ' | ',
                    'מוצר: ' || new_product.productname,
                    'קטגוריה: ' || coalesce(new_product_category.categoryname, '-'),
                    'סוג תא: ' ||
                        case
                            when new_sb.isfortack = true then 'תא ציוד'
                            else 'תא לסוס'
                        end,
                    'סוס: ' ||
                        case
                            when new_sb.isfortack = true then '-'
                            else coalesce(
                                new_h.horsename ||
                                case
                                    when new_h.barnname is not null
                                         and new_h.barnname <> ''
                                    then ' (' || new_h.barnname || ')'
                                    else ''
                                end,
                                '-'
                            )
                        end,
                    'תאריכים: ' ||
                        coalesce(to_char(new_sb.startdate, 'DD/MM/YYYY'), '-') ||
                        ' - ' ||
                        coalesce(to_char(new_sb.enddate, 'DD/MM/YYYY'), '-'),
                    'משלמים: ' || coalesce(new_payers.payernames, original_payers.payernames, '-'),
                    'חיוב: ₪' ||
                        coalesce(
                            new_bpr.amounttopay,
                            new_price.itemprice *
                                (new_sb.enddate - new_sb.startdate + 1),
                            0
                        ),
                    'הערות: ' || coalesce(new_pr.notes, '-')
                )

            else
                concat_ws(
                    ' | ',
                    'מוצר: ' || new_product.productname,
                    'קטגוריה: ' || coalesce(new_product_category.categoryname, '-'),
                    'משלמים: ' || coalesce(new_payers.payernames, original_payers.payernames, '-'),
                    'מחיר מחירון: ₪' || coalesce(new_price.itemprice, 0),
                    'חיוב: ₪' || coalesce(new_bpr.amounttopay, new_price.itemprice, 0),
                    'הערות: ' || coalesce(new_pr.notes, '-')
                )
        end::text as "AfterText",

        pcr.status::text as "Status",
        pcr.iscancelled::boolean as "IsCancelled",

        pcr.originalprequestid::integer as "OriginalEntityId",
        pcr.newprequestid::integer as "NewEntityId",

        null::integer as "FineId",
        null::numeric as "FineAmountSnapshot",

        case
            when original_sb.stallbookingid is not null then
                coalesce(
                    original_bpr.amounttopay,
                    original_price.itemprice *
                        (original_sb.enddate - original_sb.startdate + 1),
                    0
                )
            else
                coalesce(original_bpr.amounttopay, original_price.itemprice, 0)
        end::numeric as "AmountBefore",

        case
            when pcr.iscancelled = true then
                0

            when new_sb.stallbookingid is not null then
                coalesce(
                    new_bpr.amounttopay,
                    new_price.itemprice *
                        (new_sb.enddate - new_sb.startdate + 1),
                    0
                )

            else
                coalesce(new_bpr.amounttopay, new_price.itemprice, 0)
        end::numeric as "AmountAfter"

    from public.productchangerequest pcr

    inner join public.productrequest original_pr
        on original_pr.prequestid = pcr.originalprequestid

    inner join public.competition c
        on c.competitionid = original_pr.competitionid

    inner join public.person requested_by
        on requested_by.personid = original_pr.orderedbysystemuserid

    inner join public.pricecatalog original_price
        on original_price.pricecatalogid = original_pr.pricecatalogid

    inner join public.product original_product
        on original_product.productid = original_price.productid

    left join public.productcategory original_product_category
        on original_product_category.categoryid = original_product.categoryid

    left join public.stallbooking original_sb
        on original_sb.stallbookingid = original_pr.prequestid

    left join public.horse original_h
        on original_h.horseid = original_sb.horseid

    left join lateral (
        select
            string_agg(
                concat_ws(' ', p.firstname, p.lastname),
                ', '
                order by p.firstname, p.lastname
            ) as payernames,
            sum(bpr.amounttopay)::numeric as amounttopay
        from public.billproductrequest bpr
        inner join public.bill b
            on b.billid = bpr.billid
        inner join public.person p
            on p.personid = b.paidbypersonid
        where bpr.prequestid = original_pr.prequestid
    ) original_payers on true

    left join lateral (
        select sum(bpr.amounttopay)::numeric as amounttopay
        from public.billproductrequest bpr
        where bpr.prequestid = original_pr.prequestid
    ) original_bpr on true

    left join public.productrequest new_pr
        on new_pr.prequestid = pcr.newprequestid

    left join public.pricecatalog new_price
        on new_price.pricecatalogid = new_pr.pricecatalogid

    left join public.product new_product
        on new_product.productid = new_price.productid

    left join public.productcategory new_product_category
        on new_product_category.categoryid = new_product.categoryid

    left join public.stallbooking new_sb
        on new_sb.stallbookingid = new_pr.prequestid

    left join public.horse new_h
        on new_h.horseid = new_sb.horseid

    left join lateral (
        select
            string_agg(
                concat_ws(' ', p.firstname, p.lastname),
                ', '
                order by p.firstname, p.lastname
            ) as payernames,
            sum(bpr.amounttopay)::numeric as amounttopay
        from public.billproductrequest bpr
        inner join public.bill b
            on b.billid = bpr.billid
        inner join public.person p
            on p.personid = b.paidbypersonid
        where bpr.prequestid = new_pr.prequestid
    ) new_payers on true

    left join lateral (
        select sum(bpr.amounttopay)::numeric as amounttopay
        from public.billproductrequest bpr
        where bpr.prequestid = new_pr.prequestid
    ) new_bpr on true

    where original_pr.competitionid = p_competitionid
      and c.hostranchid = p_ranchid
      and (
            p_status is null
            or lower(pcr.status) = lower(p_status)
      )
      -- CAP-1a: hide paid Pending zombies (Pending-scoped; answered history kept)
      and (
            lower(pcr.status) <> 'pending'
            or not exists (
                select 1 from public.billcharge bc
                where bc.sourcetype = 'ProductRequest'
                  and bc.sourceid = pcr.originalprequestid
                  and bc.chargestatus = 'Paid'
            )
      )

    order by "RequestDate" desc;
end;
$function$;
