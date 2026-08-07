-- Admin Cancel Entry (Stage C): direct RanchAdmin cancellation, regardless
-- of whether registration has ended. Composes
-- usp_insertchangeentryrequestadminranchsecured (234, Pending,
-- iscancelled=true) followed immediately, in the same transaction, by
-- usp_answerchangeentryrequestsecured (221, answerstatus='Approved') --
-- exactly the same composition pattern usp_admineditentry (232) uses for its
-- own direct branches. No new fine/refund/federation-release logic is
-- introduced here; every one of those rules is 221's own, reused verbatim,
-- not reimplemented. This proc does not touch 218, 219, 220 or 221.
--
-- 234 (repo file 234_usp_InsertChangeEntryRequestAdminRanchSecured.sql) is a
-- NEW, ADDITIVE sibling of 219 -- not a modification of it. 219's own
-- internal isranchadmininhostranch re-derivation is scoped to the entry's
-- competition HOST ranch (correct for 219's existing caller), which would
-- wrongly reject a RanchAdmin whose own ranch (p_ranchid, already proven by
-- Stage B to routinely differ from the host ranch) is the correct scope for
-- this flow. 234 is 219's exact mutation/validation behavior with only that
-- authorization block re-derived against p_ranchid -- same table joins/role
-- name/status filter as 218's own, correctly scoped. Same fix as
-- usp_admineditentry (232).
--
-- "No pending cancellation request for an authorized admin" holds as an
-- OBSERVABLE guarantee: the changeentryrequest row is created Pending and
-- flipped to Approved before this transaction ever commits, so no external
-- reader can ever see it in the Pending state.
--
-- Financial history is preserved (the changeentryrequest audit row and any
-- fine row 221 inserts are never deleted) and the entry itself is never
-- physically deleted -- only entrystatus transitions, exactly matching 221's
-- own existing cancellation branch (Rule1 before competition start vs Rule2
-- after, fine lookup, Federation credit release, charge cancellation, bill
-- recalculation).
--
-- Idempotency: no operationId/claim-table mechanism is introduced (matching
-- 232's decision). "No duplicate charges or refunds on retry" is satisfied
-- by an explicit pre-check that the entry is not already Cancelled or
-- CancelledAfterStart, the same guard convention already used by
-- usp_secretarydeleteentry (145) and usp_cancelentrybypayer (139) -- a retry
-- never reaches 234/221 a second time, so no double fine/charge/federation
-- mutation can occur.
--
-- Competition-ended is intentionally NOT re-checked here beyond what 234
-- already enforces (reused verbatim from 219): 234 unconditionally blocks
-- once the competition itself has ended (inherited, unchanged behavior),
-- while the locked design's
-- "direct regardless of registration-ended state" applies specifically to
-- registration having ended, not the competition itself having ended.
CREATE OR REPLACE FUNCTION public.usp_admincancelentry(
    p_personid integer,
    p_entryid integer,
    p_competitionid integer,
    p_ranchid integer
)
RETURNS TABLE(
    changeentryrequestid integer,
    entrystatus text
)
LANGUAGE plpgsql
AS $function$
declare
    v_ctx record;
    v_current_entrystatus text;
    v_changeentryrequestid integer;
    v_finalstatus text;
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

    -- Same correction as usp_admineditentry (232): isranchadmininhostranch
    -- is scoped to the competition HOST ranch (218's own correct design for
    -- its existing caller), not the admin's own ranch p_ranchid -- which
    -- Stage B already proved routinely differs from the host ranch. Only
    -- entryexists/actualcompetitionid/iswithinmodelcscope are consumed from
    -- v_ctx; the RanchAdmin-role check is re-derived locally against
    -- p_ranchid, same table joins/role name/status filter as 218's own.
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

    select coalesce(e.entrystatus, 'Active')
    into v_current_entrystatus
    from public.entry e
    where e.entryid = p_entryid;

    -- Retry-safety guard, same convention as 145/139: an already-cancelled
    -- or already-superseded entry rejects cleanly, so a retry never reaches
    -- 219/221 a second time and can never double-cancel a charge or
    -- double-release a Federation allocation. 'Replaced' added to match
    -- usp_admineditentry's (232) complete terminal-state list -- a Replaced
    -- entry was already superseded by an edit and must reject here exactly
    -- like Cancelled/CancelledAfterStart, not fall through to a live
    -- cancellation of a row nobody sees as active anymore.
    if v_current_entrystatus in ('Cancelled', 'CancelledAfterStart', 'Replaced') then
        raise exception 'Entry already cancelled' using errcode = 'RN001';
    end if;

    if exists (
        select 1 from public.changeentryrequest cer
        where cer.originalentryid = p_entryid and cer.status = 'Pending'
    ) then
        raise exception 'A pending change request already exists for this entry' using errcode = 'RN001';
    end if;

    -- Same composition correction as usp_admineditentry (232): 234 is 219's
    -- exact mutation/validation behavior with only its authorization block
    -- re-derived against p_ranchid, so a true R<>H admin is no longer
    -- wrongly rejected by 219's own host-ranch-scoped internal check.
    v_changeentryrequestid := public.usp_insertchangeentryrequestadminranchsecured(
        p_entryid, null, 'Pending', true, null, null, p_personid, p_competitionid, p_ranchid
    );

    perform public.usp_answerchangeentryrequestsecured(
        v_changeentryrequestid, 'Approved', p_personid, p_competitionid, 'Direct admin cancellation'
    );

    select e.entrystatus
    into v_finalstatus
    from public.entry e
    where e.entryid = p_entryid;

    return query select v_changeentryrequestid, v_finalstatus;
end;
$function$;
