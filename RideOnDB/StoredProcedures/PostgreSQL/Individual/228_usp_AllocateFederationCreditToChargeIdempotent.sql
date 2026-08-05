-- ============================================================================
-- usp_allocatefederationcredittochargeidempotent - idempotent front door for
-- the direct single-charge Federation allocation path
-- ============================================================================
-- NEW FUNCTION, 2026-08-06. Adds operation-id idempotency on top of the
-- existing, unchanged usp_allocatefederationcredittochargesecured (226) /
-- usp_allocatefederationcredittocharge (193) chain, without altering either
-- of those functions' signature or body in any way.
--
-- Concurrency/claim: INSERT ... ON CONFLICT (requestid) DO NOTHING is the
-- sole gate. A concurrent caller submitting the same p_requestid blocks on
-- this row's lock until this transaction resolves; if it commits, the loser
-- sees the committed row and replays; if it rolls back, the loser claims the
-- id itself and becomes the real attempt. See the design report's full
-- concurrency proof.
--
-- Transaction model: ONE plain transaction. There is no durable
-- Failed/InProgress state anywhere in this design - a row's existence in
-- federationallocationrequest means the operation it represents completed
-- successfully. Any exception raised below (including from 226/193)
-- propagates unhandled and rolls back the whole call, including the claim
-- row just inserted - nothing partial is ever committed. A retry with the
-- same id after such a rollback finds no row and genuinely reprocesses.
--
-- Payload identity: the fingerprint is computed here, server-side, from the
-- actual bound parameters - never trusted from the client. Reuse of an id
-- against a different payload is rejected (SQLSTATE RN001, this codebase's
-- existing business-rule-guard convention) before any lock on
-- federationexternalcredit/billcharge is taken.
--
-- Security: every actual write is delegated to usp_allocatefederationcredit-
-- tochargesecured (226), never to usp_allocatefederationcredittocharge (193)
-- directly - 226's existing competition-scoped locked lookup on both the
-- credit and the charge runs unchanged, so no crafted cross-competition id
-- can reach 193 through this function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_allocatefederationcredittochargeidempotent(
    p_requestid text,
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
declare
    v_fingerprint text;
    v_existing_fingerprint text;
    v_claimed text;
    v_alloc record;
begin
    if p_requestid is null or length(trim(p_requestid)) = 0 then
        raise exception 'Operation id is required';
    end if;

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

    -- Canonical request identity, derived here from the actual parameters -
    -- never accepted as a client-supplied value. Includes every load-bearing
    -- field: operation type, competition, credit, charge, amount, actor
    -- (claims-derived, never client-controlled by the time it reaches this
    -- function), and notes.
    v_fingerprint := md5(
        'DirectAllocation' || '|' ||
        p_competitionid::text || '|' ||
        p_federationexternalcreditid::text || '|' ||
        p_billchargeid::text || '|' ||
        p_allocatedamount::text || '|' ||
        p_allocatedbysystemuserid::text || '|' ||
        coalesce(p_notes, '')
    );

    insert into public.federationallocationrequest (
        requestid, operationtype, competitionid, federationexternalcreditid,
        requestedbysystemuserid, paidbypersonid, requestedamount, notes, payloadfingerprint
    )
    values (
        p_requestid, 'DirectAllocation', p_competitionid, p_federationexternalcreditid,
        p_allocatedbysystemuserid, null, p_allocatedamount, p_notes, v_fingerprint
    )
    on conflict (requestid) do nothing
    returning requestid into v_claimed;

    if v_claimed is null then
        -- Someone already holds this operation id. The conflict guarantees a
        -- COMMITTED row exists by this point (ON CONFLICT blocks on an
        -- in-flight conflicting insert until it resolves - it never reports a
        -- conflict against an uncommitted row), so this SELECT is guaranteed
        -- to find one.
        select payloadfingerprint into v_existing_fingerprint
        from public.federationallocationrequest
        where requestid = p_requestid;

        if v_existing_fingerprint <> v_fingerprint then
            raise exception 'Operation id % was already used for a different request payload', p_requestid
                using errcode = 'RN001';
        end if;

        -- Same id, same payload, already succeeded - replay the frozen
        -- snapshot. Zero new mutation, no lock taken on
        -- federationexternalcredit/billcharge at all.
        return query
        select
            i.snapshot_federationcreditallocationid,
            p_federationexternalcreditid,
            i.billchargeid,
            i.snapshot_entryid,
            i.snapshot_allocatedamount,
            i.snapshot_creditusedamount,
            i.snapshot_creditavailableamount,
            i.snapshot_creditstatus,
            i.snapshot_billchargeamount,
            i.snapshot_billchargecoveredamount,
            i.snapshot_billchargestatus
        from public.federationallocationrequestitem i
        where i.requestid = p_requestid;

        return;
    end if;

    -- Won the claim - perform the real work through the competition-scoped
    -- secured wrapper. Any exception here propagates and rolls back this
    -- whole call, including the claim row just inserted above.
    select * into v_alloc
    from public.usp_allocatefederationcredittochargesecured(
        p_competitionid,
        p_federationexternalcreditid,
        p_billchargeid,
        p_allocatedamount,
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
        p_requestid, v_alloc.billchargeid, p_allocatedamount, v_alloc.federationcreditallocationid,
        v_alloc.federationcreditallocationid, v_alloc.entryid, v_alloc.allocatedamount,
        v_alloc.creditusedamount, v_alloc.creditavailableamount, v_alloc.creditstatus,
        v_alloc.billchargeamount, v_alloc.billchargecoveredamount, v_alloc.billchargestatus
    );

    return query
    select
        v_alloc.federationcreditallocationid,
        v_alloc.federationexternalcreditid,
        v_alloc.billchargeid,
        v_alloc.entryid,
        v_alloc.allocatedamount,
        v_alloc.creditusedamount,
        v_alloc.creditavailableamount,
        v_alloc.creditstatus,
        v_alloc.billchargeamount,
        v_alloc.billchargecoveredamount,
        v_alloc.billchargestatus;
end;
$function$;
