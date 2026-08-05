-- Admin Create Entry (Stage B): server-authoritative, idempotent entry
-- creation for the RanchAdmin mobile flow. Routes directly (an immediately
-- Active entry with Open charges) when registration is still open, or
-- creates a secretary-bound Proposed entry (no charges) when registration
-- has ended -- the server decides this from live competition dates, never
-- from a client-supplied flag.
--
-- Idempotency mirrors the proven usp_allocatefederationcredittochargeidempotent
-- pattern (repo file 228): claim admincreateentryoperation first via
-- INSERT ... ON CONFLICT DO NOTHING, do the real work only if the claim was
-- won, insert admincreateentryoperationresult as the unconditional LAST
-- statement of the successful path. A committed claim row without a result
-- row is impossible -- both inserts live inside this one function call, one
-- Postgres transaction; any RAISE aborts everything, including the claim.
-- The "still in progress" branch below is therefore defensive/unreachable
-- dead code by construction (a concurrent reader can only ever observe a
-- fully committed state of this transaction, which always has both rows) --
-- kept anyway, matching this codebase's own convention of guarding
-- schema-impossible states explicitly rather than silently assuming them.
--
-- personId and competitionId are verified via explicit stored columns on
-- admincreateentryoperation (personid mismatch and competitionid mismatch
-- each get their own distinct rejection message). ranchId scope is verified
-- via the fingerprint alone (folded into the hash, per the locked design's
-- explicit "either the fingerprint or explicit stored columns" allowance) --
-- a mismatched ranchId on a resubmitted operationid surfaces as the generic
-- "different payload" fingerprint-mismatch rejection, not a dedicated message.
--
-- Payer authorization (new -- usp_insertentry has none): the requested payer
-- must be either the acting admin themselves, or an Approved managed payer
-- holding an Approved 'משלם' role at the SAME host ranch -- mirrors the
-- personmanagedbysystemuser/personranchrole/role join shape already proven
-- in usp_getchangeentryrequestauthorizationcontext's isownedthroughmanagedpayer
-- check (repo file 218), reused here for a brand-new entry instead of an
-- existing one.
--
-- isregistrationended is recomputed here using the EXACT same CASE
-- expression Stage A added to usp_getregistrationstepstatus (repo file 220)
-- -- reproduced, not diverged, because this proc needs its own competition
-- row lookup anyway (for cost sourcing and the competition-ended guard) and
-- usp_getregistrationstepstatus is a differently-shaped, RanchAdmin-
-- personalized proc returning many unrelated booleans, not meant to be
-- called as a sub-routine here.
--
-- Every other validation (class exists, competition-ended hard stop, horse
-- exists + ranch match, rider exists, coach exists if provided, payer
-- exists, bill creation via usp_getorcreateopenbillforpayerandcompetition,
-- servicerequest/entry insert shape, Organizer/Federation billcharge
-- creation, bill recalculation) is reused verbatim from usp_insertentry
-- (repo file 185) -- not reimplemented, not diverged. usp_insertentry itself
-- has no duplicate-entry guard and no class-status/date validation beyond
-- the competition-ended check, and no federation-membership validation
-- beyond existence -- none of that is reproduced here either, since none of
-- it exists in the proc this design reuses from.
--
-- Brand-new proc: CREATE OR REPLACE, no prior version to DROP.
CREATE OR REPLACE FUNCTION public.usp_admincreateentry(
    p_operationid text,
    p_personid integer,
    p_competitionid integer,
    p_ranchid integer,
    p_classincompid integer,
    p_horseid integer,
    p_riderfederationmemberid integer,
    p_coachfederationmemberid integer,
    p_paidbypersonid integer,
    p_prizerecipientname character varying
)
RETURNS TABLE(
    resulttype text,
    entryid integer,
    createentryrequestid integer
)
LANGUAGE plpgsql
AS $function$
declare
    -- Canonical operation id form, used consistently for the claim insert,
    -- the replay lookup, and the result insert -- never the raw parameter,
    -- so a caller cannot accidentally split one logical submission across
    -- two rows by varying only leading/trailing whitespace.
    v_operationid text;

    v_fingerprint text;

    v_claimed text;
    v_existing_personid integer;
    v_existing_competitionid integer;
    v_existing_fingerprint text;
    v_existing_resulttype text;
    v_existing_entryid integer;
    v_existing_createentryrequestid integer;

    v_actual_competitionid integer;
    v_organizercost numeric(10,2);
    v_federationcost numeric(10,2);
    v_competitionenddate date;
    v_registrationenddate date;
    v_competitionstartdate date;
    v_isregistrationended boolean;

    v_horse_ranchid integer;
    v_payer_authorized boolean;

    v_billid integer;
    v_srequestid integer;
    v_entryid integer;
    v_createentryrequestid integer;
    v_resulttype text;
