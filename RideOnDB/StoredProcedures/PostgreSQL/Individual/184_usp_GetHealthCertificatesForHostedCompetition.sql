-- Competition-wide sibling of 117_usp_GetHealthCertificatesForCompetition
-- (HostSecretary scope).
--
-- STATUS (2026-07-30): previously verified against live via
-- pg_get_functiondef -- live and this file agreed character for character
-- apart from case/whitespace (normalised md5 f24ee90768d4ca9b8f1e49dabb565c7c
-- on both sides).
--
-- UPDATED 2026-08-07 (Health Certificate rejection foundation): appends
-- HcRejectionReason, HcRejectionDate, HcRejectedBySystemUserId as three
-- trailing output columns, identically to 117 -- see that file's header for
-- the full DROP+CREATE rationale (return-type change, 42P13) and the
-- dependency audit (0 dependents, confirmed 2026-08-07 for this function
-- too: pg_depend and prosrc-ILIKE searches both empty). Same eight original
-- columns, same order, now with the same three trailing additions as 117,
-- so HealthCertificateItem maps identically from either function.
--
-- FILTERING/SCOPE BEHAVIOR IS UNCHANGED. Every JOIN, WHERE clause, DISTINCT
-- and ORDER BY below is copied verbatim from the previous definition -- only
-- the SELECT list and RETURNS TABLE clause gained three trailing columns.
--
-- 117 filters `h.ranchid = p_ranchid`, which is correct for a RanchAdmin and
-- wrong for a HostSecretary: the secretary of the hosting ranch must see
-- every participating horse, including horses belonging to visiting ranches.
-- This function is 117 without that filter, and takes no ranch id at all.
--
-- It carries NO authorization of its own, matching this codebase's
-- convention: HorsesController resolves the read scope (role in ranch +
-- competition exists + competition.hostranchid = ranchid) and only then
-- routes here. It must never be reached on a scope the controller did not
-- authorize.
--
-- See 117's header for the full active-entry participation-model rationale
-- (unchanged): driven from active entries via entry -> servicerequest ->
-- horse, never from horseparticipationincompetition directly, with hpc
-- LEFT JOINed for certificate metadata only, DISTINCT required, and
-- completed competitions not filtered.

DROP FUNCTION IF EXISTS public.usp_gethealthcertificatesforhostedcompetition(integer);

CREATE FUNCTION public.usp_gethealthcertificatesforhostedcompetition(p_competitionid integer)
 RETURNS TABLE(
     "HorseId" integer,
     "HorseName" character varying,
     "BarnName" character varying,
     "HcPath" character varying,
     "HcUploadDate" timestamp with time zone,
     "HcApprovalStatus" character varying,
     "HcApprovalDate" date,
     "HcApproverSystemUserId" integer,
     "HcRejectionReason" text,
     "HcRejectionDate" date,
     "HcRejectedBySystemUserId" integer
 )
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
        hpc.hcapproversystemuserid,
        hpc.hcrejectionreason,
        hpc.hcrejectiondate,
        hpc.hcrejectedbysystemuserid
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
