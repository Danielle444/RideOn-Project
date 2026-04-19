CREATE OR REPLACE FUNCTION usp_GetHealthCertificatesForCompetition(
    p_CompetitionId INTEGER
)
RETURNS TABLE(
    "HorseId"                INTEGER,
    "HorseName"              CHARACTER VARYING,
    "BarnName"               CHARACTER VARYING,
    "HcPath"                 CHARACTER VARYING,
    "HcUploadDate"           TIMESTAMP WITH TIME ZONE,
    "HcApprovalStatus"       CHARACTER VARYING,
    "HcApprovalDate"         DATE,
    "HcApproverSystemUserId" INTEGER
)
LANGUAGE plpgsql AS $$
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
    INNER JOIN public.horse h ON h.horseid = hpc.horseid
    WHERE hpc.competitionid = p_CompetitionId
    ORDER BY h.horsename;
END;
$$;
