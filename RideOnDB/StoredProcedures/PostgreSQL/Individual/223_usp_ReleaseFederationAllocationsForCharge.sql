-- ============================================================================
-- usp_releasefederationallocationsforcharge - release Federation credit
-- allocations for one Federation entry billcharge
-- ============================================================================
-- NEW FUNCTION, 2026-08-04. Shared helper for the entry-cancellation
-- federation-release feature (usp_secretarydeleteentry /
-- usp_answerchangeentryrequest / usp_answerchangeentryrequestsecured), added
-- ahead of any caller integration - nothing calls this yet.
--
-- Scope: performs no authorization and does not decide whether an entry may
-- be cancelled - that remains entirely the caller's responsibility. Never
-- touches Organizer charges, never creates a fine, never updates entry or
-- changeentryrequest. Handles only release of federationcreditallocation
-- rows attached to the one Federation "classes"/"Entry" billcharge it is
-- given: restores the released amount to each originating
-- federationexternalcredit, recalculates only the three ordinary credit
-- statuses (Available/PartiallyUsed/FullyUsed), preserves the five
-- special/manual statuses (NeedsReview/Cancelled/Refunded/
-- TransferredToNextCompetition/ClosedManually) exactly, and deletes the
-- released allocation rows. No reversal-history table in this slice.
--
-- Lock order: federationexternalcredit row(s) touched by this charge's
-- current allocations, ascending federationexternalcreditid, THEN the
-- billcharge row, THEN the allocation rows themselves - matching the order
-- already used by usp_allocatefederationcredittocharge (193) and the
-- deployed usp_approvefederationmatchingsuggestion (199), and compatible
-- with the deployed usp_createcompetitionpayerpayment (200), which locks
-- billcharge rows only and never a federationexternalcredit row. See the
-- session's lock-order proof (a single fixed 5-level total order across
-- entry/changeentryrequest -> Organizer billcharge -> federationexternalcredit
-- -> Federation billcharge -> federationcreditallocation) for why this
-- ordering cannot deadlock against 193, 199, or 200.
--
-- Post-lock re-check, under the billcharge lock: chargeowner/categorykey/
-- sourcetype confirm this is genuinely a Federation "classes"/"Entry" charge
-- (a mismatch is a caller contract violation, raised loudly); an already
-- Cancelled charge is a safe idempotent no-op (nothing left to release);
-- paymentbatchid IS NOT NULL means real money moved via 200 and aborts the
-- release; any other status besides Open/Paid (i.e. Replaced or
-- PendingApproval) is not a valid release target and raises.
--
-- Concurrency: after locking the billcharge, re-verifies that no allocation
-- row references a credit outside the set already locked in the first step.
-- Credit-then-charge lock order is mandatory to avoid deadlocking against
-- 193/199/200 (none of which ever lock a charge before a credit they also
-- need), so a credit discovered only after the charge is locked cannot be
-- safely locked at that point without risking the exact reverse-order
-- deadlock this ordering exists to prevent - failing loudly and rolling back
-- (safe, retryable) is the correct response to that narrow, rare window,
-- not a silent proceed or an out-of-order lock attempt.
--
-- Amount invariants are validated explicitly, per credit, before any write -
-- release amount positive, usedamount covers it, availableamount plus the
-- release never exceeds originalamount, and the resulting amounts stay
-- within bounds. A violation raises and rolls back the whole transaction;
-- values are never clamped and inconsistent historical data is never
-- silently repaired.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_releasefederationallocationsforcharge(p_billchargeid integer)
RETURNS void
LANGUAGE plpgsql AS $function$
declare
    v_chargeowner    character varying;
    v_categorykey    character varying;
    v_sourcetype     character varying;
    v_chargestatus   character varying;
    v_paymentbatchid integer;

    v_credit_id          integer;
    v_locked_credit_ids  integer[];

    v_release          record;
    v_credit_original  numeric;
    v_credit_used      numeric;
    v_credit_available numeric;
    v_credit_status    character varying;
    v_new_available    numeric;
    v_new_used         numeric;
    v_new_status       character varying;
