-- ============================================================================
-- usp_approvefederationmatchingsuggestion - bulk-approve a matching suggestion (FIFO allocation)
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). KNOWN ISSUES documented in that audit, NOT fixed here:
--   - Unlike usp_allocatefederationcredittocharge (193), the driving cursor
--     over candidate billcharge rows has NO `FOR UPDATE` lock - two
--     concurrent calls (from different credits, or racing 193) can each read
--     the same "missing amount" snapshot and both insert allocations before
--     either commits a chargestatus update, over-allocating past the charge's
--     face value.
--   - No creditstatus guard at all - only availableamount > 0 is checked,
--     unlike 193's explicit Cancelled/Refunded/ClosedManually/
--     TransferredToNextCompetition blocklist.
--   - Candidate charges exclude Cancelled/Replaced/Rejected/PendingApproval
--     but NOT 'Paid' - combined with usp_createcompetitionpayerpayment (200),
--     which can pay a Federation charge via a normal paymentbatch, this is
--     the same double-payment gap as 193: "missing amount" here is computed
--     purely from federationcreditallocation, never from paymentbatchid.
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

        v_charge_missing := v_charge.missingamount;
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

        v_charge_covered_after := v_charge.coveredamount + v_allocate_amount;

        if v_charge_covered_after >= v_charge.amounttopay then
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
