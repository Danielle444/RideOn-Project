-- ============================================================================
-- usp_answerproductchangerequestsecured - competition-scoped approve/reject of
-- a pending stall/shavings change or cancellation (Stage: change-request-answer-scoping,
-- 2026-08-03)
-- ============================================================================
-- Added alongside the existing (unmodified) 4-argument
-- public.usp_answerproductchangerequest (211_usp_AnswerProductChangeRequest.sql).
-- 211 was deliberately left untouched in that slice to avoid an unavoidable
-- deployment break: the old Render server calls it with 4 arguments, and a
-- DROP+CREATE with 5 arguments would break that server for the window between
-- the DB deploy and the code deploy. This function is additive only.
--
-- Same problem and same fix shape as usp_answerchangeentryrequestsecured (221):
-- the Controller already validates the caller is an authorized HostSecretary
-- for the supplied competitionId/ranchId, but the target requestId itself was
-- never independently bound to that competition.
--
-- Fix: exactly ONE change from 211's live-verified body - the initial lookup's
-- WHERE clause gains "and original_pr.competitionid = p_competitionid"
-- (productrequest.competitionid, joined in directly - no further join needed).
-- Every other line, branch, and statement below is reproduced verbatim from
-- 211, unchanged, in the same order:
--   - status validation ("Only pending ... can be answered")
--   - the unsupported-category guard
--   - the paid-product-request guard
--   - the Rejected branch
--   - the Approved/cancelled branch (billcharge Cancelled)
--   - the Approved/change branch (billcharge Replaced, new-request existence
--     check, stall-specific pricing recompute vs. non-stall copy-through,
--     billproductrequest inserts, billcharge inserts)
--   - the closing usp_recalculatebillamount loop over affected bills
--   - the returned productchangerequestid
--
-- A requestId belonging to a different competition simply fails to match the
-- lookup's WHERE clause, so v_originalprequestid stays NULL and execution
-- falls into the SAME existing "raise exception 'Product change request not
-- found'" branch that already handles a genuinely nonexistent id. Deliberate:
-- a foreign-competition id and a nonexistent id are indistinguishable to the
-- caller - no new error path, no new SQLSTATE, no message revealing that a
-- requestId exists under a different competition.
--
-- CLEANUP: the old 4-argument public.usp_answerproductchangerequest (211)
-- was left in place per the original plan pending a live dependency check;
-- not revisited by this file.
--
-- WHOLE-SHEKEL SPLIT CORRECTION (2026-08-06, approved business rule): same
-- fix as 211 -- the stalls branch previously computed ONE value,
-- round(v_new_totalamount / v_payercount, 2), applied identically to every
-- payer. Replaced with the shared public.usp_splitwholeshekels(total,
-- payercount) helper, allocating whole-shekel shares ordered by
-- paidbypersonid ascending across the same existing payer set. See 211's
-- header for the full rationale (identical in both procs). No
-- duplicate-payer guard needed here either, for the same reason as 211: no
-- JSON payer list is accepted, only existing billproductrequest rows whose
-- primary key already prevents a duplicate payer.
--
-- SYNTAX NOTE: this function is now DEPLOYED LIVE (added 2026-08-03,
-- confirmed present via pg_get_functiondef 2026-08-06), so this file is
-- updated from the original plain `CREATE FUNCTION` to `CREATE OR REPLACE
-- FUNCTION` -- a plain CREATE would fail with "already exists" against live.
-- The signature is unchanged, so CREATE OR REPLACE applies cleanly with no
-- DROP required.
--
-- SHAVINGS-ORPHAN CASCADE FIX (2026-08-06, CAP-11 financial correctness):
-- an approved stall cancellation through this path cancelled the stall's own
-- billcharge but left any linked shavings order's Open/PendingApproval
-- billcharge rows untouched, and the shavings order itself active -- a
-- confirmed live gap (verified against usp_admincancelstallbooking, 239,
-- which already got this right for its own direct-cancel path). Fix adds
-- ONE new block inside the existing `if v_iscancelled = true` branch, gated
-- on `v_categorykey = 'stalls'`: it reuses 239's proven eligibility CTEs
-- verbatim (adapted only for variable names -- p_stallbookingid ->
-- v_originalprequestid), which already encode:
--   - the active-link rule (a linked stall only stops keeping a shared
--     shavings order alive when it has an Approved+iscancelled=true request
--     AND no Open/Paid/PendingApproval charge remaining -- any inconsistent
--     state keeps the order alive, conservatively)
--   - Policy A (any Paid row anywhere on the shavings sourceId blocks
--     cancellation of the WHOLE order, not just that row)
-- Physical shavingsorderforstallbooking rows are never touched, matching
-- 239's own header guarantee. The stall's own charge-cancel condition above
-- (chargestatus = 'Open' and paymentbatchid is null) is UNCHANGED -- this
-- fix only adds the missing shavings cascade, nothing else. Cancelled
-- shavings bills are captured via UPDATE...RETURNING into v_shavings_bill_ids
-- (239's technique) and recalculated in a second small loop after the
-- existing billproductrequest-derived recalculation loop, which already
-- covers the stall's own bill(s) unchanged; usp_recalculatebillamount is a
-- full recompute per bill, so any overlap between the two loops is harmless.
-- The non-cancellation (change/replace) branch below is entirely untouched --
-- the verified gap is cancellation-only.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_answerproductchangerequestsecured(
    p_productchangerequestid integer,
    p_answerstatus           text,
    p_answeredbysystemuserid integer,
    p_competitionid          integer,
    p_notes                  text DEFAULT NULL::text
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_originalprequestid integer;
    v_newprequestid integer;
    v_iscancelled boolean;
    v_currentstatus text;
    v_competitionid integer;
    v_categorykey text;
    v_bill_id integer;

    v_new_itemprice numeric(10,2);
    v_new_startdate date;
    v_new_enddate date;
    v_new_staydays integer;
    v_new_totalamount numeric(10,2);
    v_payercount integer;
    v_baseshare integer;
    v_remainder integer;

    v_shavings_bill_ids integer[];
begin
    if p_productchangerequestid is null or p_productchangerequestid <= 0 then
        raise exception 'Invalid product change request id';
    end if;

    if p_answerstatus is null
       or lower(p_answerstatus) not in ('approved', 'rejected') then
        raise exception 'Answer status must be Approved or Rejected';
    end if;

    if p_answeredbysystemuserid is null or p_answeredbysystemuserid <= 0 then
        raise exception 'Invalid answered by system user id';
    end if;

    select
        pcr.originalprequestid,
        pcr.newprequestid,
        pcr.iscancelled,
        pcr.status,
        original_pr.competitionid,
        case
            when prod.categoryid = 2 then 'stalls'
            when prod.categoryid = 3 then 'shavings'
            else null
        end as categorykey
    into
        v_originalprequestid,
        v_newprequestid,
        v_iscancelled,
        v_currentstatus,
        v_competitionid,
        v_categorykey
    from public.productchangerequest pcr
    inner join public.productrequest original_pr
        on original_pr.prequestid = pcr.originalprequestid
    inner join public.pricecatalog pc
        on pc.pricecatalogid = original_pr.pricecatalogid
    inner join public.product prod
        on prod.productid = pc.productid
    where pcr.productchangerequestid = p_productchangerequestid
      and original_pr.competitionid = p_competitionid;

    if v_originalprequestid is null then
        raise exception 'Product change request not found';
    end if;

    if lower(coalesce(v_currentstatus, '')) <> 'pending' then
        raise exception 'Only pending product change requests can be answered';
    end if;

    if v_categorykey is null then
        raise exception 'Unsupported product category for product change request';
    end if;

    if exists (
        select 1
        from public.billcharge bc
        where bc.sourcetype = 'ProductRequest'
          and bc.sourceid = v_originalprequestid
          and bc.chargestatus = 'Paid'
    ) then
        raise exception 'Cannot answer change request for a paid product request';
    end if;

    if lower(p_answerstatus) = 'rejected' then
        update public.productchangerequest
        set
            status = 'Rejected',
            answeredbysystemuserid = p_answeredbysystemuserid
        where productchangerequestid = p_productchangerequestid;

        return p_productchangerequestid;
    end if;

    update public.productchangerequest
    set
        status = 'Approved',
        answeredbysystemuserid = p_answeredbysystemuserid
    where productchangerequestid = p_productchangerequestid;

    if v_iscancelled = true then
        update public.billcharge
        set
            chargestatus = 'Cancelled',
            cancelledat = now(),
            notes = coalesce(notes, '') ||
                ' | Approved product cancellation request ' ||
                p_productchangerequestid
        where sourcetype = 'ProductRequest'
          and sourceid = v_originalprequestid
          and chargestatus = 'Open'
          and paymentbatchid is null;

        if v_categorykey = 'stalls' then
            -- Reused verbatim from usp_admincancelstallbooking (239), only
            -- the anchor id changed (p_stallbookingid -> v_originalprequestid).
            with eligible_shavings_orders as (
                select sofb.shavingsorderid
                from public.shavingsorderforstallbooking sofb
                where sofb.stallbookingid = v_originalprequestid
                  and not exists (
                      select 1
                      from public.shavingsorderforstallbooking other
                      where other.shavingsorderid = sofb.shavingsorderid
                        and other.stallbookingid <> v_originalprequestid
                        and not (
                            exists (
                                select 1
                                from public.productchangerequest pcr
                                where pcr.originalprequestid = other.stallbookingid
                                  and pcr.status = 'Approved'
                                  and pcr.iscancelled = true
                            )
                            and not exists (
                                select 1
                                from public.billcharge bc
                                where bc.sourcetype = 'ProductRequest'
                                  and bc.sourceid = other.stallbookingid
                                  and bc.chargestatus in ('Open', 'Paid', 'PendingApproval')
                            )
                        )
                  )
            ),
            payable_shavings_orders as (
                -- Policy A: any Paid row anywhere on this shavings sourceId
                -- excludes the WHOLE order, not just that one payer's row.
                select eso.shavingsorderid
                from eligible_shavings_orders eso
                where not exists (
                    select 1
                    from public.billcharge bc
                    where bc.sourcetype = 'ProductRequest'
                      and bc.sourceid = eso.shavingsorderid
                      and bc.chargestatus = 'Paid'
                )
            ),
            cancelled_shavings_charges as (
                update public.billcharge
                set chargestatus = 'Cancelled',
                    cancelledat = now()
                where sourcetype = 'ProductRequest'
                  and chargestatus in ('Open', 'PendingApproval')
                  and sourceid in (select shavingsorderid from payable_shavings_orders)
                returning billid
            )
            select coalesce(array_agg(distinct billid), array[]::integer[])
            into v_shavings_bill_ids
            from cancelled_shavings_charges;
        end if;

    else
        if v_newprequestid is null then
            raise exception 'New product request id is required for approved product change request';
        end if;

        if not exists (
            select 1
            from public.productrequest pr
            where pr.prequestid = v_newprequestid
        ) then
            raise exception 'New product request not found';
        end if;

        update public.billcharge
        set
            chargestatus = 'Replaced',
            cancelledat = now(),
            notes = coalesce(notes, '') ||
                ' | Replaced by product change request ' ||
                p_productchangerequestid
        where sourcetype = 'ProductRequest'
          and sourceid = v_originalprequestid
          and chargestatus = 'Open'
          and paymentbatchid is null;

        if v_categorykey = 'stalls' then
            select
                pc.itemprice,
                sb.startdate,
                sb.enddate,
                (sb.enddate - sb.startdate + 1)
            into
                v_new_itemprice,
                v_new_startdate,
                v_new_enddate,
                v_new_staydays
            from public.productrequest pr
            inner join public.pricecatalog pc
                on pc.pricecatalogid = pr.pricecatalogid
            inner join public.stallbooking sb
                on sb.stallbookingid = pr.prequestid
            where pr.prequestid = v_newprequestid;

            if v_new_itemprice is null then
                raise exception 'Could not calculate new stall price';
            end if;

            if v_new_staydays is null or v_new_staydays <= 0 then
                raise exception 'Invalid new stall stay days';
            end if;

            select count(*)
            into v_payercount
            from public.billproductrequest old_bpr
            where old_bpr.prequestid = v_originalprequestid;

            if v_payercount is null or v_payercount <= 0 then
                raise exception 'Could not find payers for original product request';
            end if;

            v_new_totalamount := v_new_itemprice * v_new_staydays;

            select o_baseshare, o_remainder
            into v_baseshare, v_remainder
            from public.usp_splitwholeshekels(v_new_totalamount, v_payercount);

            -- WHOLE-SHEKEL SPLIT CORRECTION: deterministic remainder
            -- allocation, ordered by paidbypersonid ascending (joined via
            -- bill, since billproductrequest carries no payer column).
            insert into public.billproductrequest
            (
                billid,
                prequestid,
                amounttopay
            )
            select
                ordered.billid,
                v_newprequestid,
                v_baseshare + case when ordered.rn <= v_remainder then 1 else 0 end
            from (
                select old_bpr.billid,
                       row_number() over (order by b.paidbypersonid asc) as rn
                from public.billproductrequest old_bpr
                inner join public.bill b on b.billid = old_bpr.billid
                where old_bpr.prequestid = v_originalprequestid
            ) ordered
            where not exists (
                select 1
                from public.billproductrequest existing_bpr
                where existing_bpr.billid = ordered.billid
                  and existing_bpr.prequestid = v_newprequestid
            );

            insert into public.billcharge
            (
                billid,
                competitionid,
                paidbypersonid,
                chargeowner,
                categorykey,
                sourcetype,
                sourceid,
                amounttopay,
                chargestatus,
                paymentbatchid,
                createdat,
                notes
            )
            select
                new_bpr.billid,
                v_competitionid,
                b.paidbypersonid,
                'Organizer',
                v_categorykey,
                'ProductRequest',
                v_newprequestid,
                new_bpr.amounttopay,
                'Open',
                null,
                now(),
                'Approved product change request ' ||
                    p_productchangerequestid ||
                    ' | Daily stall pricing: ' ||
                    v_new_itemprice ||
                    ' x ' ||
                    v_new_staydays ||
                    ' days'
            from public.billproductrequest new_bpr
            inner join public.bill b
                on b.billid = new_bpr.billid
            where new_bpr.prequestid = v_newprequestid
              and not exists (
                  select 1
                  from public.billcharge existing_bc
                  where existing_bc.sourcetype = 'ProductRequest'
                    and existing_bc.sourceid = v_newprequestid
                    and existing_bc.billid = new_bpr.billid
              );

        else
            insert into public.billproductrequest
            (
                billid,
                prequestid,
                amounttopay
            )
            select
                old_bpr.billid,
                v_newprequestid,
                old_bpr.amounttopay
            from public.billproductrequest old_bpr
            where old_bpr.prequestid = v_originalprequestid
              and not exists (
                  select 1
                  from public.billproductrequest existing_bpr
                  where existing_bpr.billid = old_bpr.billid
                    and existing_bpr.prequestid = v_newprequestid
              );

            insert into public.billcharge
            (
                billid,
                competitionid,
                paidbypersonid,
                chargeowner,
                categorykey,
                sourcetype,
                sourceid,
                amounttopay,
                chargestatus,
                paymentbatchid,
                createdat,
                notes
            )
            select
                new_bpr.billid,
                v_competitionid,
                b.paidbypersonid,
                'Organizer',
                v_categorykey,
                'ProductRequest',
                v_newprequestid,
                new_bpr.amounttopay,
                'Open',
                null,
                now(),
                'Approved product change request ' || p_productchangerequestid
            from public.billproductrequest new_bpr
            inner join public.bill b
                on b.billid = new_bpr.billid
            where new_bpr.prequestid = v_newprequestid
              and not exists (
                  select 1
                  from public.billcharge existing_bc
                  where existing_bc.sourcetype = 'ProductRequest'
                    and existing_bc.sourceid = v_newprequestid
                    and existing_bc.billid = new_bpr.billid
              );
        end if;
    end if;

    for v_bill_id in
        select distinct billid
        from public.billproductrequest
        where prequestid in (
            v_originalprequestid,
            coalesce(v_newprequestid, v_originalprequestid)
        )
    loop
        perform public.usp_recalculatebillamount(v_bill_id);
    end loop;

    if v_shavings_bill_ids is not null then
        foreach v_bill_id in array v_shavings_bill_ids
        loop
            perform public.usp_recalculatebillamount(v_bill_id);
        end loop;
    end if;

    return p_productchangerequestid;
end;
$function$;
