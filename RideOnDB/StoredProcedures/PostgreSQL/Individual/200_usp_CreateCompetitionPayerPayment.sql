-- ============================================================================
-- usp_createcompetitionpayerpayment - record an organizer-style payment batch
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). KNOWN ISSUE documented in that audit, NOT fixed here:
--   - p_chargeowner accepts 'Federation' as well as 'Organizer' (validated
--     against paymentbatch.chargeowner's CHECK constraint, which also allows
--     'Mixed'). This means a Federation billcharge can be closed through a
--     normal paymentbatch/payment (forced to paymentMethodId=1, "credit card
--     only" when chargeowner='Federation'), which is a second, independent
--     path to marking a Federation charge Paid alongside
--     usp_allocatefederationcredittocharge (193) /
--     usp_approvefederationmatchingsuggestion (199). This direction IS
--     internally guarded here (chargestatus must be 'Open' and paymentbatchid
--     must be null for a charge to be selectable), but the reverse direction
--     (193/199 allocating credit to a charge already Paid via this proc) is
--     not - see the Stage 1 audit for the full double-payment finding. Live
--     data confirmed 1 paymentbatch with chargeowner='Federation' exists.
--
-- 2026-08-04: selected billcharge rows are now locked FOR UPDATE (ascending
-- billchargeid) and re-validated before any amount is computed or any
-- paymentbatch/payment row is inserted, closing a race where a concurrent
-- cancellation or federation allocation could be silently overwritten back
-- to Paid.
--
-- 2026-08-05: after the post-lock re-validation, every selected billcharge is
-- now also rejected if it has any row in federationcreditallocation - the
-- table has no status/isactive column, so a row's mere existence is the
-- active-allocation signal (usp_releasefederationallocationsforcharge/223
-- deletes the row on release). This closes the specific double-coverage path
-- documented above (2026-08-03 note): a Federation billcharge that already
-- carries a partial or full active allocation can no longer also be paid
-- through this proc, for either chargeowner value - not just 'Federation'.
-- This is a block, not an automatic release: no federationcreditallocation
-- row is touched, and usp_releasefederationallocationsforcharge (223) is
-- deliberately not called from here, to avoid introducing a charge-then-
-- credit lock ordering against 193/199/223/225's own credit-then-charge
-- convention. Releasing coverage remains a separate, explicit action.
--
-- 2026-08-07 (fix/entry-fine-payment-integrity): PAYMENT-INTEGRITY FIX for the
-- fine-presentation work. Locked business rule: for a given ChargeOwner, an
-- Entry base charge (categorykey='classes', sourcetype='Entry', sourceid=
-- EntryId) and its Entry-created late-entry fine (categorykey='fine',
-- sourcetype='Fine', sourceid=EntryId - the SAME sourceid, proven live) are
-- ONE inseparable payable business unit. Before this fix, the existing
-- related_entry_charges CTE only expanded a selection to OTHER rows sharing
-- the identical categorykey/sourcetype (a same-key-duplicate safety net,
-- unrelated to fines) - a fine's categorykey='fine' never matched a base
-- charge's categorykey='classes' there, so selecting only the base (or only
-- the fine) could settle one half while leaving the other Open. Two new CTEs,
-- symmetric mirror images of each other, close this: related_fine_for_
-- selected_entry (selected = base -> pulls the matching Open Entry-created
-- fine(s), same competitionid/paidbypersonid/chargeowner/sourceid) and
-- related_entry_for_selected_fine (selected = fine -> pulls the matching Open
-- base charge, same predicate set, mirrored). Both are added to the same
-- final UNION (not UNION ALL) that already deduplicates selected_base against
-- related_entry_charges, so explicitly selecting both base and fine still
-- settles exactly once. ChargeOwner isolation is inherent in the join
-- predicate (related/selected chargeowner equality), not a separate check -
-- a Federation charge sharing the same sourceid as a selected Organizer
-- charge cannot satisfy the join. Multiple Entry-created fines per entry
-- (structurally legal - no unique constraint on billcharge beyond its own PK,
-- confirmed live, though no live row exercises it yet) are handled for free:
-- both new CTEs are plain JOINs, not LIMIT 1 lookups, so every matching Open
-- fine row is pulled in. An already-Paid or already-batched component never
-- satisfies either CTE's Open/unbatched join predicate, so it is silently
-- left alone rather than re-processed - no special-case branch needed.
-- ChangeEntryRequest fines (categorykey='classes', sourcetype='Fine',
-- sourceid=ChangeEntryRequestId) are explicitly OUT OF SCOPE for this fix and
-- structurally cannot match either new CTE's shape (categorykey='fine' AND
-- sourcetype='Fine' for the fine side, categorykey='classes' AND
-- sourcetype='Entry' for the base side) - selecting one today behaves exactly
-- as before this change. Verified via a rollback-only live smoke test
-- (BEGIN ... temporary CREATE OR REPLACE ... fabricated fixtures ... 12
-- scenarios ... RAISE EXCEPTION to force rollback ... zero residual rows in
-- billcharge/entry/servicerequest/bill/paymentbatch/payment, original proc
-- definition/owner/ACL confirmed restored byte-for-byte). No signature
-- change - same CREATE OR REPLACE as every prior revision of this proc.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_createcompetitionpayerpayment(p_competitionid integer, p_payerpersonid integer, p_enteredbysystemuserid integer, p_chargeowner text, p_invoicenumber text, p_selectedcharges jsonb, p_paymentmethods jsonb, p_notes text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_billid integer;
    v_paymentbatchid integer;
    v_selected_total numeric(12,2);
    v_methods_total numeric(12,2);
    v_effective_paymentmethods jsonb;
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_payerpersonid is null or p_payerpersonid <= 0 then
        raise exception 'Invalid payer person id';
    end if;

    if p_enteredbysystemuserid is null or p_enteredbysystemuserid <= 0 then
        raise exception 'Invalid entered by system user id';
    end if;

    if p_chargeowner is null
       or p_chargeowner not in ('Organizer', 'Federation') then
        raise exception 'Charge owner must be Organizer or Federation';
    end if;

    if p_invoicenumber is null or length(trim(p_invoicenumber)) = 0 then
        raise exception 'Invoice number is required';
    end if;

    if p_selectedcharges is null
       or jsonb_typeof(p_selectedcharges) <> 'array'
       or jsonb_array_length(p_selectedcharges) = 0 then
        raise exception 'Selected charges are required';
    end if;

    if exists (
        with input_charge_ids as (
            select distinct
                (item ->> 'billChargeId')::integer as billchargeid
            from jsonb_array_elements(p_selectedcharges) item
            where item ? 'billChargeId'
        )
        select 1
        from input_charge_ids i
        left join public.billcharge bc
            on bc.billchargeid = i.billchargeid
        where bc.billchargeid is null
           or bc.competitionid <> p_competitionid
           or bc.paidbypersonid <> p_payerpersonid
           or bc.chargeowner <> p_chargeowner
           or bc.chargestatus <> 'Open'
           or bc.paymentbatchid is not null
    ) then
        raise exception 'One or more selected charges are not valid for this payment owner';
    end if;

    create temporary table temp_selected_payment_charges
    (
        billchargeid integer primary key
    ) on commit drop;

    insert into temp_selected_payment_charges (billchargeid)
    with input_charge_ids as (
        select distinct
            (item ->> 'billChargeId')::integer as billchargeid
        from jsonb_array_elements(p_selectedcharges) item
        where item ? 'billChargeId'
    ),
    selected_base as (
        select bc.*
        from public.billcharge bc
        inner join input_charge_ids i
            on i.billchargeid = bc.billchargeid
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.chargeowner = p_chargeowner
          and bc.chargestatus = 'Open'
          and bc.paymentbatchid is null
    ),
    related_entry_charges as (
        select related.billchargeid
        from selected_base selected
        inner join public.billcharge related
            on related.competitionid = selected.competitionid
           and related.paidbypersonid = selected.paidbypersonid
           and related.chargeowner = selected.chargeowner
           and related.categorykey = selected.categorykey
           and related.sourcetype = selected.sourcetype
           and related.sourceid = selected.sourceid
           and related.chargestatus = 'Open'
           and related.paymentbatchid is null
        where selected.categorykey = 'classes'
          and selected.sourcetype = 'Entry'
    ),
    -- Payment-integrity fix (2026-08-07): selected = Entry-created fine's
    -- base Entry charge -> pull the matching Open Entry-created fine(s) for
    -- the same entry, same owner. ChangeEntryRequest fines (categorykey=
    -- 'classes') never match this shape.
    related_fine_for_selected_entry as (
        select f.billchargeid
        from selected_base selected
        inner join public.billcharge f
            on f.competitionid = selected.competitionid
           and f.paidbypersonid = selected.paidbypersonid
           and f.chargeowner = selected.chargeowner
           and f.categorykey = 'fine'
           and f.sourcetype = 'Fine'
           and f.sourceid = selected.sourceid
           and f.chargestatus = 'Open'
           and f.paymentbatchid is null
        where selected.categorykey = 'classes'
          and selected.sourcetype = 'Entry'
    ),
    -- Mirror image of the CTE above: selected = Entry-created fine -> pull
    -- the matching Open base Entry charge for the same entry, same owner.
    related_entry_for_selected_fine as (
        select e.billchargeid
        from selected_base selected
        inner join public.billcharge e
            on e.competitionid = selected.competitionid
           and e.paidbypersonid = selected.paidbypersonid
           and e.chargeowner = selected.chargeowner
           and e.categorykey = 'classes'
           and e.sourcetype = 'Entry'
           and e.sourceid = selected.sourceid
           and e.chargestatus = 'Open'
           and e.paymentbatchid is null
        where selected.categorykey = 'fine'
          and selected.sourcetype = 'Fine'
    )
    select billchargeid
    from selected_base

    union

    select billchargeid
    from related_entry_charges

    union

    select billchargeid
    from related_fine_for_selected_entry

    union

    select billchargeid
    from related_entry_for_selected_fine;

    if not exists (
        select 1
        from temp_selected_payment_charges
    ) then
        raise exception 'No valid charges were selected';
    end if;

    -- Lock every selected billcharge row, ascending billchargeid order,
    -- before computing any amount or making any further decision. This
    -- never locks federationexternalcredit, so it introduces no charge-then-
    -- credit ordering against 193/199/the future allocation-release helper.
    perform 1
    from public.billcharge bc
    inner join temp_selected_payment_charges selected
        on selected.billchargeid = bc.billchargeid
    order by bc.billchargeid
    for update of bc;

    -- Re-verify eligibility from the now-locked, authoritative rows. Any
    -- charge that changed state since the initial unlocked discovery aborts
    -- the whole payment atomically - never silently skipped, since
    -- totalamount is one aggregate figure for the whole selected set.
    if exists (
        select 1
        from public.billcharge bc
        inner join temp_selected_payment_charges selected
            on selected.billchargeid = bc.billchargeid
        where bc.competitionid <> p_competitionid
           or bc.paidbypersonid <> p_payerpersonid
           or bc.chargeowner <> p_chargeowner
           or bc.chargestatus <> 'Open'
           or bc.paymentbatchid is not null
    ) then
        raise exception 'One or more selected charges are no longer eligible for payment';
    end if;

    -- Authoritative, owner-agnostic double-coverage guard: a selected charge
    -- with any existing federationcreditallocation row (partial or full,
    -- regardless of chargeowner) cannot be paid through this proc. No status
    -- predicate is needed - the table has no such column, and a row's
    -- existence is the only "active allocation" signal. This never touches
    -- federationexternalcredit and never calls 223, so it introduces no new
    -- lock beyond the billcharge lock already held above.
    if exists (
        select 1
        from temp_selected_payment_charges selected
        where exists (
            select 1
            from public.federationcreditallocation fca
            where fca.billchargeid = selected.billchargeid
        )
    ) then
        raise exception 'One or more selected charges still have an active Federation credit allocation and cannot be paid until it is released';
    end if;

    select
        min(bc.billid),
        round(sum(bc.amounttopay), 2)
    into
        v_billid,
        v_selected_total
    from public.billcharge bc
    inner join temp_selected_payment_charges selected
        on selected.billchargeid = bc.billchargeid;

    if v_billid is null then
        raise exception 'Could not find bill for selected charges';
    end if;

    if exists (
        select 1
        from public.billcharge bc
        inner join temp_selected_payment_charges selected
            on selected.billchargeid = bc.billchargeid
        where bc.billid <> v_billid
    ) then
        raise exception 'Selected charges belong to more than one bill';
    end if;

    if v_selected_total is null or v_selected_total <= 0 then
        raise exception 'Selected payment amount must be greater than zero';
    end if;

    v_effective_paymentmethods := p_paymentmethods;

    if p_chargeowner = 'Federation'
       and (
            v_effective_paymentmethods is null
            or jsonb_typeof(v_effective_paymentmethods) <> 'array'
            or jsonb_array_length(v_effective_paymentmethods) = 0
       ) then
        v_effective_paymentmethods :=
            jsonb_build_array(
                jsonb_build_object(
                    'paymentMethodId', 1,
                    'amount', v_selected_total
                )
            );
    end if;

    if v_effective_paymentmethods is null
       or jsonb_typeof(v_effective_paymentmethods) <> 'array'
       or jsonb_array_length(v_effective_paymentmethods) = 0 then
        raise exception 'Payment methods are required';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(v_effective_paymentmethods) method
        where (method ->> 'paymentMethodId') is null
           or (method ->> 'amount') is null
           or ((method ->> 'paymentMethodId')::integer) <= 0
           or ((method ->> 'amount')::numeric) <= 0
    ) then
        raise exception 'Invalid payment method data';
    end if;

    if p_chargeowner = 'Federation'
       and exists (
            select 1
            from jsonb_array_elements(v_effective_paymentmethods) method
            where (method ->> 'paymentMethodId')::integer <> 1
       ) then
        raise exception 'Federation payments must use credit card only';
    end if;

    select
        round(sum((method ->> 'amount')::numeric), 2)
    into v_methods_total
    from jsonb_array_elements(v_effective_paymentmethods) method;

    if round(v_methods_total, 2) <> round(v_selected_total, 2) then
        raise exception 'Payment methods total does not match selected charges total';
    end if;

    insert into public.paymentbatch
    (
        billid,
        competitionid,
        paidbypersonid,
        enteredbysystemuserid,
        chargeowner,
        invoicenumber,
        totalamount,
        createdat
    )
    values
    (
        v_billid,
        p_competitionid,
        p_payerpersonid,
        p_enteredbysystemuserid,
        p_chargeowner,
        trim(p_invoicenumber),
        v_selected_total,
        now()
    )
    returning paymentbatchid
    into v_paymentbatchid;

    insert into public.payment
    (
        billid,
        paymentbatchid,
        paymentmethodid,
        amountpaid,
        paymentdate,
        enteredbysystemuserid,
        invoicenumber,
        transactionreference
    )
    select
        v_billid,
        v_paymentbatchid,
        (method ->> 'paymentMethodId')::integer,
        (method ->> 'amount')::numeric,
        now(),
        p_enteredbysystemuserid,
        trim(p_invoicenumber),
        p_notes
    from jsonb_array_elements(v_effective_paymentmethods) method;

    update public.billcharge bc
    set
        chargestatus = 'Paid',
        paymentbatchid = v_paymentbatchid
    where bc.billchargeid in (
        select selected.billchargeid
        from temp_selected_payment_charges selected
    );

    perform public.usp_recalculatebillamount(v_billid);

    return v_paymentbatchid;
end;
$function$