begin
    -- Canonical OperationId rule: null rejects, empty rejects,
    -- whitespace-only rejects (trim reduces it to length 0, same branch as
    -- empty -- no silent use of an empty primary key), and an explicit
    -- length ceiling rejects an oversized value. 200 is deliberately
    -- generous relative to a standard UUID's 36 characters (more than 5x),
    -- comfortably covering any reasonable client-generated key shape
    -- (braces, a prefix, etc.) without guessing at Stage F's exact UUID
    -- library output format, while still bounding what is stored as a
    -- PRIMARY KEY text column and used in an index. All three branches use
    -- RN001, the same business-rule-guard convention as every other
    -- validation in this function.
    if p_operationid is null or length(trim(p_operationid)) = 0 then
        raise exception 'Operation id is required' using errcode = 'RN001';
    end if;

    v_operationid := trim(p_operationid);

    if length(v_operationid) > 200 then
        raise exception 'Operation id exceeds the maximum allowed length of 200 characters' using errcode = 'RN001';
    end if;

    if p_personid is null or p_personid <= 0 then
        raise exception 'Invalid person id';
    end if;

    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    -- Canonical fingerprint: every load-bearing field, actor and scope
    -- included, computed here from the actual validated parameters --
    -- never accepted as a client-supplied hash.
    v_fingerprint := md5(
        'AdminCreateEntry' || '|' ||
        p_personid::text || '|' ||
        p_competitionid::text || '|' ||
        p_ranchid::text || '|' ||
        p_classincompid::text || '|' ||
        p_horseid::text || '|' ||
        p_riderfederationmemberid::text || '|' ||
        coalesce(p_coachfederationmemberid::text, '') || '|' ||
        p_paidbypersonid::text || '|' ||
        coalesce(nullif(btrim(p_prizerecipientname), ''), '')
    );

    insert into public.admincreateentryoperation
        (operationid, competitionid, requestedbypersonid, payloadfingerprint)
    values
        (v_operationid, p_competitionid, p_personid, v_fingerprint)
    on conflict (operationid) do nothing
    returning operationid into v_claimed;

    if v_claimed is null then
        -- Someone already holds this operation id. The conflict guarantees a
        -- COMMITTED row exists by this point (ON CONFLICT blocks on an
        -- in-flight conflicting insert until it resolves -- it never reports
        -- a conflict against an uncommitted row).
        select requestedbypersonid, competitionid, payloadfingerprint
        into v_existing_personid, v_existing_competitionid, v_existing_fingerprint
        from public.admincreateentryoperation
        where operationid = v_operationid;

        if v_existing_personid <> p_personid then
            raise exception 'Operation id belongs to a different actor' using errcode = 'RN001';
        end if;

        if v_existing_competitionid <> p_competitionid then
            raise exception 'Operation id was issued for a different competition' using errcode = 'RN001';
        end if;

        if v_existing_fingerprint <> v_fingerprint then
            raise exception 'This operation id was already used with a different payload' using errcode = 'RN001';
        end if;

        select r.resulttype, r.entryid, r.createentryrequestid
        into v_existing_resulttype, v_existing_entryid, v_existing_createentryrequestid
        from public.admincreateentryoperationresult r
        where r.operationid = v_operationid;

        if v_existing_resulttype is null then
            raise exception 'A create request with this operation id is still in progress' using errcode = 'RN001';
        end if;

        -- Pure replay -- zero mutation beyond what already committed.
        return query select v_existing_resulttype, v_existing_entryid, v_existing_createentryrequestid;
        return;
    end if;

    -- Won the claim. Every validation below is reused verbatim from
    -- usp_insertentry unless explicitly marked NEW.
    select
        cic.competitionid,
        coalesce(cic.organizercost, 0),
        coalesce(cic.federationcost, 0)
    into
        v_actual_competitionid,
        v_organizercost,
        v_federationcost
    from public.classincompetition cic
    where cic.classincompid = p_classincompid;

    if v_actual_competitionid is null then
        raise exception 'Class not found';
    end if;

    -- NEW: cross-check the client-supplied competitionId against the
    -- class's real competition -- never trusted blindly, matching the
    -- established convention already used for ChangeEntryRequestsController.
    if v_actual_competitionid <> p_competitionid then
        raise exception 'Competition id does not match the class''s actual competition' using errcode = 'RN001';
    end if;

    select c.competitionenddate, c.registrationenddate, c.competitionstartdate
    into v_competitionenddate, v_registrationenddate, v_competitionstartdate
    from public.competition c
    where c.competitionid = v_actual_competitionid;

    if (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate then
        raise exception 'Competition has already ended' using errcode = 'RN001';
    end if;

    select h.ranchid
    into v_horse_ranchid
    from public.horse h
    where h.horseid = p_horseid;

    if v_horse_ranchid is null then
        raise exception 'Horse not found';
    end if;

    if v_horse_ranchid <> p_ranchid then
        raise exception 'Horse does not belong to your ranch';
    end if;

    if not exists (
        select 1 from public.federationmember fm
        where fm.federationmemberid = p_riderfederationmemberid
    ) then
        raise exception 'Rider not found';
    end if;

    if p_coachfederationmemberid is not null
       and not exists (
            select 1 from public.federationmember fm
            where fm.federationmemberid = p_coachfederationmemberid
       ) then
        raise exception 'Coach not found';
    end if;

    if not exists (
        select 1 from public.person p
        where p.personid = p_paidbypersonid
    ) then
        raise exception 'Payer not found';
    end if;

    -- NEW: payer authorization -- usp_insertentry has no equivalent. The
    -- requested payer must be the acting admin, or an Approved managed
    -- payer holding an Approved 'משלם' role at the SAME host ranch.
    v_payer_authorized := (
        p_paidbypersonid = p_personid
        or exists (
            select 1
            from public.personmanagedbysystemuser pmsu
            join public.personranchrole prr on prr.personid = pmsu.personid
            join public.role r on r.roleid = prr.roleid
            where pmsu.systemuserid = p_personid
              and pmsu.personid = p_paidbypersonid
              and pmsu.approvalstatus = 'Approved'
              and prr.ranchid = p_ranchid
              and prr.rolestatus = 'Approved'
              and r.rolename = 'משלם'
        )
    );

    if not v_payer_authorized then
        raise exception 'Requested payer is not authorized for this admin' using errcode = 'RN001';
    end if;

    -- NEW: registration-ended routing signal, reproducing Stage A's exact
    -- formula (usp_getregistrationstepstatus, repo file 220) verbatim.
    v_isregistrationended := (
        case
            when v_registrationenddate is not null
                then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_registrationenddate
            when v_competitionstartdate is not null
                then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= v_competitionstartdate
            else false
        end
    );

    -- Bill creation/reuse -- reused verbatim, identical for both branches
    -- (servicerequest.billid is NOT NULL regardless of which branch fires).
    v_billid := public.usp_getorcreateopenbillforpayerandcompetition(
        p_paidbypersonid,
        v_actual_competitionid
    );

    insert into public.servicerequest
        (orderedbysystemuserid, horseid, riderfederationmemberid, coachfederationmemberid, billid, srequestdatetime)
    values
        (p_personid, p_horseid, p_riderfederationmemberid, p_coachfederationmemberid, v_billid, now())
    returning srequestid
    into v_srequestid;

    if not v_isregistrationended then
        -- Direct branch: entrystatus left at its schema default ('Active'),
        -- matching usp_insertentry's own behavior exactly.
        insert into public.entry
            (entryid, classincompid, prizerecipientname, riderfederationmemberid)
        values
            (v_srequestid, p_classincompid, p_prizerecipientname, p_riderfederationmemberid)
        -- Table-qualified: RETURNS TABLE's own entryid output column would
        -- otherwise make an unqualified RETURNING reference ambiguous (42702).
        returning public.entry.entryid
        into v_entryid;

        if v_organizercost > 0 then
            insert into public.billcharge
                (billid, competitionid, paidbypersonid, chargeowner, categorykey, sourcetype, sourceid,
                 amounttopay, chargestatus, paymentbatchid, createdat, notes)
            values
                (v_billid, v_actual_competitionid, p_paidbypersonid, 'Organizer', 'classes', 'Entry', v_entryid,
                 v_organizercost, 'Open', null, now(), 'Created from Entry organizer cost');
        end if;

        if v_federationcost > 0 then
            insert into public.billcharge
                (billid, competitionid, paidbypersonid, chargeowner, categorykey, sourcetype, sourceid,
                 amounttopay, chargestatus, paymentbatchid, createdat, notes)
            values
                (v_billid, v_actual_competitionid, p_paidbypersonid, 'Federation', 'classes', 'Entry', v_entryid,
                 v_federationcost, 'Open', null, now(), 'Created from Entry federation cost');
        end if;

        perform public.usp_recalculatebillamount(v_billid);

        v_resulttype := 'DirectCreated';
        v_createentryrequestid := null;
    else
        -- Proposed branch: explicit 'Proposed' status, no billcharge rows
        -- created at all -- deferred to Stage E's answer proc.
        insert into public.entry
            (entryid, classincompid, prizerecipientname, riderfederationmemberid, entrystatus)
        values
            (v_srequestid, p_classincompid, p_prizerecipientname, p_riderfederationmemberid, 'Proposed')
        -- Table-qualified: see the Direct branch's insert above for why.
        returning public.entry.entryid
        into v_entryid;

        insert into public.createentryrequest (proposedentryid, status)
        values (v_entryid, 'Pending')
        returning createentryrequestid
        into v_createentryrequestid;

        v_resulttype := 'PendingCreateApproval';
    end if;

    insert into public.admincreateentryoperationresult
        (operationid, resulttype, entryid, createentryrequestid)
    values
        (v_operationid, v_resulttype, v_entryid, v_createentryrequestid);

    return query select v_resulttype, v_entryid, v_createentryrequestid;
end;
$function$;
