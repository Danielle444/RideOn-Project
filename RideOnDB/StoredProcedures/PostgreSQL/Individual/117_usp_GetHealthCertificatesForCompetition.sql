-- Ranch-scoped health-certificate list for a competition (RanchAdmin scope).
--
-- STATUS (2026-07-30): previously verified against live via
-- pg_get_functiondef -- live and this file agreed character for character
-- apart from case/whitespace (normalised md5 b6a3f63666c2ec995e9bb61b38554fff
-- on both sides).
--
-- UPDATED 2026-08-07 (Health Certificate rejection foundation): appends
-- HcRejectionReason, HcRejectionDate, HcRejectedBySystemUserId as three
-- trailing output columns so the later UX can display a rejection reason.
-- This is a RETURN TYPE change (RETURNS TABLE gained three columns), which
-- Postgres does not allow via CREATE OR REPLACE (42P13) -- deployment is
-- DROP FUNCTION + CREATE FUNCTION for this exact overload, in one
-- transaction/migration so the function is never left missing if CREATE
-- fails. New columns are appended LAST, per this project's own convention
-- for return-type changes, so HorseDAL's ReadHealthCertificateItem mapper
-- (which reads by column name) is unaffected in shape, only extended.
--
-- Live dependency audit (2026-08-07, read-only, before DROP): pg_depend,
-- refobjid = this function, refclassid = pg_proc: 0 rows. pg_proc.prosrc
-- ILIKE '%gethealthcertificatesforcompetition%' across all public functions:
-- 0 rows. No view, trigger, other function, rule or extension object depends
-- on this function. Safe to DROP + CREATE.
--
-- FILTERING/SCOPE BEHAVIOR IS UNCHANGED. Every JOIN, WHERE clause, DISTINCT
-- and ORDER BY below is copied verbatim from the previous definition -- only
-- the SELECT list and RETURNS TABLE clause gained three trailing columns.
-- See the prior header (preserved below) for the full participation-model
-- rationale; none of it changed.
--
-- WHY THE PARTICIPATION MODEL LOOKS LIKE THIS (unchanged from 2026-07-30)
-- ------------------------------------------------------------------------
-- Participation is derived from ACTIVE ENTRIES, never from
-- horseparticipationincompetition (hpc). hpc holds only certificate
-- metadata. Only usp_insertentry ever inserted the bare (horseid,
-- competitionid) row, so the historical Python import and any bulk/manual
-- SQL never produced one, and nothing deletes hpc rows either, so the old
-- INNER JOIN under- and over-reported at the same time. Driving from entry
-- fixes both directions and is self-correcting.
--   * entry has NO horseid. Reached only through servicerequest, where
--     entry.entryid = servicerequest.srequestid (1:1 FK, same value).
--   * The active predicate is COALESCE(e.entrystatus,'Active') = 'Active' --
--     a whitelist. Do NOT weaken to entrystatus <> 'Cancelled'.
--   * SELECT DISTINCT is REQUIRED -- a horse holds one entry per class, and
--     duplicate active entries exist in live data.
--   * hpc is LEFT JOINed -- a participating horse with no certificate MUST
--     still appear, with NULL certificate fields.
--   * A pending cancellation REQUEST is still participation.
--   * Completed competitions ('הסתיימה') are NOT filtered.
--
-- Scope note: the h.ranchid = p_ranchid filter is correct for a RanchAdmin
-- and wrong for a HostSecretary, who must also see visiting ranches' horses.
-- The competition-wide sibling is
-- 184_usp_GetHealthCertificatesForHostedCompetition. HorsesController
-- resolves which one runs; this function carries no authorization of its
-- own.

DROP FUNCTION IF EXISTS public.usp_gethealthcertificatesforcompetition(integer, integer);

CREATE FUNCTION public.usp_gethealthcertificatesforcompetition(p_competitionid integer, p_ranchid integer)
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

    WHERE
        cic.competitionid = p_competitionid
        AND COALESCE(e.entrystatus, 'Active') = 'Active'
        AND h.ranchid = p_ranchid

    ORDER BY
        h.horsename;
END;
$function$
