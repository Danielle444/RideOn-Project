CREATE OR REPLACE FUNCTION usp_ApproveHealthCertificate(
    p_HorseId                INTEGER,
    p_CompetitionId          INTEGER,
    p_HcApproverSystemUserId INTEGER,
    p_HcApprovalDate         DATE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.horseparticipationincompetition
    SET
        hcapprovalstatus       = 'Approved',
        hcapprovaldate         = p_HcApprovalDate,
        hcapproversystemuserid = p_HcApproverSystemUserId
    WHERE horseid       = p_HorseId
      AND competitionid = p_CompetitionId;
END;
$$;
