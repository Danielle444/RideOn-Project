-- ============================================================================
-- usp_allocatefederationcredittocharge - allocate one federation credit to one billcharge
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). KNOWN ISSUES documented in that audit, NOT fixed here:
--   - Accepts a billcharge already chargestatus='Paid' (only rejects statuses
--     outside ('Open','Paid')), and computes "remaining to cover" purely from
--     SUM(federationcreditallocation.allocatedamount) - it never checks
--     paymentbatchid/payment. Combined with usp_createcompetitionpayerpayment
--     (which can pay a Federation charge via a normal paymentbatch), a charge
--     can be closed twice: once by organizer payment, once by credit
--     allocation. Confirmed structurally live-reachable; not yet observed to
--     have actually double-covered the same billchargeid (see the audit's
--     anomaly-check section).
--   - Credit status guard excludes Cancelled/Refunded/ClosedManually/
--     TransferredToNextCompetition but not NeedsReview - a credit flagged for
--     manual review can still be spent.
--   - Never calls usp_recalculatebillamount after mutating billcharge.
-- The row locking here (SELECT ... FOR UPDATE on both the credit and the
-- charge) is real and correct - see usp_approvefederationmatchingsuggestion
-- (199) for the batch-allocation sibling that lacks this lock.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_allocatefederationcredittocharge(p_federationexternalcreditid integer, p_billchargeid integer, p_allocatedamount numeric, p_allocatedbysystemuserid integer, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(federationcreditallocationid integer, federationexternalcreditid integer, billchargeid integer, entryid integer, allocatedamount numeric, creditusedamount numeric, creditavailableamount numeric, creditstatus character varying, billchargeamount numeric, billchargecoveredamount numeric, billchargestatus character varying)
 LANGUAGE plpgsql
AS $function$
declare
    v_credit_competitionid integer;
    v_credit_available numeric;
    v_credit_original numeric;
    v_credit_status character varying;

    v_billcharge_competitionid integer;
    v_billcharge_owner character varying;
    v_billcharge_status character varying;
    v_billcharge_amount numeric;
    v_billcharge_sourcetype character varying;
    v_billcharge_sourceid integer;

    v_already_allocated_to_charge numeric;
    v_remaining_charge_amount numeric;

    v_new_credit_used numeric;
    v_new_credit_available numeric;
    v_new_credit_status character varying;

    v_new_allocation_id integer;
    v_billcharge_new_status character varying;
    v_billcharge_covered_amount numeric;
begin
    if p_federationexternalcreditid is null then
        raise exception 'Federation external credit id is required';
    end if;

    if p_billchargeid is null then
        raise exception 'Bill charge id is required';
    end if;

    if p_allocatedbysystemuserid is null then
        raise exception 'Allocated by system user id is required';
    end if;

    if p_allocatedamount is null or p_allocatedamount <= 0 then
        raise exception 'Allocated amount must be greater than zero';
    end if;

    select
        fec.competitionid,
        fec.availableamount,
        fec.originalamount,
        fec.creditstatus
    into
        v_credit_competitionid,
        v_credit_available,
        v_credit_original,
        v_credit_status
    from public.federationexternalcredit fec
    where fec.federationexternalcreditid = p_federationexternalcreditid
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

    if p_allocatedamount > v_credit_available then
        raise exception 'Allocated amount % is greater than available credit amount %',
            p_allocatedamount,
            v_credit_available;
    end if;

    select
        bc.competitionid,
        bc.chargeowner,
        bc.chargestatus,
        bc.amounttopay,
        bc.sourcetype,
        bc.sourceid
    into
        v_billcharge_competitionid,
        v_billcharge_owner,
        v_billcharge_status,
        v_billcharge_amount,
        v_billcharge_sourcetype,
        v_billcharge_sourceid
    from public.billcharge bc
    where bc.billchargeid = p_billchargeid
    for update;

    if not found then
        raise exception 'Bill charge % was not found', p_billchargeid;
    end if;

    if v_billcharge_competitionid <> v_credit_competitionid then
        raise exception 'Credit competition % does not match bill charge competition %',
            v_credit_competitionid,
            v_billcharge_competitionid;
    end if;

    if v_billcharge_owner <> 'Federation' then
        raise exception 'Bill charge % is not a Federation charge', p_billchargeid;
    end if;

    if v_billcharge_status not in ('Open', 'Paid') then
        raise exception 'Bill charge % cannot be allocated because its status is %',
            p_billchargeid,
            v_billcharge_status;
    end if;

    select coalesce(sum(fca.allocatedamount), 0)
    into v_already_allocated_to_charge
    from public.federationcreditallocation fca
    where fca.billchargeid = p_billchargeid;

    v_remaining_charge_amount := v_billcharge_amount - v_already_allocated_to_charge;

    if v_remaining_charge_amount <= 0 then
        raise exception 'Bill charge % is already fully covered', p_billchargeid;
    end if;

    if p_allocatedamount > v_remaining_charge_amount then
        raise exception 'Allocated amount % is greater than remaining charge amount %',
            p_allocatedamount,
            v_remaining_charge_amount;
    end if;

    insert into public.federationcreditallocation (
        federationexternalcreditid,
        billchargeid,
        entryid,
        allocatedamount,
        allocatedbysystemuserid,
        notes
    )
    values (
        p_federationexternalcreditid,
        p_billchargeid,
        case
            when v_billcharge_sourcetype = 'Entry' then v_billcharge_sourceid
            else null
        end,
        p_allocatedamount,
        p_allocatedbysystemuserid,
        p_notes
    )
    returning federationcreditallocation.federationcreditallocationid
    into v_new_allocation_id;

    v_new_credit_used := v_credit_original - (v_credit_available - p_allocatedamount);
    v_new_credit_available := v_credit_available - p_allocatedamount;

    if v_new_credit_available = 0 then
        v_new_credit_status := 'FullyUsed';
    elsif v_new_credit_available < v_credit_original then
        v_new_credit_status := 'PartiallyUsed';
    else
        v_new_credit_status := 'Available';
    end if;

    update public.federationexternalcredit fec
    set
        usedamount = v_new_credit_used,
        availableamount = v_new_credit_available,
        creditstatus = v_new_credit_status
    where fec.federationexternalcreditid = p_federationexternalcreditid;

    v_billcharge_covered_amount := v_already_allocated_to_charge + p_allocatedamount;

    if v_billcharge_covered_amount >= v_billcharge_amount then
        v_billcharge_new_status := 'Paid';

        update public.billcharge bc
        set
            chargestatus = 'Paid',
            notes = concat_ws(
                ' | ',
                bc.notes,
                'Covered by federation external credit'
            )
        where bc.billchargeid = p_billchargeid;
    else
        v_billcharge_new_status := v_billcharge_status;
    end if;

    return query
    select
        v_new_allocation_id,
        p_federationexternalcreditid,
        p_billchargeid,
        case
            when v_billcharge_sourcetype = 'Entry' then v_billcharge_sourceid
            else null
        end,
        p_allocatedamount,
        v_new_credit_used,
        v_new_credit_available,
        v_new_credit_status,
        v_billcharge_amount,
        v_billcharge_covered_amount,
        v_billcharge_new_status;
end;
$function$
