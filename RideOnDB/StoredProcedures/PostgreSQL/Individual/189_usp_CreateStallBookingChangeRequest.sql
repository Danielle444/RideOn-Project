-- 189_usp_CreateStallBookingChangeRequest.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. Body below is
-- captured verbatim from live via pg_get_functiondef on 2026-08-02 (part of
-- the feature/competition-reschedule review-gate stall-concurrency audit) --
-- not hand-reconstructed. Only ONE change on top of the verbatim capture:
-- the horse-scoped advisory lock block below, marked "ADDED" inline.
--
-- Why: this procedure INSERTs the new, changed-date stallbooking row at
-- request time (not at approval time -- usp_answerproductchangerequest,
-- also live-only, only reads the already-inserted row for pricing and never
-- writes stallbooking.startdate/enddate/horseid, confirmed by reading its
-- live body on 2026-08-02). So this is one of the five confirmed writers of
-- stallbooking.startdate/enddate/horseid that must share the same
-- pg_advisory_xact_lock(1735, horseid) convention as
-- 187_usp_RescheduleCompetition.sql, 188_usp_CreateStallBooking.sql,
-- 147_usp_SecretaryUpdateStallBooking.sql, and
-- 149_usp_SecretaryCreateStallBookingForPayer.sql. See 187's header for the
-- full audit. This procedure's own overlap predicate below (the EXISTS
-- query with the daterange overlap) is also the exact predicate family
-- ported into 147_usp_SecretaryUpdateStallBooking.sql; no business logic in
-- THIS file changed beyond the lock and the global-overlap scoping below.
--
-- REVIEW-GATE CORRECTION (2026-08-03, owner decision): the overlap check was
-- previously scoped to a same-competition-only `pr.competitionid = ...`
-- filter, which let the same horse hold overlapping bookings across two
-- DIFFERENT competitions -- a state
-- usp_reschedulecompetition (187) would then refuse to move, since 187's own
-- overlap rule was always cross-competition. A horse cannot physically
-- occupy two stalls at once regardless of which competition either booking
-- belongs to, so the competition-id restriction is removed here; the check
-- is now GLOBAL by horseid across all competitions. See 187's header for the
-- full cross-competition consistency note.
--
-- STATUS AS WRITTEN (superseded, see below): the "NOT DEPLOYED" claim was
-- live-verified WRONG on 2026-08-05 -- a direct pg_get_functiondef read
-- confirmed this file's base body (including the advisory lock) was
-- already deployed, matching the same pattern found for 188.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture-fix
-- extension): p_ranchid in this flow represents the actor/requesting
-- ranch, not the service/host ranch -- confirmed via the full Controller/
-- DAL/client trace (mobile sends activeRole.ranchId, Controller authorizes
-- RanchAdmin-or-HostSecretary against it, matching the plain create path's
-- pre-fix pattern). Both ownership/lookup predicates changed from
-- `sb.ranchid = p_ranchid` to `sb.requestingranchid = p_ranchid` (see
-- migrations/add_stallbooking_requestingranchid.sql) -- without this, a
-- guest-ranch admin's own booking (sb.ranchid now = host ranch) would
-- become unfindable by this proc the moment 188/149 deploy, breaking
-- edit/cancel for the exact guest-ranch case the whole fix exists to
-- enable. Additionally, the replacement-row INSERT below now carries
-- `requestingranchid` forward from the original booking
-- (v_original_stall_booking.requestingranchid) -- without this, approving
-- any change request would violate the new NOT NULL constraint the moment
-- it's enforced. `stallbooking.ranchid` continues to be copied unchanged
-- (still the service/host ranch). No other logic changed: request
-- creation, authorization assumptions, status/'Pending' logic, return
-- value, the paid-charge guard, the pending-request guard, the advisory
-- lock, the overlap check, and all billing/notification behavior are
-- byte-for-byte unchanged.

