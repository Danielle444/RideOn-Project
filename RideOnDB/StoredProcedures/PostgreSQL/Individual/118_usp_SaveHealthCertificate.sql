-- Health Certificate rejection foundation (2026-08-07): re-upload must clear
-- rejection metadata exactly as it already cleared approval metadata, or a
-- prior rejection reason would incorrectly remain "active" against a freshly
-- re-uploaded, once-again-Pending certificate. Same signature, same
-- RETURNS VOID -- CREATE OR REPLACE is safe, no DROP needed. Depends on
-- migration add_health_certificate_rejection_columns.sql having already run.
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
        SET hcpath                   = EXCLUDED.hcpath,
            hcuploaddate             = EXCLUDED.hcuploaddate,
            hcapprovalstatus         = 'Pending',
            hcapprovaldate           = NULL,
            hcapproversystemuserid   = NULL,
            hcrejectionreason        = NULL,
            hcrejectiondate          = NULL,
            hcrejectedbysystemuserid = NULL;
END;
$$;