begin
    if p_billchargeid is null or p_billchargeid <= 0 then
        raise exception 'Invalid bill charge id';
    end if;

    -- Lock every distinct federation credit currently referenced by this
    -- charge's allocations, ascending federationexternalcreditid order,
    -- matching the lock order already used by
    -- usp_allocatefederationcredittocharge (193) and
    -- usp_approvefederationmatchingsuggestion (199).
    v_locked_credit_ids := '{}'::integer[];

    for v_credit_id in
        select distinct fca.federationexternalcreditid
        from public.federationcreditallocation fca
        where fca.billchargeid = p_billchargeid
        order by fca.federationexternalcreditid
    loop
        perform 1
        from public.federationexternalcredit
        where federationexternalcreditid = v_credit_id
        for update;

        v_locked_credit_ids := array_append(v_locked_credit_ids, v_credit_id);
    end loop;

    -- Lock the billcharge row itself.
    select bc.chargeowner, bc.categorykey, bc.sourcetype, bc.chargestatus, bc.paymentbatchid
    into v_chargeowner, v_categorykey, v_sourcetype, v_chargestatus, v_paymentbatchid
    from public.billcharge bc
    where bc.billchargeid = p_billchargeid
    for update;

    if v_chargeowner is null then
        raise exception 'Bill charge % was not found', p_billchargeid;
    end if;

    -- Re-check under lock that this is genuinely a Federation entry-classes
    -- charge - a wrong id is a caller contract violation, not a race, and
    -- must raise loudly rather than silently do nothing or something wrong.
    if v_chargeowner <> 'Federation' or v_categorykey <> 'classes' or v_sourcetype <> 'Entry' then
        raise exception 'Bill charge % is not a Federation entry charge', p_billchargeid;
    end if;

    -- Already fully released (or never touched) - a repeated/duplicate call
    -- against an already-cancelled charge is a safe no-op, not an error.
    if v_chargestatus = 'Cancelled' then
        return;
    end if;

    -- Authoritative real-money guard, under lock: a charge that became
    -- genuinely Paid via usp_createcompetitionpayerpayment (200) between the
    -- caller's lookup and this lock must abort the whole release.
    if v_paymentbatchid is not null then
        raise exception 'Bill charge % was paid through a payment batch and cannot be released', p_billchargeid;
    end if;

    -- Any other state (Replaced, PendingApproval) is not a valid release
    -- target for an original entry's own Federation charge.
    if v_chargestatus not in ('Open', 'Paid') then
        raise exception 'Bill charge % is not in a releasable state (%)', p_billchargeid, v_chargestatus;
    end if;

    -- Defensive check: prove the credit-locking loop above already locked
    -- every credit now present. Credit-then-charge lock order is mandatory
    -- to avoid deadlocking against 193/199/200 (none of which ever lock a
    -- charge before a credit they also need) - a credit discovered only
    -- after the charge is already locked cannot be safely locked at this
    -- point without risking the exact reverse-order deadlock this ordering
    -- exists to prevent. Failing loudly and rolling back (safe, retryable)
    -- is the correct response to this narrow, rare window.
    if exists (
        select 1
        from public.federationcreditallocation
        where billchargeid = p_billchargeid
          and not (federationexternalcreditid = any(v_locked_credit_ids))
    ) then
        raise exception 'Federation credit allocation set for bill charge % changed concurrently; retry the release', p_billchargeid;
    end if;

    -- Lock every allocation row for this charge (now provably complete and
    -- stable).
    perform 1
    from public.federationcreditallocation
    where billchargeid = p_billchargeid
    for update;

    -- One update per credit, using the SUM of every allocation row against
    -- that credit for this charge. Every invariant is checked explicitly; a
    -- violation raises and rolls back the whole transaction - amounts are
    -- never clamped.
    for v_release in
        select
            fca.federationexternalcreditid,
            sum(fca.allocatedamount) as release_amount
        from public.federationcreditallocation fca
        where fca.billchargeid = p_billchargeid
        group by fca.federationexternalcreditid
        order by fca.federationexternalcreditid
    loop
        if v_release.release_amount is null or v_release.release_amount <= 0 then
            raise exception 'Federation credit allocation invariant violated: non-positive release amount % for credit %',
                v_release.release_amount, v_release.federationexternalcreditid;
        end if;

        select
            fec.originalamount,
            fec.usedamount,
            fec.availableamount,
            fec.creditstatus
        into
            v_credit_original,
            v_credit_used,
            v_credit_available,
            v_credit_status
        from public.federationexternalcredit fec
        where fec.federationexternalcreditid = v_release.federationexternalcreditid;

        if v_credit_used < v_release.release_amount then
            raise exception 'Federation credit % invariant violated: usedamount % is less than release amount %',
                v_release.federationexternalcreditid, v_credit_used, v_release.release_amount;
        end if;

        if v_credit_available + v_release.release_amount > v_credit_original then
            raise exception 'Federation credit % invariant violated: availableamount % plus release amount % exceeds originalamount %',
                v_release.federationexternalcreditid, v_credit_available, v_release.release_amount, v_credit_original;
        end if;

        v_new_used := v_credit_used - v_release.release_amount;
        v_new_available := v_credit_available + v_release.release_amount;

        if v_new_used < 0 then
            raise exception 'Federation credit % invariant violated: resulting usedamount % is negative',
                v_release.federationexternalcreditid, v_new_used;
        end if;

        if v_new_available > v_credit_original then
            raise exception 'Federation credit % invariant violated: resulting availableamount % exceeds originalamount %',
                v_release.federationexternalcreditid, v_new_available, v_credit_original;
        end if;

        if v_credit_status in (
            'NeedsReview', 'Cancelled', 'Refunded',
            'TransferredToNextCompetition', 'ClosedManually'
        ) then
            v_new_status := v_credit_status;
        elsif v_new_available >= v_credit_original then
            v_new_status := 'Available';
        elsif v_new_available > 0 then
            v_new_status := 'PartiallyUsed';
        else
            v_new_status := 'FullyUsed';
        end if;

        update public.federationexternalcredit
        set
            usedamount = v_new_used,
            availableamount = v_new_available,
            creditstatus = v_new_status
        where federationexternalcreditid = v_release.federationexternalcreditid;
    end loop;

    -- Delete every released allocation row for this charge in one statement.
    delete from public.federationcreditallocation
    where billchargeid = p_billchargeid;

    return;
end;
$function$
