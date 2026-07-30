-- Competition-wide sibling of 117_usp_GetHealthCertificatesForCompetition
-- (HostSecretary scope).
--
-- STATUS: NOT YET DEPLOYED. This file is AHEAD of live as of 2026-07-30. The
-- live function still drives from horseparticipationincompetition. Deploy this
-- definition manually in Supabase, then re-read pg_get_functiondef and confirm
-- it matches this file before treating live as fixed.
--
-- 117 filters `h.ranchid = p_ranchid`, which is correct for a RanchAdmin and
-- wrong for a HostSecretary: the secretary of the hosting ranch must see every
-- participating horse, including horses belonging to visiting ranches. This
-- function is 117 without that filter, and takes no ranch id at all.
--
-- It carries NO authorization of its own, matching this codebase's convention:
-- HorsesController resolves the read scope (role in ranch + competition exists +
-- competition.hostranchid = ranchid) and only then routes here. It must never be
-- reached on a scope the controller did not authorize.
--
-- Same eight output columns and same order as 117, so HealthCertificateItem maps
-- identically from either function.
--
-- WHY THIS CHANGED
-- ----------------
-- Participation is derived from ACTIVE ENTRIES, never from
-- horseparticipationincompetition (hpc), which holds certificate metadata only.
-- hpc was never a complete registry: only usp_insertentry inserted the bare
-- row, so the historical import and bulk/manual SQL never produced one, and
-- nothing ever deletes a row, so cancelled horses lingered. See the header of
-- 117 for the full rationale and the live evidence.
--
-- The superseded note on this file recorded "competition 7 returns 40 rows here
-- against 16 from 117 for host ranch 11". Both of those were hpc counts and both
-- were wrong. Derived from active entries the same competition returns 36 here
-- and 15 from 117; the four dropped rows are stale hpc rows (two horses whose
-- entries are all cancelled, two with no entry row at all).
--
-- KEY POINTS
-- ----------
--   * entry has NO horseid - it is reached through servicerequest, where
--     entry.entryid = servicerequest.srequestid (1:1 FK, same value).
--   * COALESCE(e.entrystatus,'Active') = 'Active' is a whitelist. It excludes
--     'Cancelled', 'CancelledAfterStart' and 'Replaced'. Do NOT rewrite it as
--     entrystatus <> 'Cancelled', which would readmit the other two.
--   * SELECT DISTINCT is REQUIRED - one row per active entry would otherwise
--     repeat the horse once per class, and duplicate active entries exist in
--     live data.
--   * hpc is LEFT JOINed so a participating horse with no certificate still
--     appears with NULL certificate fields. Missing certificates warn, never
--     block.
--   * A pending cancellation REQUEST is still participation; only the entry's
--     own entrystatus counts.
--   * Completed competitions ('הסתיימה') are NOT filtered.

CREATE OR REPLACE FUNCTION public.usp_gethealthcertificatesforhostedcompetition(p_competitionid integer)
 RETURNS TABLE("HorseId" integer, "HorseName" character varying, "BarnName" character varying, "HcPath" character varying, "HcUploadDate" timestamp with time zone, "HcApprovalStatus" character varying, "HcApprovalDate" date, "HcApproverSystemUserId" integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        h.horseid,
        h.horsename,
        h.barnname,
        hpc.hcpath,
        hpc.hcuploaddate,
        hpc.hcapprovalstatus,
        hpc.hcapprovaldate,
        hpc.hcapproversystemuserid
    FROM public.entry e
    INNER JOIN public.servicerequest sr
        ON sr.srequestid = e.entryid
    INNER JOIN public.classincompetition cic
        ON cic.classincompid = e.classincompid
    INNER JOIN public.horse h
        ON h.horseid = sr.horseid
    LEFT JOIN public.horseparticipationincompetition hpc
        ON hpc.horseid = h.horseid
       AND hpc.competitionid = p_competitionid
    WHERE cic.competitionid = p_competitionid
      AND COALESCE(e.entrystatus, 'Active') = 'Active'
    ORDER BY h.horsename;
END;
$function$
