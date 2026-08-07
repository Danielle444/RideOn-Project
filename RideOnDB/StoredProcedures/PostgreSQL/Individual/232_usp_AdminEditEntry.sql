-- Admin Edit Entry (Stage C): server-authoritative, atomic, three-way-routed
-- direct edit for the RanchAdmin mobile flow. Replaces the client's current
-- two-call sequence (POST /Entries to build a replacement entry, then
-- POST /ChangeEntryRequests to link it) with one atomic server call, the
-- same shape of fix Stage B already applied to entry creation.
--
-- Three routes, chosen server-side from the caller-supplied class against
-- the entry's ACTUAL current class (never trusted blindly) and the
-- server-computed registration-ended signal (never a client flag):
--
--   1. Class unchanged: a true in-place UPDATE of entry/servicerequest.
--      No replacement entry, no changeentryrequest row, charges untouched
--      (organizercost/federationcost are purely a function of classincompid,
--      which is unchanged by definition on this branch).
--
--   2. Class changed, registration still open: builds a replacement entry
--      (validation reused verbatim from usp_insertentry, matching
--      usp_admincreateentry's own Direct branch), then composes
--      usp_insertchangeentryrequestadminranchsecured (234) followed
--      immediately by usp_answerchangeentryrequestsecured (221,
--      answerstatus='Approved') -- inside this same transaction. The
--      changeentryrequest row is created Pending and flipped to Approved
--      before this transaction ever commits, so no external reader can ever
--      observe a Pending row for a direct admin edit; the old entry is
--      transitioned to 'Replaced' and the new one to 'Active' entirely by
--      221's own proven logic, reused rather than reimplemented.
--
--   3. Class changed, registration ended: same replacement-entry build, but
--      only 234 is called (never 221) -- the changeentryrequest row is left
--      genuinely Pending, the replacement entry is created 'Proposed' (not
--      'Active', closing the same phantom-active-entry gap Stage B already
--      fixed for pure creation), and its charges are inserted 'Open' then
--      flipped to 'PendingApproval' by 234's own existing side effect --
--      never finalized before approval. This row is answerable by 221
--      completely unmodified; this file does not touch 218, 219, 220, or 221.
--
-- 234 (repo file 234_usp_InsertChangeEntryRequestAdminRanchSecured.sql) is a
-- NEW, ADDITIVE sibling of 219, built specifically for this flow -- not a
-- modification of 219. 219's own internal authorization re-derives
-- isranchadmininhostranch scoped to the entry's competition HOST ranch
-- (correct for 219's existing caller, ChangeEntryRequestsController), which
-- would wrongly reject a RanchAdmin whose own ranch (p_ranchid, already
-- proven by Stage B to routinely differ from the host ranch) is the correct
-- scope for this flow. 234 is 219's exact mutation/validation behavior with
-- only that authorization block re-derived against p_ranchid instead --
-- same table joins/role name/status filter as 218's own, correctly scoped.
-- Every other guard/message is reused verbatim (same wording) so the two
-- flows stay indistinguishable to a caller inspecting error text.
-- Payer reassignment is out of scope for this slice -- the replacement
-- entry's payer is always inherited from the original entry's existing
-- bill, never re-specified by the caller.
--
-- Idempotency: no operationId/claim-table mechanism is introduced here
-- (Stage C's locked design does not require one). "No duplicate active
-- entry on retry" is instead satisfied by an explicit pre-check that the
-- entry is not already in a terminal status and has no existing Pending
-- change request, matching the exact guard convention already used by
-- usp_secretarydeleteentry (145) and usp_cancelentrybypayer (139).
--
-- DUPLICATE-ENTRY GUARD: same guard as usp_insertentry (185), applied to the
-- class-changed replacement-entry branches (Case 2/3) -- a replacement into a
-- class that already has another Active entry for the same rider+horse is
-- rejected. Self-match is structurally impossible: the guard only runs after
-- Case 1 (p_classincompid = v_current_classincompid) has already returned, so
-- by the time it runs p_classincompid is always DIFFERENT from the entry
-- being replaced's own current class -- the entry being replaced can never
-- appear in its own guard's match set.
CREATE OR REPLACE FUNCTION public.usp_admineditentry(
    p_personid integer,
    p_entryid integer,
    p_competitionid integer,
    p_ranchid integer,
    p_classincompid integer,
    p_horseid integer,
    p_riderfederationmemberid integer,
    p_coachfederationmemberid integer,
    p_prizerecipientname character varying
)
RETURNS TABLE(
    resulttype text,
    entryid integer,
    changeentryrequestid integer
)
LANGUAGE plpgsql
AS $function$
declare
    v_ctx record;

    v_current_classincompid integer;
    v_current_entrystatus text;

    v_new_actual_competitionid integer;
    v_organizercost numeric(10,2);
    v_federationcost numeric(10,2);

    v_registrationenddate date;
    v_competitionstartdate date;
    v_isregistrationended boolean;

    v_horse_ranchid integer;
    v_paidbypersonid integer;
    v_billid integer;

    v_new_srequestid integer;
    v_new_entryid integer;
    v_changeentryrequestid integer;

    v_resulttype text;
    v_result_entryid integer;
begin
    if p_personid is null or p_personid <= 0 then
        raise exception 'Invalid person id';
    end if;

    if p_entryid is null or p_entryid <= 0 then
        raise exception 'Invalid entry id';
    end if;

    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    -- Model C authorization context, reused verbatim from the proc the
    -- existing (payer/admin) change-request flow already relies on. Only
    -- entryexists/actualcompetitionid/iscompetitionended/iswithinmodelcscope
    -- are consumed from it -- NOT isranchadmininhostranch. That column is
    -- scoped to the entry's competition HOST ranch (218's own documented
    -- design, correct for its existing caller, ChangeEntryRequestsController,
    -- which has no separate admin-ranch parameter). Stage B already proved
    -- p_ranchid represents the RanchAdmin's own/represented ranch, which
    -- routinely differs from the competition host ranch (a guest ranch's
    -- admin registering their own horse at a competition hosted elsewhere).
    -- Reusing isranchadmininhostranch here would wrongly reject that exact
    -- case, so the RanchAdmin-role check below is re-derived locally against
    -- p_ranchid instead -- same table joins, same role name, same status
    -- filter as 218's own check, just correctly scoped.
    select *
    into v_ctx
    from public.usp_getchangeentryrequestauthorizationcontext(
        p_entryid, null, p_competitionid, p_personid
    );

    if not v_ctx.entryexists then
        raise exception 'Original entry not found' using errcode = 'RN001';
    end if;

    if v_ctx.actualcompetitionid <> p_competitionid then
        raise exception 'Competition id does not match the entry''s actual competition' using errcode = 'RN001';
    end if;

    if not exists (
        select 1
        from public.personranchrole prr
        join public.role r on r.roleid = prr.roleid
        where prr.personid = p_personid
          and prr.ranchid = p_ranchid
          and prr.rolestatus = 'Approved'
          and r.rolename = 'אדמין חווה'
    ) then
        raise exception 'Caller is not an approved ranch admin for this entry''s ranch' using errcode = 'RN001';
    end if;

    if not v_ctx.iswithinmodelcscope then
        raise exception 'Caller is not authorized to modify this entry' using errcode = 'RN001';
    end if;

    if v_ctx.iscompetitionended then
        raise exception 'Competition has already ended' using errcode = 'RN001';
    end if;

    select e.classincompid, coalesce(e.entrystatus, 'Active')
    into v_current_classincompid, v_current_entrystatus
    from public.entry e
    where e.entryid = p_entryid;

    -- Retry/duplicate-mutation guard: same convention as 145/139. A
    -- terminal or already-superseded entry cannot be edited again.
    if v_current_entrystatus in ('Cancelled', 'CancelledAfterStart', 'Replaced', 'Rejected') then
        raise exception 'Entry is no longer active and cannot be edited' using errcode = 'RN001';
    end if;

    if exists (
        select 1 from public.changeentryrequest cer
        where cer.originalentryid = p_entryid and cer.status = 'Pending'
    ) then
        raise exception 'A pending change request already exists for this entry' using errcode = 'RN001';
    end if;

    -- Paid-entry guard, reused verbatim from 219/213 -- applied uniformly
    -- to every branch, matching existing precedent.
    if exists (
        select 1 from public.billcharge bc
        where bc.sourcetype = 'Entry' and bc.sourceid = p_entryid and bc.chargestatus = 'Paid'
    ) then
        raise exception 'Cannot create change request for a paid entry' using errcode = 'RN001';
    end if;

    -- Payer is always inherited from the original entry's existing bill --
    -- reassigning the payer is out of scope for this slice.
    select b.paidbypersonid, sr.billid
    into v_paidbypersonid, v_billid
    from public.servicerequest sr
    join public.bill b on b.billid = sr.billid
    where sr.srequestid = p_entryid;

    -- Horse/rider/coach validation, reused verbatim from usp_insertentry
    -- (matching usp_admincreateentry's own reuse of the same checks).
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

    if p_classincompid = v_current_classincompid then
        -- ===== Case 1: class unchanged -- true in-place update. =====
        update public.entry
        set riderfederationmemberid = p_riderfederationmemberid,
            prizerecipientname = p_prizerecipientname
        where entry.entryid = p_entryid;

        update public.servicerequest
        set horseid = p_horseid,
            coachfederationmemberid = p_coachfederationmemberid
        where srequestid = p_entryid;

        v_resulttype := 'DirectUpdated';
        v_result_entryid := p_entryid;
        v_changeentryrequestid := null;

        return query select v_resulttype, v_result_entryid, v_changeentryrequestid;
        return;
    end if;

    -- ===== Class changed: build a replacement entry, class/cost sourced
    -- from classincompetition, cross-checked against p_competitionid exactly
    -- like usp_admincreateentry does for its own class parameter. =====
    select
        cic.competitionid,
        coalesce(cic.organizercost, 0),
        coalesce(cic.federationcost, 0)
    into
        v_new_actual_competitionid,
        v_organizercost,
        v_federationcost
    from public.classincompetition cic
    where cic.classincompid = p_classincompid;

    if v_new_actual_competitionid is null then
        raise exception 'Class not found';
    end if;

    if v_new_actual_competitionid <> p_competitionid then
        raise exception 'Competition id does not match the class''s actual competition' using errcode = 'RN001';
    end if;

    -- Only reached when p_classincompid <> v_current_classincompid (Case 1,
    -- unchanged class, already returned above), so the entry being replaced
    -- can never match this class itself -- no self-exclusion needed. Same
    -- guard as usp_insertentry (185): an Active entry for the same
    -- rider+horse+class may not exist twice.
    if exists (
        select 1
        from public.entry e
        join public.servicerequest sr on sr.srequestid = e.entryid
        where e.classincompid = p_classincompid
          and sr.riderfederationmemberid = p_riderfederationmemberid
          and sr.horseid = p_horseid
          and coalesce(e.entrystatus, 'Active') = 'Active'
    ) then
        raise exception 'An active entry already exists for this rider, horse and class' using errcode = 'RN001';
    end if;

    insert into public.servicerequest
        (orderedbysystemuserid, horseid, riderfederationmemberid, coachfederationmemberid, billid, srequestdatetime)
    values
        (p_personid, p_horseid, p_riderfederationmemberid, p_coachfederationmemberid, v_billid, now())
    returning srequestid
    into v_new_srequestid;

    select c.registrationenddate, c.competitionstartdate
    into v_registrationenddate, v_competitionstartdate
    from public.competition c
    where c.competitionid = v_new_actual_competitionid;

    -- Server-authoritative registration-ended signal, reproducing Stage A's
    -- exact formula verbatim (usp_GetRegistrationStepStatus, repo file 220;
    -- also reproduced by usp_admincreateentry, repo file 231) -- never a
    -- client-supplied flag.
    v_isregistrationended := (
        case
            when v_registrationenddate is not null
                then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_registrationenddate
            when v_competitionstartdate is not null
                then (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= v_competitionstartdate
            else false
        end
    );

    if not v_isregistrationended then
        -- ===== Case 2: class changed, registration open. New entry starts
        -- 'Active' (usp_insertentry's own default), charges start 'Open',
        -- matching a normal direct create. =====
        insert into public.entry
            (entryid, classincompid, prizerecipientname, riderfederationmemberid)
        values
            (v_new_srequestid, p_classincompid, p_prizerecipientname, p_riderfederationmemberid)
        returning public.entry.entryid
        into v_new_entryid;
    else
        -- ===== Case 3: class changed, registration ended. New entry starts
        -- 'Proposed' -- not activated, matching usp_admincreateentry's own
        -- Pending branch and closing the phantom-active-entry gap. =====
        insert into public.entry
            (entryid, classincompid, prizerecipientname, riderfederationmemberid, entrystatus)
        values
            (v_new_srequestid, p_classincompid, p_prizerecipientname, p_riderfederationmemberid, 'Proposed')
        returning public.entry.entryid
        into v_new_entryid;
    end if;

    if v_organizercost > 0 then
        insert into public.billcharge
            (billid, competitionid, paidbypersonid, chargeowner, categorykey, sourcetype, sourceid,
             amounttopay, chargestatus, paymentbatchid, createdat, notes)
        values
            (v_billid, v_new_actual_competitionid, v_paidbypersonid, 'Organizer', 'classes', 'Entry', v_new_entryid,
             v_organizercost, 'Open', null, now(), 'Created from admin edit replacement entry organizer cost');
    end if;

    if v_federationcost > 0 then
        insert into public.billcharge
            (billid, competitionid, paidbypersonid, chargeowner, categorykey, sourcetype, sourceid,
             amounttopay, chargestatus, paymentbatchid, createdat, notes)
        values
            (v_billid, v_new_actual_competitionid, v_paidbypersonid, 'Federation', 'classes', 'Entry', v_new_entryid,
             v_federationcost, 'Open', null, now(), 'Created from admin edit replacement entry federation cost');
    end if;

    -- Compose with the admin-ranch-scoped secured helper (234) rather than
    -- 219 directly: 219 re-derives isranchadmininhostranch scoped to the
    -- competition's HOST ranch internally, which would wrongly reject a
    -- true R<>H admin even though p_ranchid was already validated above.
    -- 234 is 219's exact mutation/validation behavior with only its
    -- authorization block re-derived against p_ranchid -- it flips the new
    -- entry's Open charges to PendingApproval as its own side effect,
    -- identically to 219.
    v_changeentryrequestid := public.usp_insertchangeentryrequestadminranchsecured(
        p_entryid, v_new_entryid, 'Pending', false, null, null, p_personid, p_competitionid, p_ranchid
    );

    if not v_isregistrationended then
        -- Immediately approve, in the same transaction -- no external
        -- reader can ever observe the intermediate Pending row. 221 applies
        -- the old->Replaced / new->Active transition and the Open charge
        -- flip entirely on its own; nothing here is reimplemented.
        perform public.usp_answerchangeentryrequestsecured(
            v_changeentryrequestid, 'Approved', p_personid, p_competitionid, 'Direct admin edit'
        );

        v_resulttype := 'DirectReplaced';
        v_result_entryid := v_new_entryid;
    else
        -- Left genuinely Pending -- no activation, no finalized charges.
        v_resulttype := 'PendingReplaceApproval';
        v_result_entryid := v_new_entryid;
    end if;

    return query select v_resulttype, v_result_entryid, v_changeentryrequestid;
end;
$function$;
