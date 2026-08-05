-- ============================================================================
-- usp_approvefederationmatchingsuggestionidempotent - idempotent front door
-- for Federation matching-suggestion approval
-- ============================================================================
-- NEW FUNCTION, 2026-08-06. Adds operation-id idempotency for the
-- matching-suggestion approval path WITHOUT altering
-- usp_approvefederationmatchingsuggestion (199) in any way - 199 remains
-- live, unmodified, and is never called by this function.
--
-- 199 cannot be treated as an opaque wrapper the way 225/226 can for the
-- other two idempotent functions: its own public RETURNS TABLE shape is a
-- single 4-column aggregate row (approvedamount, allocationscount,
-- remainingcreditamount, message) with no per-charge detail at all, so a
-- thin wrapper calling 199 as a black box would have no way to know which
-- charges it actually touched - exactly the "children captured from the
-- charges actually selected" requirement this function exists to satisfy.
-- Reconstructing that afterward by diffing federationcreditallocation would
-- be racy and unreliable.
--
-- Resolution: this function reproduces 199's own candidate-selection query
-- and per-charge re-lock/re-validate/skip logic VERBATIM (see the inline
-- comment at the loop below), but every actual write is delegated to
-- usp_allocatefederationcredittochargesecured (226) - never to
-- usp_allocatefederationcredittocharge (193) directly - exactly mirroring
-- how usp_bulkallocatefederationcredittocharges (225) already delegates its
-- own per-charge writes to 226. A charge is only ever handed to 226 once it
-- has already passed the identical eligibility pre-check 199 itself performs
-- (fresh lock, status/paymentbatch re-validation, CONTINUE past an
-- ineligible one rather than aborting the whole batch) - 226/193 would RAISE
-- on an ineligible charge, which would abort the entire transaction and
-- break the greedy loop's existing "cover as many eligible charges as
-- possible" behavior if called on a charge that hadn't already passed this
-- check.
--
-- Concurrency/claim, transaction model and payload-fingerprint rules are
-- identical in spirit to usp_allocatefederationcredittochargeidempotent
-- (228) - see that file's header for the full proof. The fingerprint here
-- covers competition, credit, payer, requested amount, actor and notes -
-- there is no charge set to canonicalize, since candidate charges are
-- discovered server-side, never caller-selected.
--
-- Because a single call can touch multiple charges, the caller-visible
-- replay contract is the 4-column AGGREGATE snapshot stored on the parent
-- federationallocationrequest row - matching 199's own return shape exactly
-- - while per-charge federationallocationrequestitem rows are still recorded
-- underneath for audit/completeness. A matched-payload retry replays the
-- stored aggregate directly; the greedy loop never re-runs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_approvefederationmatchingsuggestionidempotent(
    p_requestid text,
    p_competitionid integer,
    p_federationexternalcreditid integer,
    p_paidbypersonid integer,
    p_amount numeric,
    p_allocatedbysystemuserid integer,
    p_notes text DEFAULT NULL::text
)
 RETURNS TABLE(
    approvedamount numeric,
    allocationscount integer,
    remainingcreditamount numeric,
    message text
 )
 LANGUAGE plpgsql
AS $function$
declare
    v_fingerprint text;
    v_existing_fingerprint text;
    v_claimed text;

    v_credit_available numeric;
    v_remaining_to_allocate numeric;
    v_allocations_count integer := 0;
    v_total_allocated numeric := 0;

    v_charge record;
    v_charge_status_fresh character varying;
    v_charge_amount_fresh numeric;
    v_charge_paymentbatchid_fresh integer;
    v_charge_covered_fresh numeric;
    v_charge_missing numeric;
    v_allocate_amount numeric;

    v_alloc record;
