-- 225_usp_CreateTackStallBookings.sql
--
-- FIRST-TIME COMMIT of a previously LIVE-ONLY procedure. This proc had no
-- repo file at all before this audit (confirmed by exhaustive grep across
-- RideOnDB/StoredProcedures, 2026-08-05) -- the base body below (everything
-- except the new p_requestingranchid parameter and its passthrough) is
-- captured verbatim from live via pg_get_functiondef on 2026-08-05, per
-- this project's own rule that a proc body must never be guessed from
-- caller comments alone.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- this proc has no ranch logic of its own -- it loops p_quantity times,
-- delegating each iteration to usp_createstallbooking (188) with
-- p_horseid = NULL and p_isfortack = true, so it inherits 188's corrected
-- semantics automatically. The only change here is threading through a new
-- REQUIRED trailing parameter, p_requestingranchid, since a tack booking
-- has no horse to derive a requesting (guest) ranch from -- the caller
-- must supply it explicitly. Unlike 188's own new parameter (which is
-- DEFAULT NULL for backward compatibility with non-tack callers), this one
-- has no default: every call to this proc is a tack-stall creation, and
-- the requesting ranch is mandatory for every one of them. Quantity
-- validation, the loop creating p_quantity independent bookings, the
-- returned createdstallbookingid rows, payer split, and billing behavior
-- are all unchanged. No duplicate-booking protection is added here (out of
-- scope for this fix, matches the current live behavior). The product
-- model is unchanged -- no dedicated tack PriceCatalog/Product row exists;
-- the caller continues to pass the host ranch's regular-stall
-- PriceCatalogId, exactly as today.

-- Adding p_requestingranchid changes the declared parameter-type list, so
-- CREATE OR REPLACE alone would create a NEW 10-arg overload and leave the
-- old 9-arg (pre-fix) function callable and unchanged. Drop the exact old
-- signature first so only the corrected version remains.
DROP FUNCTION IF EXISTS public.usp_createtackstallbookings(integer, integer, integer, text, integer, date, date, integer, jsonb);

CREATE OR REPLACE FUNCTION public.usp_createtackstallbookings(p_competitionid integer, p_orderedbysystemuserid integer, p_pricecatalogid integer, p_notes text, p_ranchid integer, p_startdate date, p_enddate date, p_quantity integer, p_payers jsonb, p_requestingranchid integer)
 RETURNS TABLE(createdstallbookingid integer)
 LANGUAGE plpgsql
AS $function$
declare
    v_counter integer;
begin
    if p_quantity is null or p_quantity <= 0 then
        raise exception 'Quantity must be greater than 0';
    end if;

    if p_startdate is null or p_enddate is null then
        raise exception 'StartDate and EndDate are required';
    end if;

    if p_startdate > p_enddate then
        raise exception 'StartDate cannot be after EndDate';
    end if;

    if p_requestingranchid is null or p_requestingranchid <= 0 then
        raise exception 'RequestingRanchId is required for tack stall booking';
    end if;

    for v_counter in 1..p_quantity loop
        createdstallbookingid :=
            public.usp_createstallbooking(
                p_competitionid,
                p_orderedbysystemuserid,
                p_pricecatalogid,
                p_notes,
                p_ranchid,
                null,
                p_startdate,
                p_enddate,
                true,
                p_payers,
                p_requestingranchid
            );

        return next;
    end loop;
end;
$function$
