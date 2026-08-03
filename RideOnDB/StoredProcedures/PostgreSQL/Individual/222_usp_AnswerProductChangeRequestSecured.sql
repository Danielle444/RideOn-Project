-- ============================================================================
-- usp_answerproductchangerequestsecured - competition-scoped approve/reject of
-- a pending stall/shavings change or cancellation (Stage: change-request-answer-scoping,
-- 2026-08-03)
-- ============================================================================
-- NEW FUNCTION, added alongside the existing (unmodified, still deployed)
-- 4-argument public.usp_answerproductchangerequest (211_usp_AnswerProductChangeRequest.sql).
-- 211 is deliberately left untouched in this slice to avoid an unavoidable
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
-- will be dropped in a SEPARATE later stage, only after the new server is
-- deployed and a repository-wide plus live dependency check proves it has no
-- remaining callers.
-- ============================================================================

CREATE FUNCTION public.usp_answerproductchangerequestsecured(
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
    v_payercount numeric;
    v_new_amountperpayer numeric(10,2);
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

            select count(*)::numeric
            into v_payercount
            from public.billproductrequest old_bpr
            where old_bpr.prequestid = v_originalprequestid;

            if v_payercount is null or v_payercount <= 0 then
                raise exception 'Could not find payers for original product request';
            end if;

            v_new_totalamount := v_new_itemprice * v_new_staydays;
            v_new_amountperpayer := round(v_new_totalamount / v_payercount, 2);

            insert into public.billproductrequest
            (
                billid,
                prequestid,
                amounttopay
            )
            select
                old_bpr.billid,
                v_newprequestid,
                v_new_amountperpayer
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

    return p_productchangerequestid;
end;
$function$
