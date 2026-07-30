-- Ranch-scoped health-certificate list for a competition (RanchAdmin scope).
--
-- STATUS: NOT YET DEPLOYED. This file is AHEAD of live as of 2026-07-30. The
-- live function still drives from horseparticipationincompetition. Deploy this
-- definition manually in Supabase, then re-read pg_get_functiondef and confirm
-- it matches this file before treating live as fixed.
--
-- WHY THIS CHANGED
-- ----------------
-- Participation is derived from ACTIVE ENTRIES, never from
-- horseparticipationincompetition (hpc). hpc holds only certificate metadata:
-- its non-key columns are exactly hcapprovalstatus, hcapprovaldate, hcpath,
-- hcuploaddate, hcapproversystemuserid.
--
-- hpc was never a complete participation registry. Only usp_insertentry ever
-- inserted the bare (horseid, competitionid) row, so the historical Python
-- import and any bulk/manual SQL never produced one - 9,412 of 9,460 active
-- pairs had no hpc row on 2026-07-30. Nothing deletes hpc rows either, so
-- cancelled horses lingered. The old INNER JOIN therefore under-reported and
-- over-reported at the same time (competition 7 / ranch 11: 16 hpc rows against
-- 15 genuinely active horses).
--
-- Driving from entry fixes both directions and is self-correcting: a horse
-- appears exactly while it holds an active entry, and no backfill is needed.
--
-- KEY POINTS
-- ----------
--   * entry has NO horseid. The horse is reachable only through servicerequest,
--     where entry.entryid = servicerequest.srequestid (1:1 FK, same value).
--   * The active predicate is the codebase's established one,
--     COALESCE(e.entrystatus,'Active') = 'Active' - a whitelist. Do NOT weaken
--     it to entrystatus <> 'Cancelled': that would wrongly readmit the
--     'Replaced' and 'CancelledAfterStart' states.
--   * SELECT DISTINCT is REQUIRED. A horse holds one entry per class, and
--     duplicate active entries exist in live data, so the join multiplies rows.
--     Every selected column is horse-level or hpc-level, and hpc is unique per
--     (horseid, competitionid) via its PK, so DISTINCT collapses cleanly to one
--     row per horse.
--   * hpc is LEFT JOINed. A participating horse with no certificate MUST still
--     appear, with NULL certificate fields - missing certificates warn, never
--     block.
--   * A pending cancellation REQUEST is still participation. Only the entry's
--     own entrystatus counts; changeentryrequest, payment and bill status are
--     deliberately not consulted.
--   * Completed competitions ('הסתיימה') are NOT filtered. Historical
--     competitions return their active-entry-derived list.
--
-- Signature and all eight return columns, names, types and order are unchanged
-- from the previous live definition, so HealthCertificateItem and
-- HorseDAL.GetHealthCertificatesForCompetition need no change.
--
-- Scope note: the h.ranchid = p_ranchid filter is correct for a RanchAdmin and
-- wrong for a HostSecretary, who must also see visiting ranches' horses. The
-- competition-wide sibling is 184_usp_GetHealthCertificatesForHostedCompetition.
-- HorsesController resolves which one runs; this function carries no
-- authorization of its own.

CREATE OR REPLACE FUNCTION public.usp_gethealthcertificatesforcompetition(p_competitionid integer, p_ranchid integer)
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

    WHERE
        cic.competitionid = p_competitionid
        AND COALESCE(e.entrystatus, 'Active') = 'Active'
        AND h.ranchid = p_ranchid

    ORDER BY
        h.horsename;
END;
$function$
