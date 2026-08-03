-- ============================================================================
-- usp_insertchangeentryrequest - create a pending entry change/cancellation request
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). This proc does correctly guard against creating a request for an
-- already-Paid entry. KNOWN ISSUE documented in the audit, NOT fixed here:
--   - The proc has no ownership/authorization parameter at all (by design -
--     it is a pure insert). The generic `POST /ChangeEntryRequests` C#
--     controller that calls it has NO authorization check whatsoever -
--     confirmed by direct code read: any authenticated user of any role can
--     create a change/cancellation request (with an auto-applied fine, via
--     the fn_autoapplyfine_changeentryrequest trigger) against any entry
--     system-wide. Its sibling endpoint `POST /ChangeEntryRequests/cancel-by-
--     payer` (-> usp_cancelentrybypayer) does verify ownership correctly,
--     proving this is an oversight, not a design limit. Not fixed here - see
--     Stage 2 proposals in the Stage 1 audit report.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_insertchangeentryrequest(originalentryid_param integer, newentryid_param integer, status_param text, iscancelled_param boolean, fineid_param integer, fineamountsnapshot_param numeric)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    new_id integer;
begin
    if originalentryid_param is null or originalentryid_param <= 0 then
        raise exception 'Invalid original entry id';
    end if;

    if not exists (
        select 1
        from public.entry e
        where e.entryid = originalentryid_param
    ) then
        raise exception 'Original entry not found';
    end if;

    if iscancelled_param = false then
        if newentryid_param is null or newentryid_param <= 0 then
            raise exception 'New entry id is required for entry change request';
        end if;

        if not exists (
            select 1
            from public.entry e
            where e.entryid = newentryid_param
        ) then
            raise exception 'New entry not found';
        end if;
    end if;

    /*
        אסור ליצור בקשת שינוי/ביטול על כניסה שכבר שולמה.
    */
    if exists (
        select 1
        from public.billcharge bc
        where bc.sourcetype = 'Entry'
          and bc.sourceid = originalentryid_param
          and bc.chargestatus = 'Paid'
    ) then
        raise exception 'Cannot create change request for a paid entry';
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
$function$
