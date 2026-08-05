-- ============================================================================
-- usp_bulkallocatefederationcredittochargesidempotent - idempotent front door
-- for atomic multi-charge Federation credit allocation
-- ============================================================================
-- NEW FUNCTION, 2026-08-06. Adds operation-id idempotency for the bulk
-- allocation path WITHOUT altering usp_bulkallocatefederationcredittocharges
-- (225), usp_allocatefederationcredittochargesecured (226) or
-- usp_allocatefederationcredittocharge (193) in any way.
--
-- Deliberately does NOT call 225 as the application-facing mutation. 225's
-- own RETURNS TABLE shape carries only 5 columns (billchargeid,
-- allocatedamount, billchargestatus, creditavailableamount, creditstatus) -
-- it has no federationcreditallocationid, entryid, creditusedamount or
-- billchargeamount to snapshot. Treating 225 as an opaque black box here
-- would leave this function unable to populate the full per-charge result
-- snapshot federationallocationrequestitem requires for replay, and unable to
-- populate the live resultfederationcreditallocationid convenience pointer at
-- all. Instead, this function reproduces 225's own full-set validation and
-- locking VERBATIM (same temp-table pattern, same ascending-billchargeid lock
-- order, same duplicate-id/payer-consistency/competition-scope/paymentbatch
-- checks, same remaining-amount computation) and calls
-- usp_allocatefederationcredittochargesecured (226) directly per charge,
-- exactly the way 225 itself already does internally - no INSERT/UPDATE
-- allocation logic is duplicated anywhere outside 226/193, only the
-- surrounding batch-validation logic that 225 already implements.
--
-- Concurrency/claim, transaction model and payload-fingerprint rules are
-- identical in spirit to usp_allocatefederationcredittochargeidempotent (228)
-- - see that file's header for the full proof. The one difference: the
-- fingerprint's charge component is the full SUBMITTED SET, canonicalized by
-- sorting ascending before hashing, so the same set resubmitted in a
-- different array order still matches on retry.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_bulkallocatefederationcredittochargesidempotent(
    p_requestid text,
    p_competitionid integer,
    p_federationexternalcreditid integer,
    p_billchargeids integer[],
    p_allocatedbysystemuserid integer,
    p_notes text DEFAULT NULL::text
)
 RETURNS TABLE(
    billchargeid integer,
    allocatedamount numeric,
    billchargestatus character varying,
    creditavailableamount numeric,
    creditstatus character varying
 )
 LANGUAGE plpgsql
AS $function$
declare
    v_fingerprint text;
    v_existing_fingerprint text;
    v_claimed text;
    v_sorted_ids text;

    v_credit_available numeric;
    v_credit_status character varying;

    v_requested_count integer;
    v_distinct_count integer;

    v_payer_personid integer;
    v_charge_row record;

    v_bc_paidbypersonid integer;
    v_bc_owner character varying;
    v_bc_status character varying;
    v_bc_amount numeric;
    v_bc_paymentbatchid integer;
    v_bc_covered numeric;
    v_bc_remaining numeric;

    v_total_required numeric;

    v_alloc record;