begin
    if p_requestid is null or length(trim(p_requestid)) = 0 then
        raise exception 'Operation id is required';
    end if;

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

    v_fingerprint := md5(
        'MatchingSuggestionApproval' || '|' ||
        p_competitionid::text || '|' ||
        p_federationexternalcreditid::text || '|' ||
        p_paidbypersonid::text || '|' ||
        p_amount::text || '|' ||
        p_allocatedbysystemuserid::text || '|' ||
        coalesce(p_notes, '')
    );

    insert into public.federationallocationrequest (
        requestid, operationtype, competitionid, federationexternalcreditid,
        requestedbysystemuserid, paidbypersonid, requestedamount, notes, payloadfingerprint
    )
    values (
        p_requestid, 'MatchingSuggestionApproval', p_competitionid, p_federationexternalcreditid,
        p_allocatedbysystemuserid, p_paidbypersonid, p_amount, p_notes, v_fingerprint
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

        -- Same id, same payload, already succeeded - replay the stored
        -- aggregate. The greedy allocation loop never re-runs on retry.
        return query
        select
            r.snapshot_approvedamount,
            r.snapshot_allocationscount,
            r.snapshot_remainingcreditamount,
            r.snapshot_message
        from public.federationallocationrequest r
        where r.requestid = p_requestid;

        return;
    end if;

    -- Won the claim - lock the credit exactly as 199 does.
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

    -- Candidate-selection query, mirrors 199 verbatim.
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

        -- Re-lock and re-validate this candidate fresh, exactly as 199 does.
        -- CONTINUE past an ineligible one rather than calling 226 for it -
        -- see the file header for why.
        select bc2.chargestatus, bc2.amounttopay, bc2.paymentbatchid
        into v_charge_status_fresh, v_charge_amount_fresh, v_charge_paymentbatchid_fresh
        from public.billcharge bc2
        where bc2.billchargeid = v_charge.billchargeid
        for update;

        if v_charge_status_fresh in ('Cancelled', 'Replaced', 'Rejected', 'PendingApproval') then
            continue;
        end if;

        if v_charge_paymentbatchid_fresh is not null then
            continue;
        end if;

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

        -- Charge has already passed the identical eligibility check 226/193
        -- would themselves re-run - delegate the actual write.
        select * into v_alloc
        from public.usp_allocatefederationcredittochargesecured(
            p_competitionid,
            p_federationexternalcreditid,
            v_charge.billchargeid,
            v_allocate_amount,
            p_allocatedbysystemuserid,
            coalesce(p_notes, 'אישור הצעת התאמה אוטומטית')
        );

        insert into public.federationallocationrequestitem (
            requestid, billchargeid, requestedamount, resultfederationcreditallocationid,
            snapshot_federationcreditallocationid, snapshot_entryid, snapshot_allocatedamount,
            snapshot_creditusedamount, snapshot_creditavailableamount, snapshot_creditstatus,
            snapshot_billchargeamount, snapshot_billchargecoveredamount, snapshot_billchargestatus
        )
        values (
            p_requestid, v_alloc.billchargeid, v_allocate_amount, v_alloc.federationcreditallocationid,
            v_alloc.federationcreditallocationid, v_alloc.entryid, v_alloc.allocatedamount,
            v_alloc.creditusedamount, v_alloc.creditavailableamount, v_alloc.creditstatus,
            v_alloc.billchargeamount, v_alloc.billchargecoveredamount, v_alloc.billchargestatus
        );

        -- Bookkeeping trusts 226/193's own returned amount as the source of
        -- truth, not this loop's pre-computed guess - both should always
        -- agree, since the pre-check above just re-confirmed the same state
        -- under the same lock this transaction has held on the credit since
        -- the top.
        v_remaining_to_allocate := v_remaining_to_allocate - v_alloc.allocatedamount;
        v_total_allocated := v_total_allocated + v_alloc.allocatedamount;
        v_allocations_count := v_allocations_count + 1;
    end loop;

    if v_total_allocated <= 0 then
        raise exception 'No open federation charges were found for this payer';
    end if;

    -- federationexternalcredit was already updated incrementally, once per
    -- charge, inside each usp_allocatefederationcredittocharge (193) call
    -- above via 226's delegation - no additional aggregate update happens
    -- here, unlike 199's own single end-of-loop update, since that would
    -- double-deduct the same amount.
    update public.federationallocationrequest
    set
        snapshot_approvedamount = v_total_allocated,
        snapshot_allocationscount = v_allocations_count,
        snapshot_remainingcreditamount = v_credit_available - v_total_allocated,
        snapshot_message = 'הצעת ההתאמה אושרה ושויכה בהצלחה'
    where requestid = p_requestid;

    return query
    select
        v_total_allocated,
        v_allocations_count,
        v_credit_available - v_total_allocated,
        'הצעת ההתאמה אושרה ושויכה בהצלחה'::text;
end;
$function$;
