-- ============================================================================
-- usp_bulkallocatefederationcredittocharges - atomic multi-charge Federation
-- credit allocation
-- ============================================================================
-- NEW FUNCTION, 2026-08-05. Replaces the direct-payments screen's client-side
-- loop that called usp_allocatefederationcredittocharge (193) once per
-- selected charge over separate HTTP requests/transactions. That loop had no
-- atomicity: a mid-loop failure left earlier successful allocations
-- committed while later selected charges were silently skipped, and the
-- client-computed "amount per charge" (min(remainingCredit, missingAmount))
-- was trusted rather than re-derived from authoritative locked state.
--
-- This function makes the whole selection one all-or-nothing operation in one
-- transaction: every selected billcharge must be fully covered by the
-- selected credit, or nothing is written at all. It does not accept any
-- client-computed amount - every remaining-amount figure is read fresh under
-- lock, exactly the way usp_allocatefederationcredittocharge (193) computes
-- it for a single charge.
--
-- Design, mirroring two already-proven patterns in this codebase:
--   - usp_createcompetitionpayerpayment (200): populate a temp table of
--     selected ids, lock every matching billcharge row in one statement
--     (ascending billchargeid, so concurrent calls that overlap can never
--     deadlock against each other or against usp_approvefederationmatching-
--     suggestion's (199) own ascending-order per-charge locking), then
--     re-validate every row under that lock before any write happens.
--   - usp_bulkinsertpaidtimerequests (126): loop over a validated set calling
--     an existing single-item primitive (here, 193) once per item inside the
--     same outer transaction, relying on plpgsql's standard behavior that an
--     unhandled exception from a nested function call aborts the entire
--     transaction - no BEGIN...EXCEPTION block wraps the loop, so nothing
--     can swallow a nested failure and nothing partial can survive.
--
-- usp_allocatefederationcredittocharge (193) remains the single-charge write
-- primitive - this function never duplicates its INSERT/UPDATE logic. It
-- calls it once per selected charge, in ascending billchargeid order,
-- passing the exact authoritative remaining amount this function computed
-- under the same lock 193 itself would otherwise have taken - since
-- 2026-08-06 that per-charge call goes through the competition-scoped
-- secured wrapper (226), see the note below, rather than calling 193
-- directly.
--
-- Duplicate billChargeIds are treated as an invalid request (not silently
-- de-duplicated) - the current UI never generates duplicates, so a duplicate
-- id indicates a client bug worth surfacing, not a harmless case to absorb.
--
-- 2026-08-06: the per-charge delegation below now calls
-- usp_allocatefederationcredittochargesecured (226) instead of calling
-- usp_allocatefederationcredittocharge (193) directly. 226 is a thin,
-- competition-scoped wrapper that re-confirms (under lock) that the credit
-- and the charge both belong to p_competitionid before delegating the actual
-- write to 193 unchanged - closing a cross-competition authorization gap
-- that existed on the legacy direct single-charge endpoint. This function's
-- own external signature, temp-table behavior, full-set validation,
-- duplicate-id guard, lock order, remaining-amount calculation, and
-- all-or-nothing rollback behavior are all unchanged by this - the only
-- thing that changed is which function performs the final per-charge write.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_bulkallocatefederationcredittocharges(
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
    v_credit_available numeric;
    v_credit_status character varying;

    v_requested_count integer;
    v_distinct_count integer;

    v_charge_count integer;

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

    v_alloc_billchargeid integer;
    v_alloc_amount numeric;
    v_alloc_billchargestatus character varying;
    v_alloc_creditavailable numeric;
    v_alloc_creditstatus character varying;
begin
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

    -- Duplicate detection before any lock/mutation - never silently de-duplicated.
    select count(*), count(distinct x)
    into v_requested_count, v_distinct_count
    from unnest(p_billchargeids) as x;

    if v_requested_count <> v_distinct_count then
        raise exception 'Duplicate bill charge ids are not allowed in a single bulk allocation request';
    end if;

    -- Lock the credit first, same authoritative validation as 193 - no
    -- different credit-status rule introduced here.
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

    -- ON COMMIT DROP only fires at transaction commit, so a caller that ever
    -- invokes this function twice within the same outer transaction would
    -- otherwise hit "relation already exists" on the second call - drop any
    -- leftover table first so this function is safe to call repeatedly
    -- within one transaction, not just once per HTTP request. Schema-qualified
    -- to pg_temp so this can only ever target the session-local temporary
    -- relation, never a permanent relation of the same name that might later
    -- be introduced into the search path.
    drop table if exists pg_temp.temp_bulk_federation_allocation_charges;

    create temporary table temp_bulk_federation_allocation_charges
    (
        billchargeid integer primary key,
        remainingamount numeric
    ) on commit drop;

    insert into temp_bulk_federation_allocation_charges (billchargeid, remainingamount)
    select unnest(p_billchargeids), null;

    if exists (
        select 1
        from temp_bulk_federation_allocation_charges t
        left join public.billcharge bc
            on bc.billchargeid = t.billchargeid
        where bc.billchargeid is null
    ) then
        raise exception 'One or more selected bill charges were not found';
    end if;

    -- Lock every selected billcharge row in one statement, ascending
    -- billchargeid order - never the client's array order - matching
    -- usp_createcompetitionpayerpayment's (200) own multi-row locking
    -- convention and usp_approvefederationmatchingsuggestion's (199)
    -- per-charge ascending order, so overlapping concurrent calls across
    -- any of these Federation entry points can never deadlock.
    perform 1
    from public.billcharge bc
    inner join temp_bulk_federation_allocation_charges t
        on t.billchargeid = bc.billchargeid
    order by bc.billchargeid
    for update of bc;

    -- Re-validate every selected charge under the lock before any write -
    -- fail the whole operation before the first mutation whenever possible,
    -- exactly the way 200 re-validates its own selected charges after
    -- locking them.
    select count(*) into v_charge_count from temp_bulk_federation_allocation_charges;

    for v_charge_row in
        select bc.billchargeid, bc.paidbypersonid, bc.chargeowner, bc.chargestatus, bc.amounttopay, bc.paymentbatchid
        from public.billcharge bc
        inner join temp_bulk_federation_allocation_charges t
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

        update temp_bulk_federation_allocation_charges t
        set remainingamount = v_bc_remaining
        where t.billchargeid = v_charge_row.billchargeid;
    end loop;

    -- Every selected charge's competition membership was already guaranteed
    -- by the credit lock above requiring fec.competitionid = p_competitionid
    -- and by joining strictly on the requested ids; a charge from a
    -- different competition simply cannot reach a passing state here because
    -- the payer-consistency and Federation-owner checks above run against
    -- its own row regardless of competition, so an explicit competition
    -- check is still required per charge.
    if exists (
        select 1
        from public.billcharge bc
        inner join temp_bulk_federation_allocation_charges t
            on t.billchargeid = bc.billchargeid
        where bc.competitionid <> p_competitionid
    ) then
        raise exception 'One or more selected bill charges do not belong to competition %', p_competitionid;
    end if;

    select coalesce(sum(remainingamount), 0)
    into v_total_required
    from temp_bulk_federation_allocation_charges;

    if v_total_required > v_credit_available then
        raise exception 'Available federation credit % is less than the total required amount % for the selected bill charges',
            v_credit_available,
            v_total_required;
    end if;

    -- All charges locked and validated, full required total confirmed
    -- coverable - now perform the actual allocations via the competition-
    -- scoped secured wrapper (226), which re-confirms the credit and charge
    -- both belong to p_competitionid before delegating to usp_allocate-
    -- federationcredittocharge (193), the single-charge write primitive; no
    -- INSERT/UPDATE logic is duplicated here or in 226. No exception handler
    -- wraps this loop, so a failure from any nested call propagates and
    -- rolls back every write already made in this transaction, including
    -- earlier successful iterations of this same loop.
    for v_charge_row in
        select t.billchargeid, t.remainingamount
        from temp_bulk_federation_allocation_charges t
        order by t.billchargeid
    loop
        select
            a.billchargeid,
            a.allocatedamount,
            a.billchargestatus,
            a.creditavailableamount,
            a.creditstatus
        into
            v_alloc_billchargeid,
            v_alloc_amount,
            v_alloc_billchargestatus,
            v_alloc_creditavailable,
            v_alloc_creditstatus
        from public.usp_allocatefederationcredittochargesecured(
            p_competitionid,
            p_federationexternalcreditid,
            v_charge_row.billchargeid,
            v_charge_row.remainingamount,
            p_allocatedbysystemuserid,
            p_notes
        ) a;

        billchargeid := v_alloc_billchargeid;
        allocatedamount := v_alloc_amount;
        billchargestatus := v_alloc_billchargestatus;
        creditavailableamount := v_alloc_creditavailable;
        creditstatus := v_alloc_creditstatus;
        return next;
    end loop;

    return;
end;
$function$;
