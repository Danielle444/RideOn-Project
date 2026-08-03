-- ============================================================================
-- usp_insertchangeentryrequestsecured - authorized create of a pending entry
-- change/cancellation request (Stage 1 security hardening, 2026-08-04)
-- ============================================================================
-- NEW FUNCTION, added alongside the existing (unmodified, still deployed)
-- 6-argument public.usp_insertchangeentryrequest (213_usp_InsertChangeEntryRequest.sql).
-- 213 is deliberately left untouched in this slice to avoid an unavoidable
-- deployment break: the old Render server calls it with 6 arguments, and a
-- DROP+CREATE with 8 arguments would break that server for the window
-- between the DB deploy and the code deploy. This function is additive only.
--
-- This function reproduces every line of 213's live-verified mutation
-- behavior verbatim (original/new entry existence, the Paid-entry guard,
-- the changeentryrequest insert, the new entry's Open->PendingApproval
-- billcharge update, and the bill.amounttopay recalculation for both
-- affected bills) and adds, ahead of all of it, the authorization checks
-- approved for POST /api/ChangeEntryRequests:
--
--   1. original entry exists                                   -> 404 (C#)
--   2. supplied competition matches the entry's real competition -> 400 (C#)
--   3. caller is an Approved RanchAdmin in the entry's real host ranch -> 403 (C#)
--   4. caller owns the entry through Model C (creator OR managed payer) -> 403 (C#)
--   5. competition has not ended (Israel business date)          -> 409 (C#)
--   6. (change requests only) new entry exists, belongs to the same
--      competition/ranch as the original entry, and was created by the
--      same caller                                          -> 404/400/403 (C#)
--   7. original entry is not Paid (existing 213 guard, unchanged condition)
--
-- Checks 1-6 are already independently classified and rejected by
-- ChangeEntryRequestsController.Create BEFORE this function is ever called
-- (via usp_getchangeentryrequestauthorizationcontext, 218), using plain
-- booleans, never exception-text parsing. Every guard clause in THIS
-- function is therefore a pure defense-in-depth backstop: under normal
-- operation none of them should ever fire, because the caller already
-- passed the same checks in C#. If one does fire, the world changed between
-- the C# check and this write (a race), so every guard here is tagged with
-- the repository's existing SQLSTATE 'RN001' business-rule convention (see
-- 183_usp_DeleteServiceProduct.sql, 187_usp_RescheduleCompetition.sql) and
-- the controller maps ALL of them uniformly to 409 Conflict - "state
-- changed since your request was validated, try again" - never re-deriving
-- 404/400/403 from a race outcome.
--
-- Calls 218 (usp_getchangeentryrequestauthorizationcontext) internally
-- rather than re-implementing the Model C / role / competition-match SQL a
-- second time - one function, two callers, no duplicated logic anywhere.
--
-- Role check (isranchadmininhostranch) is a genuine SP-level independent
-- re-derivation of the RanchAdmin role, not merely a copy of the C# result -
-- so a bug or omission in UserAccessValidator.EnsureUserHasRoleInRanch at
-- the C# layer alone cannot let an unauthorized write through this function.
--
-- CLEANUP: the old 6-argument public.usp_insertchangeentryrequest (213) will
-- be dropped in a SEPARATE later stage, only after the new server is
-- deployed, the real mobile flow is verified end to end, and a repository-
-- wide plus live dependency check proves it has no remaining callers.
-- ============================================================================

CREATE FUNCTION public.usp_insertchangeentryrequestsecured(
    originalentryid_param    integer,
    newentryid_param         integer,
    status_param             text,
    iscancelled_param        boolean,
    fineid_param             integer,
    fineamountsnapshot_param numeric,
    personid_param           integer,
    competitionid_param      integer
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
declare
    new_id integer;
    v_ctx record;
begin
    if originalentryid_param is null or originalentryid_param <= 0 then
        raise exception 'Invalid original entry id' using errcode = 'RN001';
    end if;

    if iscancelled_param = false
       and (newentryid_param is null or newentryid_param <= 0) then
        raise exception 'New entry id is required for entry change request'
            using errcode = 'RN001';
    end if;

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

    if not v_ctx.isranchadmininhostranch then
        raise exception 'Caller is not an approved ranch admin for this entry''s ranch'
            using errcode = 'RN001';
    end if;

    if not v_ctx.iswithinmodelcscope then
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
        (Unchanged condition, reproduced verbatim from 213.)
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
        (Unchanged, reproduced verbatim from 213.)
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
