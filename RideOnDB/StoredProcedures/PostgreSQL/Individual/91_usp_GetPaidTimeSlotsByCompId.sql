CREATE OR REPLACE FUNCTION usp_GetPaidTimeSlotsByCompId(
    p_CompetitionId INTEGER
)
RETURNS TABLE(
    "PaidTimeSlotInCompId" INTEGER,
    "SlotDate"             DATE,
    "TimeOfDay"            TEXT,
    "StartTime"            TIME,
    "EndTime"              TIME,
    "ArenaRanchId"         INTEGER,
    "ArenaId"              INTEGER,
    "ArenaName"            TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ptc.paidtimeslotincompid,
        ptc.slotdate,
        pt.timeofday,
        ptc.starttime,
        ptc.endtime,
        ptc.arenaranchid,
        ptc.arenaid,
        a.arenaname
    FROM paidtimeslotincompetition ptc
    INNER JOIN paidtimeslot pt ON ptc.paidtimeslotid = pt.paidtimeslotid
    INNER JOIN arena        a  ON ptc.arenaranchid   = a.ranchid AND ptc.arenaid = a.arenaid
    WHERE ptc.competitionid = p_CompetitionId
    ORDER BY ptc.slotdate ASC, ptc.starttime ASC;
END;
$$;
