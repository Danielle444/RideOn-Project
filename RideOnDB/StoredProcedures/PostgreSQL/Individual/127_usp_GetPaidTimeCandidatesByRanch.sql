-- מחזיר את כל ההרשמות (entries) למקצים בתחרות עבור סוסים של החווה הזו.
-- כל שורה = (סוס, מאמן, רוכב, משלם) שמופיעים יחד ב-entry של מקצה כלשהו.
-- זהו ה"מועמדים" שמהם הצ'אטבוט ירכיב בקשות פייד-טיים, כי
-- usp_InsertPaidTimeRequest דורש שהסוס יהיה רשום ל-entry של אותה תחרות.
--
-- הסוס מסונן לפי horse.ranchid = p_RanchId.
-- עשוי להחזיר את אותו סוס/מאמן ביותר משורה אחת אם הסוס רשום
-- לכמה מקצים. הצרכן (המובייל) מצפה לבצע distinct לפי הצורך.
CREATE OR REPLACE FUNCTION usp_GetPaidTimeCandidatesByRanch(
    p_CompetitionId INTEGER,
    p_RanchId       INTEGER
)
RETURNS TABLE(
    "EntryId"                  INTEGER,
    "ClassInCompId"            INTEGER,
    "HorseId"                  INTEGER,
    "HorseName"                TEXT,
    "BarnName"                 TEXT,
    "CoachFederationMemberId"  INTEGER,
    "CoachName"                TEXT,
    "RiderFederationMemberId"  INTEGER,
    "RiderName"                TEXT,
    "PaidByPersonId"           INTEGER,
    "PayerName"                TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.entryid,
        e.classincompid,
        h.horseid,
        h.horsename::TEXT,
        h.barnname::TEXT,
        sr.coachfederationmemberid,
        (coach_p.firstname || ' ' || coach_p.lastname)::TEXT,
        sr.riderfederationmemberid,
        (rider_p.firstname || ' ' || rider_p.lastname)::TEXT,
        b.paidbypersonid,
        (payer_p.firstname || ' ' || payer_p.lastname)::TEXT
    FROM entry e
    INNER JOIN servicerequest sr
        ON sr.srequestid = e.entryid
    INNER JOIN classincompetition cic
        ON cic.classincompid = e.classincompid
    INNER JOIN horse h
        ON h.horseid = sr.horseid
    INNER JOIN federationmember rider_fm
        ON rider_fm.federationmemberid = sr.riderfederationmemberid
    INNER JOIN person rider_p
        ON rider_p.personid = rider_fm.federationmemberid
    LEFT JOIN federationmember coach_fm
        ON coach_fm.federationmemberid = sr.coachfederationmemberid
    LEFT JOIN person coach_p
        ON coach_p.personid = coach_fm.federationmemberid
    INNER JOIN bill b
        ON b.billid = sr.billid
    INNER JOIN person payer_p
        ON payer_p.personid = b.paidbypersonid
    WHERE cic.competitionid = p_CompetitionId
      AND h.ranchid = p_RanchId
      AND sr.coachfederationmemberid IS NOT NULL
    ORDER BY
        sr.coachfederationmemberid,
        h.horsename;
END;
$$;
