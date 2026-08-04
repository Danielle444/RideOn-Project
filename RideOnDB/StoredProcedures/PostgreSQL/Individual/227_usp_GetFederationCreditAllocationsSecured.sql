-- ============================================================================
-- usp_getfederationcreditallocationssecured - competition-scoped wrapper
-- around usp_getfederationcreditallocations (194)
-- ============================================================================
-- NEW FUNCTION. Closes a cross-competition disclosure gap in the allocation-
-- history read path: the Controller/BL layer authorizes the caller against a
-- specific competitionId (via ValidateHostSecretaryCompetitionAccess), but
-- that competitionId was never forwarded past the C# layer -
-- usp_getfederationcreditallocations (194) has no competition/ranch
-- parameter at all and only checks that the requested credit exists
-- anywhere in the system. A HostSecretary authorized for Competition A could
-- therefore supply a FederationExternalCreditId that genuinely belongs to
-- Competition B and read B's full allocation detail (payer names, amounts,
-- rider/horse identities) even though A is the only competition they were
-- ever authorized for.
--
-- This function does not change 194's signature, behavior, or result shape
-- in any way - 194 remains the single source of truth for the allocation
-- join/projection, called by this wrapper exactly the way it was always
-- called directly before. This wrapper only adds an authoritative,
-- competition-scoped existence check on the credit before ever calling into
-- 194. If the credit does not exist within p_competitionid, the whole call
-- is rejected before 194 is ever reached.
--
-- Read-only: no row lock is taken (nothing is written), matching the
-- lock-free nature of 194 itself.
--
-- usp_getfederationcreditallocations (194) itself is unchanged and remains
-- live - it is not converted into a rejecting shim and not dropped. It is
-- simply no longer meant to be called directly by application code; this
-- wrapper is now the intended entry point, mirroring the existing
-- usp_allocatefederationcredittocharge (193) -> usp_allocatefederationcredit-
-- tochargesecured (226) precedent already established in this codebase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getfederationcreditallocationssecured(
    p_competitionid integer,
    p_federationexternalcreditid integer
)
 RETURNS TABLE(
    federationcreditallocationid integer,
    federationexternalcreditid integer,
    billchargeid integer,
    entryid integer,
    allocatedamount numeric,
    allocatedat timestamp with time zone,
    allocationnotes text,
    billid integer,
    paidbypersonid integer,
    payerfullname text,
    riderfederationmemberid integer,
    riderfullname text,
    horseid integer,
    horsename text,
    classincompid integer,
    classname text,
    classdatetime timestamp with time zone,
    billchargeamount numeric,
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

    -- Existence AND scope are checked together, in one predicate - never an
    -- unscoped existence check followed by a separate scope comparison, so
    -- there is no window where an out-of-competition credit could be
    -- considered "found" before being rejected.
    if not exists (
        select 1
        from public.federationexternalcredit fec
        where fec.federationexternalcreditid = p_federationexternalcreditid
          and fec.competitionid = p_competitionid
    ) then
        raise exception 'Federation external credit % was not found in competition %',
            p_federationexternalcreditid,
            p_competitionid;
    end if;

    -- Credit is confirmed to belong to p_competitionid. Delegate the entire
    -- read to usp_getfederationcreditallocations (194) unchanged - it will
    -- re-derive the same credit by id (no re-check needed; the row can't
    -- change competition between statements within this single call) and
    -- return the exact same result shape it always has.
    return query
    select *
    from public.usp_getfederationcreditallocations(
        p_federationexternalcreditid
    );
end;
$function$;
