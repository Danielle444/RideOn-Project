-- 231_usp_CreateStallBookingCancelRequest.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. No repo file
-- existed for this proc before this audit (confirmed by exhaustive glob
-- across RideOnDB/StoredProcedures, 2026-08-05). Body captured verbatim
-- from live via pg_get_functiondef on 2026-08-05, per this project's own
-- rule that a proc body must never be guessed from behavior or comments
-- alone. Number chosen as the next unused sequential id -- 230 was the
-- highest existing file at the time of writing (confirmed via directory
-- listing), so this is 231.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture-fix
-- extension): p_ranchid in this flow represents the actor/requesting
-- ranch, not the service/host ranch -- confirmed via the same Controller/
-- DAL/client trace as its sibling
-- 189_usp_CreateStallBookingChangeRequest.sql (identical DTO shape,
-- identical Controller authorization pattern, mobile sends
-- activeRole.ranchId). The ownership/lookup predicate changed from
-- `sb.ranchid = p_ranchid` to `sb.requestingranchid = p_ranchid` (see
-- migrations/add_stallbooking_requestingranchid.sql) -- without this, a
-- guest-ranch admin's own booking (sb.ranchid now = host ranch) would
-- become unfindable by this proc the moment 188/149 deploy. This proc
-- does not write to stallbooking at all (only productchangerequest), so
-- there is no requestingranchid-on-INSERT concern here, unlike 189. No
-- other logic changed: signature, return type, the paid-charge guard, the
-- pending-request guard, and all side effects are unchanged.

CREATE OR REPLACE FUNCTION public.usp_createstallbookingcancelrequest(p_stallbookingid integer, p_ranchid integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_request_id integer;
    v_is_paid boolean;
begin
    if p_stallbookingid is null or p_stallbookingid <= 0 then
        raise exception 'Invalid stall booking id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if not exists (
        select 1
        from public.stallbooking sb
        inner join public.productrequest pr
            on pr.prequestid = sb.stallbookingid
        where sb.stallbookingid = p_stallbookingid
          and sb.requestingranchid = p_ranchid
    ) then
        raise exception 'Stall booking was not found for this ranch';
    end if;

    /*
        מקור האמת החדש לתשלום הוא billcharge.
        אם יש חיוב Paid על המוצר המקורי — אסור לבקש ביטול.
    */
    select exists (
        select 1
        from public.billcharge bc
        where bc.sourcetype = 'ProductRequest'
          and bc.sourceid = p_stallbookingid
          and bc.chargestatus = 'Paid'
    )
    into v_is_paid;

    if v_is_paid = true then
        raise exception 'Cannot cancel a paid stall booking';
    end if;

    if exists (
        select 1
        from public.productchangerequest pcr
        where pcr.originalprequestid = p_stallbookingid
          and coalesce(pcr.status, '') = 'Pending'
    ) then
        raise exception 'A pending change request already exists for this stall booking';
    end if;

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
        p_stallbookingid,
        null,
        null,
        'Pending',
        now(),
        true
    )
    returning productchangerequestid
    into v_request_id;

    return v_request_id;
end;
$function$
