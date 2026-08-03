-- ============================================================================
-- usp_approvefederationmatchingsuggestion - bulk-approve a matching suggestion (FIFO allocation)
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made
-- at that time.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). KNOWN ISSUES documented in that audit:
--   - No creditstatus guard at all - only availableamount > 0 is checked,
--     unlike 193's explicit Cancelled/Refunded/ClosedManually/
--     TransferredToNextCompetition blocklist. NOT fixed in this slice -
--     out of scope (concurrency-only change, no eligibility change).
--   - Candidate charges exclude Cancelled/Replaced/Rejected/PendingApproval
--     but NOT 'Paid' - combined with usp_createcompetitionpayerpayment (200),
--     which can pay a Federation charge via a normal paymentbatch, this is
--     the same double-payment gap as 193: "missing amount" here is computed
--     purely from federationcreditallocation, never from paymentbatchid.
--     NOT fixed in this slice - out of scope.
--
-- Concurrency fix (prerequisite for the entry-cancellation federation-
-- release feature): the candidate-billcharge cursor was previously a plain,
-- unlocked snapshot query - a concurrent cancellation
-- (usp_secretarydeleteentry / usp_answerchangeentryrequest[secured]'s Rule 1
-- release) could commit chargestatus='Cancelled' and delete a charge's
-- allocations while this proc was mid-loop over a stale snapshot of that
-- same charge, letting it insert a fresh allocation against an already-
-- cancelled charge and even flip it back to 'Paid'. Fixed with a two-phase
-- pattern: the candidate query still runs unlocked (phase 1, UNCHANGED from
-- the recovered live body - it only decides what to TRY, in what order),
-- but each candidate's billcharge row is now locked FOR UPDATE and its
-- chargestatus/amounttopay/covered-amount re-read fresh (phase 2) before
-- any decision is made or any write happens. A charge that became
-- Cancelled/Replaced/Rejected/PendingApproval, or whose remaining amount
-- dropped to zero, while waiting for the lock is skipped via the same
-- `continue` idiom already used for a non-positive allocation amount - no
-- new error path, no change to the matching algorithm, eligibility
-- criteria, FIFO order, amount math, messages, or credit-status calculation
-- at the end of the proc (all byte-identical to the recovered live body).
-- Lock order remains credit (already locked above the loop, unchanged) then
-- charge (now locked inside the loop, new), matching
-- usp_allocatefederationcredittocharge (193). Candidates are still visited
-- in ascending billchargeid order (unchanged ORDER BY), so multiple charges
-- locked within one call of this proc are always acquired in a fixed,
-- consistent order, preventing a lock-order deadlock against a second
-- concurrent call of this same proc. Signature and RETURNS TABLE shape are
-- unchanged; the DAL (CompetitionPaymentDAL.ApproveFederationMatchingSuggestion)
-- reads the four return columns strictly by name, so no caller change is
-- required.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_approvefederationmatchingsuggestion(p_competitionid integer, p_federationexternalcreditid integer, p_paidbypersonid integer, p_amount numeric, p_allocatedbysystemuserid integer, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(approvedamount numeric, allocationscount integer, remainingcreditamount numeric, message text)
 LANGUAGE plpgsql
AS $function$
declare
    v_credit_available numeric;
    v_remaining_to_allocate numeric;
    v_allocate_amount numeric;
    v_allocations_count integer := 0;
    v_total_allocated numeric := 0;

    v_charge record;
    v_charge_status_fresh character varying;
    v_charge_amount_fresh numeric;
    v_charge_covered_fresh numeric;
    v_charge_missing numeric;
    v_charge_covered_after numeric;
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Competition id is required';
    end if;

    if p_federationexternalcreditid is null or p_federationexternalcreditid <= 0 then
        raise exception 'Federation external credit id is required';
    end if;

    if p_paidbypersonid is null or p_paidbypersonid <= 0 then
        raise exception 'Paid by person id is required';
    end if;

    if p_amount is null or p_amount <= 0 then
        raise exception 'Amount must be greater than zero';
    end if;

    select coalesce(fec.availableamount, 0)
    into v_credit_available
    from public.federationexternalcredit fec
    where fec.federationexternalcreditid = p_federationexternalcreditid
      and fec.competitionid = p_competitionid
    for update;

    if v_credit_available is null then
        raise exception 'Federation external credit was not found';
    end if;

    if v_credit_available <= 0 then
        raise exception 'Selected credit has no available amount';
    end if;

    v_remaining_to_allocate := least(p_amount, v_credit_available);

    for v_charge in
        with charge_allocations as (
            select
                fca.billchargeid,
                coalesce(sum(fca.allocatedamount), 0) as coveredamount
            from public.federationcreditallocation fca
            group by fca.billchargeid
        )
        select
            bc.billchargeid,
            bc.sourceid as entryid,
            bc.amounttopay,
            coalesce(ca.coveredamount, 0) as coveredamount,
            bc.amounttopay - coalesce(ca.coveredamount, 0) as missingamount
        from public.billcharge bc
        left join charge_allocations ca
            on ca.billchargeid = bc.billchargeid
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_paidbypersonid
          and bc.chargeowner = 'Federation'
          and bc.categorykey = 'classes'
          and bc.sourcetype = 'Entry'
          and bc.chargestatus not in ('Cancelled', 'Replaced', 'Rejected', 'PendingApproval')
          and bc.amounttopay - coalesce(ca.coveredamount, 0) > 0
        order by
            bc.billchargeid
    loop
        exit when v_remaining_to_allocate <= 0;

        -- Lock the authoritative billcharge row before deciding anything.
        -- Charge locked AFTER the credit (already locked above), preserving
        -- credit-then-charge order, matching usp_allocatefederationcredittocharge (193).
        select bc2.chargestatus, bc2.amounttopay
        into v_charge_status_fresh, v_charge_amount_fresh
        from public.billcharge bc2
        where bc2.billchargeid = v_charge.billchargeid
        for update;

        -- Skip a candidate that became ineligible while waiting for the lock.
        if v_charge_status_fresh in ('Cancelled', 'Replaced', 'Rejected', 'PendingApproval') then
            continue;
        end if;

        -- Recompute covered/remaining from fresh, locked allocation data -
        -- another concurrent allocation could have landed between the
        -- candidate scan and this lock.
        select coalesce(sum(fca.allocatedamount), 0)
        into v_charge_covered_fresh
        from public.federationcreditallocation fca
        where fca.billchargeid = v_charge.billchargeid;

        v_charge_missing := v_charge_amount_fresh - v_charge_covered_fresh;

        if v_charge_missing <= 0 then
            continue;
        end if;

        v_allocate_amount := least(v_remaining_to_allocate, v_charge_missing);

        if v_allocate_amount <= 0 then
            continue;
        end if;

        insert into public.federationcreditallocation
        (
            federationexternalcreditid,
            billchargeid,
            entryid,
            allocatedamount,
            allocatedbysystemuserid,
            allocatedat,
            notes
        )
        values
        (
            p_federationexternalcreditid,
            v_charge.billchargeid,
            v_charge.entryid,
            v_allocate_amount,
            p_allocatedbysystemuserid,
            now(),
            coalesce(p_notes, 'אישור הצעת התאמה אוטומטית')
        );

        v_charge_covered_after := v_charge_covered_fresh + v_allocate_amount;

        if v_charge_covered_after >= v_charge_amount_fresh then
            update public.billcharge
            set
                chargestatus = 'Paid',
                notes = concat_ws(
                    ' | ',
                    notes,
                    'Covered by federation matching suggestion'
                )
            where billchargeid = v_charge.billchargeid;
        end if;

        v_remaining_to_allocate := v_remaining_to_allocate - v_allocate_amount;
        v_total_allocated := v_total_allocated + v_allocate_amount;
        v_allocations_count := v_allocations_count + 1;
    end loop;

    if v_total_allocated <= 0 then
        raise exception 'No open federation charges were found for this payer';
    end if;

    update public.federationexternalcredit
    set
        usedamount = coalesce(usedamount, 0) + v_total_allocated,
        availableamount = coalesce(availableamount, 0) - v_total_allocated,
        creditstatus =
            case
                when coalesce(availableamount, 0) - v_total_allocated <= 0
                    then 'FullyUsed'
                when coalesce(usedamount, 0) + v_total_allocated > 0
                    then 'PartiallyUsed'
                else 'Available'
            end
    where federationexternalcreditid = p_federationexternalcreditid
      and competitionid = p_competitionid;

    return query
    select
        v_total_allocated as approvedamount,
        v_allocations_count as allocationscount,
        v_credit_available - v_total_allocated as remainingcreditamount,
        'הצעת ההתאמה אושרה ושויכה בהצלחה'::text as message;
end;
$function$
