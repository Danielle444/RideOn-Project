-- 253_usp_GetHorsesForStallBookingByCompetition.sql
--
-- NEW (HostSecretary cross-ranch service flows, 2026-08-07). Read-only.
--
-- Why: the live usp_gethorsesforstallbooking(p_competitionid, p_ranchid)
-- hard-filters "h.ranchid = p_ranchId" (confirmed live 2026-08-07), and the
-- web Secretary create/update stall-booking modals always call it with the
-- acting secretary's own ranch -- so a HostSecretary could never see, and
-- therefore never select, a horse belonging to a guest/participating
-- ranch. This is an ADDITIVE sibling proc for the HostSecretary web flow
-- only. usp_gethorsesforstallbooking itself is left untouched: it is
-- shared with the mobile RanchAdmin self-service create flow
-- (useAdminCompetitionStallBookings.js), which must keep seeing only its
-- own ranch's horses -- widening that shared proc would silently change
-- unrelated mobile behavior.
--
-- Same base joins as usp_gethorsesforstallbooking (horse -> servicerequest
-- -> entry -> classincompetition, competition-scoped, no entrystatus
-- filter -- faithfully preserving that proc's existing behavior rather
-- than introducing new semantics), but WITHOUT the ranch filter, plus
-- ranchid/ranchname per horse so the UI can label which ranch each horse
-- belongs to when horses from multiple ranches are listed together.
--
-- The write path this feeds (149_usp_SecretaryCreateStallBookingForPayer /
-- 147_usp_SecretaryUpdateStallBooking) already re-derives
-- stallbooking.requestingranchid from the selected horse's OWN live
-- horse.ranchid server-side -- confirmed unchanged by this proc, which is
-- read-only and does not touch either write path.
--
-- Live-verified 2026-08-07 (rollback-only, then applied): competition 78
-- returns 102 horses across 22 ranches, vs. 21 horses for ranch 11 alone
-- under the old ranch-filtered proc -- confirms the fix changes behavior
-- and is consistent with 252_usp_GetParticipatingRanchesForCompetition's
-- 22-ranch result for the same competition.

CREATE OR REPLACE FUNCTION public.usp_gethorsesforstallbookingbycompetition(p_competitionid integer)
 RETURNS TABLE(horseid integer, horsename character varying, barnname character varying, federationnumber character varying, ranchid integer, ranchname text)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select distinct
        h.horseid,
        h.horsename,
        h.barnname,
        h.federationnumber,
        h.ranchid,
        r.ranchname::text
    from public.horse h
    inner join public.servicerequest sr
        on sr.horseid = h.horseid
    inner join public.entry e
        on e.entryid = sr.srequestid
    inner join public.classincompetition cic
        on cic.classincompid = e.classincompid
    inner join public.ranch r
        on r.ranchid = h.ranchid
    where cic.competitionid = p_competitionid
    order by h.horsename;
end;
$function$
