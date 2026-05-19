-- מחזיר את הלו"ז המלא של סלוט פייד-טיים אחד (כל הרוכבים, לא רק של האדמין).
-- מיועד לתצוגה ציבורית: אדמין רואה לו"ז של סלוט שפורסם כדי לדעת מתי
-- הרוכבים שלו רוכבים יחד עם רוכבים של חוות אחרות.
-- מחזיר רק בקשות שכבר Assigned. ממויין לפי AssignedOrder/AssignedStartTime.
--
-- אבטחה: ה-API בודק שהמשתמש הוא אדמין באחת החוות, ושהסלוט שייך לתחרות
-- שהוא צופה בה (p_CompetitionId). שדה IsMine מסומן TRUE לבקשות של ראנץ' המבקש.
DROP FUNCTION IF EXISTS usp_getslotscheduleforviewing(INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION usp_GetSlotScheduleForViewing(
    p_PaidTimeSlotInCompId INTEGER,
    p_CompetitionId        INTEGER,
    p_RanchId              INTEGER
)
RETURNS TABLE(
    "PaidTimeRequestId"       INTEGER,
    "HorseId"                 INTEGER,
    "HorseName"               TEXT,
    "BarnName"                TEXT,
    "CoachName"               TEXT,
    "RiderName"               TEXT,
    "ProductName"             TEXT,
    "DurationMinutes"         INTEGER,
    "AssignedStartTime"       TIMESTAMP WITH TIME ZONE,
    "AssignedOrder"           INTEGER,
    "SlotDate"                DATE,
    "SlotStartTime"           TIME,
    "SlotEndTime"             TIME,
    "ArenaName"               TEXT,
    "IsPublished"             BOOLEAN,
    "IsMine"                  BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ptr.paidtimerequestid,
        h.horseid,
        h.horsename::TEXT,
        h.barnname::TEXT,
        CASE
            WHEN coach_p.personid IS NULL THEN NULL
            ELSE (coach_p.firstname || ' ' || coach_p.lastname)::TEXT
        END,
        (rider_p.firstname || ' ' || rider_p.lastname)::TEXT,
        p.productname::TEXT,
        ptp.durationminutes,
        ptr.assignedstarttime,
        ptr.assignedorder,
        slot.slotdate,
        slot.starttime,
        slot.endtime,
        arena.arenaname::TEXT,
        COALESCE(slot.ispublished, FALSE),
        (h.ranchid = p_RanchId) AS is_mine
    FROM paidtimerequest ptr
    INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    INNER JOIN horse h ON h.horseid = sr.horseid
    INNER JOIN federationmember rider_fm
        ON rider_fm.federationmemberid = sr.riderfederationmemberid
    INNER JOIN person rider_p ON rider_p.personid = rider_fm.federationmemberid
    LEFT JOIN federationmember coach_fm
        ON coach_fm.federationmemberid = sr.coachfederationmemberid
    LEFT JOIN person coach_p ON coach_p.personid = coach_fm.federationmemberid
    INNER JOIN pricecatalog pc ON pc.pricecatalogid = ptr.pricecatalogid
    INNER JOIN product p ON p.productid = pc.productid
    INNER JOIN paidtimeproduct ptp ON ptp.productid = pc.productid
    INNER JOIN paidtimeslotincompetition slot
        ON slot.paidtimeslotincompid = ptr.assignedcompslotid
    INNER JOIN arena arena
        ON arena.ranchid = slot.arenaranchid
       AND arena.arenaid = slot.arenaid
    WHERE ptr.assignedcompslotid = p_PaidTimeSlotInCompId
      AND slot.competitionid     = p_CompetitionId
      AND ptr.status             = 'Assigned'
    ORDER BY
        ptr.assignedorder NULLS LAST,
        ptr.assignedstarttime NULLS LAST,
        ptr.paidtimerequestid;
END;
$$;
