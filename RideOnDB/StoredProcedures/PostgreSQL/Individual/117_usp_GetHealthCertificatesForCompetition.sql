-- Repository copy of the CURRENT LIVE function, captured verbatim from
-- pg_get_functiondef(25192) on 2026-07-30. Not hand-reconstructed.
--
-- The previously tracked version of this file was stale in both directions: it
-- declared a single p_CompetitionId parameter and had no ranch filter at all,
-- while live takes (p_competitionid, p_ranchid) and filters h.ranchid.
--
-- Scope note: the live filter `h.ranchid = p_ranchid` is correct for a RanchAdmin
-- and wrong for a HostSecretary, who must see visiting ranches' horses too. The
-- revised definition for that is NOT in this file and is NOT deployed - see the
-- Stage B1 report. Do not overwrite this file with the proposed future SQL until
-- that SQL has actually been tested and deployed.

CREATE OR REPLACE FUNCTION public.usp_gethealthcertificatesforcompetition(p_competitionid integer, p_ranchid integer)
 RETURNS TABLE("HorseId" integer, "HorseName" character varying, "BarnName" character varying, "HcPath" character varying, "HcUploadDate" timestamp with time zone, "HcApprovalStatus" character varying, "HcApprovalDate" date, "HcApproverSystemUserId" integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY

    SELECT
        h.horseid,
        h.horsename,
        h.barnname,
        hpc.hcpath,
        hpc.hcuploaddate,
        hpc.hcapprovalstatus,
        hpc.hcapprovaldate,
        hpc.hcapproversystemuserid

    FROM public.horseparticipationincompetition hpc

    INNER JOIN public.horse h
        ON h.horseid = hpc.horseid

    WHERE
        hpc.competitionid = p_competitionid
        AND h.ranchid = p_ranchid

    ORDER BY
        h.horsename;
END;
$function$
