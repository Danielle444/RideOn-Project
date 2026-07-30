-- Ranch-scoped horse list for a competition.
-- Backs HorseDAL.GetHorsesForCompetition -> GET api/Horses/competition-horses.
--
-- STATUS: DEPLOYED. Verified against live on 2026-07-30 via pg_get_functiondef:
-- the live body is entry-derived and does not reference
-- horseparticipationincompetition at all. Live and this file agree character
-- for character apart from case and whitespace (normalised md5
-- 3cdc799ef03e37b743844d3f99c9b5dc on both sides); live spells its keywords in
-- upper case where this file uses lower case.
--
-- THE PREVIOUS REPO COPY OF THIS FILE WAS STALE - in signature, not just body.
-- It declared usp_GetHorsesForCompetition(p_CompetitionId INTEGER) returning
-- three columns (HorseId, HorseName, BarnName). Live has taken TWO parameters
-- (p_competitionid, p_ranchid) and returned FOUR columns for some time, the
-- fourth being FederationNumber, and HorseDAL has been reading all four and
-- passing both parameters all along (RideOnServer/DAL/HorseDAL.cs:108-138).
-- So the app and live DB were already in agreement and only the repo file was
-- behind. Running the old file would NOT have replaced the live function - the
-- differing argument list would have created a second, unused 1-arg overload.
-- The signature below is live's, so CREATE OR REPLACE correctly replaces it.
--
-- WHY THE BODY CHANGED
-- --------------------
-- Participation is derived from ACTIVE ENTRIES, never from
-- horseparticipationincompetition (hpc), which holds certificate metadata only
-- and was never a complete registry - 9,412 of 9,460 active competition/horse
-- pairs had no hpc row on 2026-07-30, because only usp_insertentry ever created
-- one and the historical import bypassed it entirely. This endpoint had the
-- same defect as the health-certificate reads; it originated in the stall-map
-- work (docs/superpowers/plans/2026-04-12-stall-map.md) and inherited hpc as its
-- source. See 117_usp_GetHealthCertificatesForCompetition for the full
-- rationale.
--
-- KEY POINTS
-- ----------
--   * entry has NO horseid - it is reached through servicerequest, where
--     entry.entryid = servicerequest.srequestid (1:1 FK, same value).
--   * coalesce(e.entrystatus,'Active') = 'Active' is a whitelist, excluding
--     'Cancelled', 'CancelledAfterStart' and 'Replaced'. Do NOT rewrite it as
--     entrystatus <> 'Cancelled'. Cancelled-only horses must not appear.
--   * select distinct is REQUIRED - a horse holds one entry per class, and
--     duplicate active entries exist in live data.
--   * This function does NOT touch hpc at all. Certificates are not its concern.
--   * Completed competitions ('הסתיימה') are NOT filtered.
--
-- The four return columns, their names, types and order are unchanged from live,
-- so HorseDAL's reader (which reads "HorseId", "HorseName", "BarnName",
-- "FederationNumber" by name) needs no change.

CREATE OR REPLACE FUNCTION public.usp_gethorsesforcompetition(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE("HorseId" integer, "HorseName" character varying, "BarnName" character varying, "FederationNumber" character varying)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select distinct
        h.horseid,
        h.horsename,
        h.barnname,
        h.federationnumber
    from public.entry e
    inner join public.servicerequest sr
        on sr.srequestid = e.entryid
    inner join public.classincompetition cic
        on cic.classincompid = e.classincompid
    inner join public.horse h
        on h.horseid = sr.horseid
    where cic.competitionid = p_competitionid
      and coalesce(e.entrystatus, 'Active') = 'Active'
      and h.ranchid = p_ranchid
    order by h.horsename;
end;
$function$