begin
    if p_requestid is null or length(trim(p_requestid)) = 0 then
        raise exception 'Operation id is required';
    end if;

    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_federationexternalcreditid is null or p_federationexternalcreditid <= 0 then
        raise exception 'Invalid federation external credit id';
    end if;

    if p_allocatedbysystemuserid is null or p_allocatedbysystemuserid <= 0 then
        raise exception 'Invalid allocated by system user id';
    end if;

    if p_billchargeids is null or array_length(p_billchargeids, 1) is null then
        raise exception 'At least one bill charge id is required';
    end if;

    select count(*), count(distinct x)
    into v_requested_count, v_distinct_count
    from unnest(p_billchargeids) as x;

    if v_requested_count <> v_distinct_count then
        raise exception 'Duplicate bill charge ids are not allowed in a single bulk allocation request';
    end if;

    -- Canonical, order-independent identity for the charge SET.
    select string_agg(x::text, ',' order by x) into v_sorted_ids
    from unnest(p_billchargeids) as x;

    v_fingerprint := md5(
        'BulkAllocation' || '|' ||
        p_competitionid::text || '|' ||
        p_federationexternalcreditid::text || '|' ||
        coalesce(v_sorted_ids, '') || '|' ||
        p_allocatedbysystemuserid::text || '|' ||
        coalesce(p_notes, '')
    );

    insert into public.federationallocationrequest (
        requestid, operationtype, competitionid, federationexternalcreditid,
        requestedbysystemuserid, paidbypersonid, requestedamount, notes, payloadfingerprint
    )
    values (
        p_requestid, 'BulkAllocation', p_competitionid, p_federationexternalcreditid,
        p_allocatedbysystemuserid, null, null, p_notes, v_fingerprint
    )
    on conflict (requestid) do nothing
    returning requestid into v_claimed;

    if v_claimed is null then
        select payloadfingerprint into v_existing_fingerprint
        from public.federationallocationrequest
        where requestid = p_requestid;

        if v_existing_fingerprint <> v_fingerprint then
            raise exception 'Operation id % was already used for a different request payload', p_requestid
                using errcode = 'RN001';
        end if;

        -- Same id, same charge set - replay the original rows in
        -- deterministic (ascending billchargeid) order, zero new mutation.
        return query
        select
            i.billchargeid,
            i.snapshot_allocatedamount,
            i.snapshot_billchargestatus,
            i.snapshot_creditavailableamount,
            i.snapshot_creditstatus
        from public.federationallocationrequestitem i
        where i.requestid = p_requestid
        order by i.billchargeid;

        return;
    end if;

    -- Won the claim - reproduce 225's own full-set validation verbatim.
    select
        fec.availableamount,
        fec.creditstatus
    into
        v_credit_available,
        v_credit_status
    from public.federationexternalcredit fec
    where fec.federationexternalcreditid = p_federationexternalcreditid
      and fec.competitionid = p_competitionid
    for update;

    if not found then
        raise exception 'Federation external credit % was not found', p_federationexternalcreditid;
    end if;

    if v_credit_status in ('Cancelled', 'Refunded', 'ClosedManually', 'TransferredToNextCompetition') then
        raise exception 'Federation external credit % cannot be used because its status is %',
            p_federationexternalcreditid,
            v_credit_status;
    end if;

    if v_credit_available <= 0 then
        raise exception 'Federation external credit % has no available amount',
            p_federationexternalcreditid;
    end if;

    -- Distinct temp table name from 225's own (which this function never
    -- calls) - purely defensive, avoids any ambiguity if a future caller ever
    -- invoked both within one transaction. ON COMMIT DROP only fires at
    -- commit, so a leftover from a prior call within the same transaction is
    -- dropped first, matching 225's own established pattern.
    drop table if exists pg_temp.temp_bulk_federation_allocation_idempotent_charges;

    create temporary table temp_bulk_federation_allocation_idempotent_charges
    (
        billchargeid integer primary key,
        remainingamount numeric
    ) on commit drop;

    insert into temp_bulk_federation_allocation_idempotent_charges (billchargeid, remainingamount)
    select unnest(p_billchargeids), null;

    if exists (
        select 1
        from temp_bulk_federation_allocation_idempotent_charges t
        left join public.billcharge bc
            on bc.billchargeid = t.billchargeid
        where bc.billchargeid is null
    ) then
        raise exception 'One or more selected bill charges were not found';
    end if;

    -- Lock every selected billcharge row in one statement, ascending
    -- billchargeid order - same convention 225/199/200 already share, so
    -- overlapping concurrent calls across any of these Federation entry
    -- points can never deadlock.
    perform 1
    from public.billcharge bc
    inner join temp_bulk_federation_allocation_idempotent_charges t
        on t.billchargeid = bc.billchargeid
    order by bc.billchargeid
    for update of bc;

    for v_charge_row in
        select bc.billchargeid, bc.paidbypersonid, bc.chargeowner, bc.chargestatus, bc.amounttopay, bc.paymentbatchid
        from public.billcharge bc
        inner join temp_bulk_federation_allocation_idempotent_charges t
            on t.billchargeid = bc.billchargeid
        order by bc.billchargeid
    loop
        v_bc_paidbypersonid := v_charge_row.paidbypersonid;
        v_bc_owner := v_charge_row.chargeowner;
        v_bc_status := v_charge_row.chargestatus;
        v_bc_amount := v_charge_row.amounttopay;
        v_bc_paymentbatchid := v_charge_row.paymentbatchid;

        if v_bc_owner <> 'Federation' then
            raise exception 'Bill charge % is not a Federation charge', v_charge_row.billchargeid;
        end if;

        if v_bc_status not in ('Open', 'Paid') then
            raise exception 'Bill charge % cannot be allocated because its status is %',
                v_charge_row.billchargeid,
                v_bc_status;
        end if;

        if v_bc_paymentbatchid is not null then
            raise exception 'Bill charge % is already paid through a payment batch and cannot receive a federation credit allocation',
                v_charge_row.billchargeid;
        end if;

        if v_payer_personid is null then
            v_payer_personid := v_bc_paidbypersonid;
        elsif v_payer_personid <> v_bc_paidbypersonid then
            raise exception 'Selected bill charges belong to more than one payer';
        end if;

        select coalesce(sum(fca.allocatedamount), 0)
        into v_bc_covered
        from public.federationcreditallocation fca
        where fca.billchargeid = v_charge_row.billchargeid;

        v_bc_remaining := v_bc_amount - v_bc_covered;

        if v_bc_remaining <= 0 then
            raise exception 'Bill charge % is already fully covered', v_charge_row.billchargeid;
        end if;

        update temp_bulk_federation_allocation_idempotent_charges t
        set remainingamount = v_bc_remaining
        where t.billchargeid = v_charge_row.billchargeid;
    end loop;

    if exists (
        select 1
        from public.billcharge bc
        inner join temp_bulk_federation_allocation_idempotent_charges t
            on t.billchargeid = bc.billchargeid
        where bc.competitionid <> p_competitionid
    ) then
        raise exception 'One or more selected bill charges do not belong to competition %', p_competitionid;
    end if;

    select coalesce(sum(remainingamount), 0)
    into v_total_required
    from temp_bulk_federation_allocation_idempotent_charges;

    if v_total_required > v_credit_available then
        raise exception 'Available federation credit % is less than the total required amount % for the selected bill charges',
            v_credit_available,
            v_total_required;
    end if;

    -- All charges locked and validated, full required total confirmed
    -- coverable - perform the actual allocations via the secured wrapper
    -- (226), one call per charge, ascending billchargeid order. No exception
    -- handler wraps this loop, so a failure from any nested call propagates
    -- and rolls back every write already made in this transaction, including
    -- the claim row and any earlier successful iterations of this same loop.
    for v_charge_row in
        select t.billchargeid, t.remainingamount
        from temp_bulk_federation_allocation_idempotent_charges t
        order by t.billchargeid
    loop
        select * into v_alloc
        from public.usp_allocatefederationcredittochargesecured(
            p_competitionid,
            p_federationexternalcreditid,
            v_charge_row.billchargeid,
            v_charge_row.remainingamount,
            p_allocatedbysystemuserid,
            p_notes
        );

        insert into public.federationallocationrequestitem (
            requestid, billchargeid, requestedamount, resultfederationcreditallocationid,
            snapshot_federationcreditallocationid, snapshot_entryid, snapshot_allocatedamount,
            snapshot_creditusedamount, snapshot_creditavailableamount, snapshot_creditstatus,
            snapshot_billchargeamount, snapshot_billchargecoveredamount, snapshot_billchargestatus
        )
        values (
            p_requestid, v_alloc.billchargeid, v_charge_row.remainingamount, v_alloc.federationcreditallocationid,
            v_alloc.federationcreditallocationid, v_alloc.entryid, v_alloc.allocatedamount,
            v_alloc.creditusedamount, v_alloc.creditavailableamount, v_alloc.creditstatus,
            v_alloc.billchargeamount, v_alloc.billchargecoveredamount, v_alloc.billchargestatus
        );

        billchargeid := v_alloc.billchargeid;
        allocatedamount := v_alloc.allocatedamount;
        billchargestatus := v_alloc.billchargestatus;
        creditavailableamount := v_alloc.creditavailableamount;
        creditstatus := v_alloc.creditstatus;
        return next;
    end loop;

    return;
end;
$function$;