CREATE OR REPLACE FUNCTION public.usp_createstallbookingchangerequest(p_originalstallbookingid integer, p_ranchid integer, p_orderedbysystemuserid integer, p_newstartdate date, p_newenddate date, p_notes text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_original_product_request public.productrequest%rowtype;
    v_original_stall_booking public.stallbooking%rowtype;
    v_new_prequest_id integer;
    v_change_request_id integer;
    v_is_paid boolean;
begin
    if p_originalstallbookingid is null or p_originalstallbookingid <= 0 then
        raise exception 'Invalid original stall booking id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_orderedbysystemuserid is null or p_orderedbysystemuserid <= 0 then
        raise exception 'Invalid ordered by system user id';
    end if;

    if p_newstartdate is null or p_newenddate is null then
        raise exception 'StartDate and EndDate are required';
    end if;

    if p_newstartdate > p_newenddate then
        raise exception 'StartDate cannot be after EndDate';
    end if;

    select pr.*
    into v_original_product_request
    from public.productrequest pr
    inner join public.stallbooking sb
        on sb.stallbookingid = pr.prequestid
    where pr.prequestid = p_originalstallbookingid
      and sb.requestingranchid = p_ranchid;

    if not found then
        raise exception 'Original stall booking was not found for this ranch';
    end if;

    select sb.*
    into v_original_stall_booking
    from public.stallbooking sb
    where sb.stallbookingid = p_originalstallbookingid
      and sb.requestingranchid = p_ranchid;

    if not found then
        raise exception 'Original stall booking was not found';
    end if;

    /*
        מקור האמת החדש לתשלום הוא billcharge.
        אם המוצר כבר שולם — אסור לבקש שינוי.
    */
    select exists (
        select 1
        from public.billcharge bc
        where bc.sourcetype = 'ProductRequest'
          and bc.sourceid = p_originalstallbookingid
          and bc.chargestatus = 'Paid'
    )
    into v_is_paid;

    if v_is_paid = true then
        raise exception 'Cannot edit a paid stall booking';
    end if;

    if exists (
        select 1
        from public.productchangerequest pcr
        where pcr.originalprequestid = p_originalstallbookingid
          and coalesce(pcr.status, '') = 'Pending'
    ) then
        raise exception 'A pending change request already exists for this stall booking';
    end if;

    if v_original_stall_booking.isfortack = false
       and v_original_stall_booking.horseid is not null then

        -- ADDED (review-gate stall-concurrency fix, 2026-08-02): lock this
        -- horse before checking or inserting the changed-date booking, so a
        -- concurrent competition reschedule (or any other writer) cannot
        -- commit a conflicting change between this check and this INSERT.
        perform pg_advisory_xact_lock(1735, v_original_stall_booking.horseid);

        if exists (
            select 1
            from public.stallbooking sb
            inner join public.productrequest pr
                on pr.prequestid = sb.stallbookingid
            where sb.horseid = v_original_stall_booking.horseid
              and sb.isfortack = false
              and sb.stallbookingid <> p_originalstallbookingid
              and daterange(sb.startdate, sb.enddate, '[]')
                    && daterange(p_newstartdate, p_newenddate, '[]')
              and not exists (
                  select 1
                  from public.productchangerequest pcr
                  where pcr.originalprequestid = sb.stallbookingid
                    and pcr.iscancelled = true
                    and pcr.status = 'Approved'
              )
        ) then
            raise exception 'An active overlapping stall booking already exists for this horse';
        end if;
    end if;

    insert into public.productrequest
    (
        competitionid,
        prequestdatetime,
        orderedbysystemuserid,
        pricecatalogid,
        notes,
        approvaldate
    )
    values
    (
        v_original_product_request.competitionid,
        now(),
        p_orderedbysystemuserid,
        v_original_product_request.pricecatalogid,
        p_notes,
        null
    )
    returning prequestid
    into v_new_prequest_id;

    insert into public.stallbooking
    (
        stallbookingid,
        ranchid,
        compoundid,
        stallid,
        startdate,
        enddate,
        horseid,
        isfortack,
        requestingranchid
    )
    values
    (
        v_new_prequest_id,
        v_original_stall_booking.ranchid,
        v_original_stall_booking.compoundid,
        v_original_stall_booking.stallid,
        p_newstartdate,
        p_newenddate,
        v_original_stall_booking.horseid,
        v_original_stall_booking.isfortack,
        v_original_stall_booking.requestingranchid
    );

    insert into public.productchangerequest
    (
        originalprequestid,
        newprequestid,
        answeredbysystemuserid,
        status,
        requestdate,
        iscancelled
    )
    values
    (
        p_originalstallbookingid,
        v_new_prequest_id,
        null,
        'Pending',
        now(),
        false
    )
    returning productchangerequestid
    into v_change_request_id;

    return v_change_request_id;
end;
$function$;
