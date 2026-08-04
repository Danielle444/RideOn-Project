-- ============================================================================
-- usp_allocatefederationcredittochargesecured - competition-scoped wrapper
-- around usp_allocatefederationcredittocharge (193)
-- ============================================================================
-- NEW FUNCTION, 2026-08-06. Closes a cross-competition authorization gap
-- found in the legacy single-charge allocation path: the Controller/BL layer
-- authorizes the caller against a specific competitionId (via
-- ValidateHostSecretaryCompetitionAccess), but that competitionId was never
-- forwarded past the C# layer - usp_allocatefederationcredittocharge (193)
-- has no p_competitionid parameter at all, and only checks that the selected
-- credit's and charge's own competitions match EACH OTHER, never that either
-- matches the competition the caller was actually authorized for. A secretary
-- authorized for Competition A could therefore submit a FederationExternal-
-- CreditId/BillChargeId pair that both genuinely belong to Competition B, and
-- 193 would allocate against B without ever knowing A was the authorized
-- scope.
--
-- This function does not change 193's signature, behavior, or callers'
-- expectations of it in any way - 193 remains the single-charge write
-- primitive, called by this wrapper exactly the way it was always called
-- directly before. This wrapper only adds an authoritative, competition-
-- scoped existence check on the credit and the charge - under the same
-- locks 193 itself would otherwise take - before ever calling into 193. If
-- either row does not exist within p_competitionid, the whole call is
-- rejected before 193 is ever reached and before any write occurs.
--
-- Design, mirroring the already-proven credit-then-charge lock order shared
-- by 193/199/223/225: lock the federationexternalcredit row scoped to
-- p_competitionid first (FOR UPDATE), then the billcharge row scoped to
-- p_competitionid second (FOR UPDATE) - the competition predicate is applied
-- directly inside each locked lookup, never as a separate unlocked existence
-- check followed by a scope check, so there is no window between "found" and
-- "scoped" for either row. usp_allocatefederationcredittocharge (193) will
-- re-lock the same two rows when it runs immediately after, inside the same
-- transaction - PostgreSQL row locks are re-entrant for the same session/
-- transaction, so this cannot self-block, and 193 sees the exact same
-- authoritative, already-scoped rows this wrapper just confirmed. No
-- EXCEPTION handler wraps any of this, so any failure - from this wrapper's
-- own scoping checks or from 193 itself - propagates and rolls back the
-- whole call atomically, exactly as 193 alone already behaves today.
--
-- This wrapper deliberately duplicates none of 193's own logic: no
-- paymentbatch guard, no remaining-credit/remaining-charge calculation, no
-- allocation INSERT, no credit/charge UPDATE, no status logic. Every one of
-- those checks and writes still happens exactly once, inside 193.
--
-- usp_allocatefederationcredittocharge (193) itself is unchanged and remains
-- live - it is not converted into a rejecting shim and not dropped. It is
-- simply no longer meant to be called directly by application code; this
-- wrapper is now the intended entry point for both the legacy direct C#
-- caller and usp_bulkallocatefederationcredittocharges (225), mirroring the
-- existing usp_answerchangeentryrequest (210) -> usp_answerchangeentry-
-- requestsecured (221) precedent already established in this codebase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_allocatefederationcredittochargesecured(
    p_competitionid integer,
    p_federationexternalcreditid integer,
    p_billchargeid integer,
    p_allocatedamount numeric,
    p_allocatedbysystemuserid integer,
    p_notes text DEFAULT NULL::text
)
 RETURNS TABLE(
    federationcreditallocationid integer,
    federationexternalcreditid integer,
    billchargeid integer,
    entryid integer,
    allocatedamount numeric,
    creditusedamount numeric,
    creditavailableamount numeric,
    creditstatus character varying,
    billchargeamount numeric,
    billchargecoveredamount numeric,
    billchargestatus character varying
 )
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

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

    -- Lock the credit first, scoped directly to p_competitionid in the same
    -- locked lookup - never an unlocked existence check followed by a
    -- separate scope comparison, so there is no window where an out-of-
    -- competition credit could be considered "found" before being rejected.
    perform 1
    from public.federationexternalcredit fec
    where fec.federationexternalcreditid = p_federationexternalcreditid
      and fec.competitionid = p_competitionid
    for update;

    if not found then
        raise exception 'Federation external credit % was not found in competition %',
            p_federationexternalcreditid,
            p_competitionid;
    end if;

    -- Lock the charge second, same scoped-in-the-lookup pattern.
    perform 1
    from public.billcharge bc
    where bc.billchargeid = p_billchargeid
      and bc.competitionid = p_competitionid
    for update;

    if not found then
        raise exception 'Bill charge % was not found in competition %',
            p_billchargeid,
            p_competitionid;
    end if;

    -- Both rows are now locked and provably scoped to p_competitionid.
    -- Delegate the entire allocation write to usp_allocatefederationcredit-
    -- tocharge (193) unchanged - it will re-lock the same two rows (re-
    -- entrant, same transaction, no self-block) and perform every remaining
    -- validation and write itself. Any exception it raises propagates
    -- unhandled and rolls back this whole call, including the locks taken
    -- above.
    return query
    select *
    from public.usp_allocatefederationcredittocharge(
        p_federationexternalcreditid,
        p_billchargeid,
        p_allocatedamount,
        p_allocatedbysystemuserid,
        p_notes
    );
end;
$function$;
