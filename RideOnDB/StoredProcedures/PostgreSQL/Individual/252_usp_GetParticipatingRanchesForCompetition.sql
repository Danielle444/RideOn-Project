-- 252_usp_GetParticipatingRanchesForCompetition.sql
--
-- NEW (HostSecretary cross-ranch service flows, 2026-08-07). Read-only.
--
-- Why: audited that no existing "list every ranch participating in
-- competition X" source exists anywhere in the codebase. The closest
-- precedent, usp_getmobileadminhomecompetitionsforranch (proc 235,
-- 2026-08-06 Bug 5 fix), already proves and documents the correct
-- participation join set -- entries via horse.ranchid (Active only),
-- stall/tack bookings via stallbooking.requestingranchid, paid-time via
-- horse.ranchid -- but only as a single-ranch-in/boolean-out EXISTS check.
-- This proc restructures the SAME join set into a UNION DISTINCT keyed by
-- competition, to answer "list every participating ranch" instead. Its own
-- header explicitly confirms no competitioninvitation-style table exists
-- in the live schema -- this remains the only real source of truth for
-- competition participation.
--
-- Consumers (Slice A, HostSecretary ranch pickers): the shavings
-- add-order-modal ranch dropdown (previously sourced from
-- usp_getcompetitionsummaryshavingsdetails, which only surfaced ranches
-- with an EXISTING shavings order -- unselectable for a guest ranch's
-- first order) and the tack stall-booking "requesting ranch" dropdown
-- (previously sourced from usp_getstallbookingassignmentoverview's
-- existing-bookings breakdown -- same circular gap). Both are replaced by
-- this proc via a new CompetitionsController endpoint.
--
-- Live-verified 2026-08-07 (rollback-only, then applied): competition 78
-- (host ranch 11) returns 22 participating ranches including host ranch 11
-- and guest ranch 17 -- exactly the live example proc 235's own header
-- documents (ranch 17 has active entries, a stall booking, and a paid-time
-- request in competition 78).

CREATE OR REPLACE FUNCTION public.usp_getparticipatingranchesforcompetition(p_competitionid integer)
 RETURNS TABLE(ranchid integer, ranchname text)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    with participating_ranch_ids as (
        select c.hostranchid as ranchid
        from public.competition c
        where c.competitionid = p_competitionid

        union

        select h.ranchid
        from public.classincompetition cic
        inner join public.entry e
            on e.classincompid = cic.classincompid
        inner join public.servicerequest sr
            on sr.srequestid = e.entryid
        inner join public.horse h
            on h.horseid = sr.horseid
        where cic.competitionid = p_competitionid
          and coalesce(e.entrystatus, 'Active') = 'Active'

        union

        select sb.requestingranchid
        from public.productrequest pr
        inner join public.stallbooking sb
            on sb.stallbookingid = pr.prequestid
        where pr.competitionid = p_competitionid

        union

        select h.ranchid
        from public.paidtimeslotincompetition ptsc
        inner join public.paidtimerequest ptr
            on ptr.requestedcompslotid = ptsc.paidtimeslotincompid
        inner join public.servicerequest sr
            on sr.srequestid = ptr.paidtimerequestid
        inner join public.horse h
            on h.horseid = sr.horseid
        where ptsc.competitionid = p_competitionid
    )
    select
        pri.ranchid::integer as ranchid,
        r.ranchname::text as ranchname
    from participating_ranch_ids pri
    inner join public.ranch r
        on r.ranchid = pri.ranchid
    where pri.ranchid is not null
    group by pri.ranchid, r.ranchname
    order by r.ranchname;
end;
$function$
