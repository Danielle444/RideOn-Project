-- 233_usp_GetRequestingRanchIdsForStallBookings.sql
--
-- NEW (Phase 2 support), 2026-08-05. Not a modification of any Phase 1 file.
--
-- Why this is needed: the Phase 2 shavings-creation endpoint
-- (POST /api/ShavingsOrders) must derive and authorize against the
-- referenced stall bookings' requesting ranch BEFORE calling the write SP
-- -- both so the Controller can call UserAccessValidator with the correct
-- ranch, and as an early fail-fast check ("Fail before the write SP call
-- if... shavings stalls resolve to zero or multiple requesting ranches"),
-- with usp_createshavingsorder's own internal check remaining as defense
-- in depth. A repo-wide audit (2026-08-05) confirmed no existing DAL
-- method or stored procedure returns requestingranchid for an arbitrary
-- list of StallBookingIds -- every existing GET proc for stall bookings
-- takes a ranch as an INPUT filter, which is circular for this exact use
-- case (the ranch is what we're trying to determine).
--
-- Minimal by design: one input array, one output row per existing,
-- non-tack stall booking found. Deliberately does not itself enforce
-- "exactly one distinct ranch" or "isfortack = false only as an error" --
-- it is a plain lookup; the Controller does the counting/authorization
-- decision, and usp_createshavingsorder's own internal validation remains
-- the authoritative, defense-in-depth check at write time.

CREATE OR REPLACE FUNCTION public.usp_getrequestingranchidsforstallbookings(p_stallbookingids integer[])
 RETURNS TABLE(stallbookingid integer, requestingranchid integer)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select sb.stallbookingid, sb.requestingranchid
    from public.stallbooking sb
    where sb.stallbookingid = any(p_stallbookingids)
      and sb.isfortack = false;
end;
$function$
