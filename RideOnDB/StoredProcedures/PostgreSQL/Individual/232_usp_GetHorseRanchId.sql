-- 232_usp_GetHorseRanchId.sql
--
-- NEW (Phase 2 support), 2026-08-05. Not a modification of any Phase 1 file.
--
-- Why this is needed: the Phase 2 ASP.NET Core implementation of the
-- ranch-model fix requires the Controller to derive a horse's home ranch
-- SERVER-SIDE (never trust a client-supplied value) before calling
-- UserAccessValidator, for the plain horse-stall creation endpoint
-- (POST /api/StallBookings). A repo-wide audit (2026-08-05) confirmed no
-- existing DAL method or stored procedure returns a single horse's
-- RanchId given only its HorseId -- every existing HorseDAL method
-- (GetHorsesByRanch, GetRealHorsesByRanch, GetHorsesForCompetition) takes
-- a ranch/competition as an input FILTER and returns a list, none accepts
-- a horseid and returns its ranch. Reusing one of those would mean
-- fetching an entire ranch's/competition's horse list just to check one
-- id, which is both wasteful and semantically backwards for an
-- authorization check that must not assume the ranch in advance.
--
-- Minimal by design: single input, single output, no side effects, no
-- authorization logic of its own (this is a plain data lookup -- the
-- Controller performs the actual authorization decision after calling
-- this). Returns NULL if the horse does not exist, letting the caller
-- distinguish "not found" from a real ranch id.

CREATE OR REPLACE FUNCTION public.usp_gethorseranchid(p_horseid integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_ranchid integer;
begin
    select h.ranchid
    into v_ranchid
    from public.horse h
    where h.horseid = p_horseid;

    return v_ranchid;
end;
$function$
