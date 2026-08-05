-- Insert Change Entry Request, Admin-Ranch-Secured (Stage C follow-up): an
-- ADDITIVE sibling of usp_insertchangeentryrequestsecured (219), built for
-- the RanchAdmin direct edit/cancel flow (usp_admineditentry/232,
-- usp_admincancelentry/233) only. 219, 218, 220 and 221 are NOT modified by
-- this file -- every existing caller of those four procs keeps its exact
-- current behavior, unchanged.
--
-- WHY THIS EXISTS: 218's isranchadmininhostranch column, and the
-- managed-payer half of its iswithinmodelcscope column, are both scoped to
-- the entry's competition HOST ranch -- correct and unchanged for 218's
-- original caller (the generic payer/admin ChangeEntryRequestsController
-- flow, which has no separate admin-ranch parameter at all). Stage B
-- already proved that a RanchAdmin's own/represented ranch (p_ranchid)
-- routinely differs from the competition's host ranch (a guest ranch's
-- admin registering their own horse at a competition hosted elsewhere).
-- usp_admineditentry/usp_admincancelentry already re-derive the
-- RanchAdmin-role check locally against p_ranchid for their OWN gate, but
-- both then handed off to 219 for the actual insert -- and 219 re-derives
-- its own host-ranch-scoped authorization internally, rejecting a
-- legitimate R<>H admin. This proc is the fix: the exact same mutation
-- and validation behavior as 219, with ONLY its authorization block
-- re-derived against the caller-supplied ranchid_param instead of the
-- host ranch.
--
-- Every other line below -- new-entry-required guard, entry-not-found,
-- competition-id cross-check, competition-ended guard, new-entry
-- existence/competition/host-ranch/created-by-admin checks, paid-entry
-- guard, the changeentryrequest insert itself (identical column list,
-- identical values, identical shape 221 already expects to answer),
-- the PendingApproval charge flip, and the bill recalculation -- is
-- reused verbatim from 219, not reimplemented, not diverged. No fine,
-- refund or Federation-release logic is introduced here (219 itself has
-- none either -- that all belongs exclusively to 221, called separately
-- by 232/233, unchanged).
CREATE OR REPLACE FUNCTION public.usp_insertchangeentryrequestadminranchsecured(
    originalentryid_param integer,
    newentryid_param integer,
    status_param text,
    iscancelled_param boolean,
    fineid_param integer,
    fineamountsnapshot_param numeric,
    personid_param integer,
    competitionid_param integer,
    ranchid_param integer
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
declare
    new_id integer;
    v_ctx record;
    v_iswithinmodelcscope_for_ranch boolean;
begin
    if originalentryid_param is null or originalentryid_param <= 0 then
        raise exception 'Invalid original entry id' using errcode = 'RN001';
    end if;

    if ranchid_param is null or ranchid_param <= 0 then
        raise exception 'Invalid ranch id' using errcode = 'RN001';
    end if;

    if iscancelled_param = false
       and (newentryid_param is null or newentryid_param <= 0) then
        raise exception 'New entry id is required for entry change request'
            using errcode = 'RN001';
    end if;

    -- Every OTHER field of this context is still consumed exactly as 219
    -- consumes it (entryexists, actualcompetitionid, iscompetitionended,
    -- newentryexists/newentrycompetitionid/newentryhostranchid/
    -- newentrycreatedbyadmin). Only isranchadmininhostranch and the
    -- managed-payer half of iswithinmodelcscope are NOT trusted from here --
    -- both are re-derived below, scoped to ranchid_param.
    select *
    into v_ctx
    from public.usp_getchangeentryrequestauthorizationcontext(
        originalentryid_param,
        newentryid_param,
        competitionid_param,
        personid_param
    );

    if not v_ctx.entryexists then
        raise exception 'Original entry not found' using errcode = 'RN001';
    end if;

    if v_ctx.actualcompetitionid <> competitionid_param then
        raise exception 'Competition id does not match the entry''s actual competition'
            using errcode = 'RN001';
    end if;

    -- RanchAdmin-role check, re-derived against ranchid_param -- same table
    -- joins, same role name, same status filter as 218's own
    -- isranchadmininhostranch, just correctly scoped.
    if not exists (
        select 1
        from public.personranchrole prr
        join public.role r on r.roleid = prr.roleid
        where prr.personid = personid_param
          and prr.ranchid = ranchid_param
          and prr.rolestatus = 'Approved'
          and r.rolename = 'אדמין חווה'
    ) then
        raise exception 'Caller is not an approved ranch admin for this entry''s ranch' using errcode = 'RN001';
    end if;

    -- Model C scope, re-derived against ranchid_param. iscreatedbyadmin is
    -- ranch-agnostic (servicerequest.orderedbysystemuserid = caller) and is
    -- reused as-is from v_ctx unchanged. The managed-payer half is
    -- re-derived locally -- same table joins, same role name, same status
    -- filter as 218's own isownedthroughmanagedpayer, and the exact same
    -- shape already proven live by usp_admincreateentry's (231) payer
    -- authorization predicate -- just correctly scoped to ranchid_param
    -- instead of the host ranch.
    v_iswithinmodelcscope_for_ranch := (
        v_ctx.iscreatedbyadmin
        or exists (
            select 1
            from public.billcharge bc
            join public.personmanagedbysystemuser pmsu on pmsu.personid = bc.paidbypersonid
            join public.personranchrole prr on prr.personid = bc.paidbypersonid
            join public.role r on r.roleid = prr.roleid
            where bc.sourcetype = 'Entry'
              and bc.sourceid = originalentryid_param
              and pmsu.systemuserid = personid_param
              and pmsu.approvalstatus = 'Approved'
              and prr.ranchid = ranchid_param
              and prr.rolestatus = 'Approved'
              and r.rolename = 'משלם'
        )
    );

    if not v_iswithinmodelcscope_for_ranch then
        raise exception 'Caller is not authorized to modify this entry'
            using errcode = 'RN001';
    end if;

    if v_ctx.iscompetitionended then
        raise exception 'Competition has already ended' using errcode = 'RN001';
    end if;

    if iscancelled_param = false then
        if not v_ctx.newentryexists then
            raise exception 'New entry not found' using errcode = 'RN001';
        end if;

        if v_ctx.newentrycompetitionid <> v_ctx.actualcompetitionid then
            raise exception 'New entry does not belong to the same competition as the original entry'
                using errcode = 'RN001';
        end if;

        if v_ctx.newentryhostranchid <> v_ctx.hostranchid then
            raise exception 'New entry does not belong to the same ranch as the original entry'
                using errcode = 'RN001';
        end if;

        if not v_ctx.newentrycreatedbyadmin then
            raise exception 'New entry was not created by the requesting admin'
                using errcode = 'RN001';
        end if;
    end if;

    /*
        אסור ליצור בקשת שינוי/ביטול על כניסה שכבר שולמה.
        (Unchanged condition, reproduced verbatim from 219/213.)
    */
    if exists (
        select 1
        from public.billcharge bc
        where bc.sourcetype = 'Entry'
          and bc.sourceid = originalentryid_param
          and bc.chargestatus = 'Paid'
    ) then
        raise exception 'Cannot create change request for a paid entry'
            using errcode = 'RN001';
    end if;

    insert into public.changeentryrequest
    (
        originalentryid,
        newentryid,
        requestdatetime,
        status,
        iscancelled,
        fineid,
        fineamountsnapshot
    )
    values
    (
        originalentryid_param,
        newentryid_param,
        now(),
        status_param,
        iscancelled_param,
        fineid_param,
        fineamountsnapshot_param
    )
    returning changeentryrequestid
    into new_id;

    /*
        בבקשת שינוי, הכניסה החדשה כבר נוצרה דרך usp_insertentry,
        ולכן יש לה חיובים. אבל הם לא אמורים להיספר עד אישור מזכירה.
        (Unchanged, reproduced verbatim from 219/213.)
    */
    if iscancelled_param = false and newentryid_param is not null then
        update public.billcharge
        set
            chargestatus = 'PendingApproval',
            notes = coalesce(notes, '') || ' | Pending change entry request ' || new_id
        where sourcetype = 'Entry'
          and sourceid = newentryid_param
          and chargestatus = 'Open'
          and paymentbatchid is null;
    end if;

    update public.bill b
    set amounttopay = coalesce(
        (
            select sum(bc.amounttopay)
            from public.billcharge bc
            where bc.billid = b.billid
              and bc.chargestatus in ('Open', 'Paid')
        ),
        0
    )
    where b.billid in (
        select bc.billid
        from public.billcharge bc
        where bc.sourcetype = 'Entry'
          and bc.sourceid in (
              originalentryid_param,
              coalesce(newentryid_param, originalentryid_param)
          )
    );

    return new_id;
end;
$function$;
