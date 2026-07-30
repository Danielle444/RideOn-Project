-- Competition-wide sibling of 117_usp_GetHealthCertificatesForCompetition.
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
-- Repository copy of the CURRENT LIVE function, captured verbatim from
-- pg_get_functiondef(26353) on 2026-07-30. Not hand-reconstructed. Created and
-- validated manually in Supabase: competition 7 returns 40 rows here against 16
-- from 117 for host ranch 11.

CREATE OR REPLACE FUNCTION public.usp_gethealthcertificatesforhostedcompetition(p_competitionid integer)
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
    WHERE hpc.competitionid = p_competitionid
    ORDER BY h.horsename;
END;
$function$
