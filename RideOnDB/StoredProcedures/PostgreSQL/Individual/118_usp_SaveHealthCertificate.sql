CREATE OR REPLACE FUNCTION usp_SaveHealthCertificate(
    p_HorseId       INTEGER,
    p_CompetitionId INTEGER,
    p_HcPath        CHARACTER VARYING,
    p_HcUploadDate  TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.horseparticipationincompetition
        (horseid, competitionid, hcpath, hcuploaddate, hcapprovalstatus)
    VALUES
        (p_HorseId, p_CompetitionId, p_HcPath, p_HcUploadDate, 'Pending')
    ON CONFLICT (horseid, competitionid) DO UPDATE
        SET hcpath           = EXCLUDED.hcpath,
            hcuploaddate     = EXCLUDED.hcuploaddate,
            hcapprovalstatus = 'Pending',
            hcapprovaldate   = NULL,
            hcapproversystemuserid = NULL;
END;
$$;
