CREATE OR REPLACE FUNCTION usp_GetPaidTimeSlotInCompById(
    p_PaidTimeSlotInCompId INTEGER
)
RETURNS TABLE(
    "PaidTimeSlotInCompId" INTEGER,
    "CompetitionId"        INTEGER,
    "PaidTimeSlotId"       INTEGER,
    "SlotDate"             DATE,
    "TimeOfDay"            TEXT,
    "StartTime"            TIME,
    "EndTime"              TIME,
    "ArenaRanchId"         INTEGER,
    "ArenaId"              INTEGER,
    "ArenaName"            TEXT,
    "SlotStatus"           TEXT,
    "SlotNotes"            TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        pts.paidtimeslotincompid,
        pts.competitionid,
        pts.paidtimeslotid,
        pts.slotdate,
        pbs.timeofday,
        pts.starttime,
        pts.endtime,
        pts.arenaranchid,
        pts.arenaid,
        a.arenaname,
        pts.slotstatus,
        pts.slotnotes
    FROM paidtimeslotincompetition pts
    LEFT JOIN paidtimeslot pbs ON pts.paidtimeslotid = pbs.paidtimeslotid
    LEFT JOIN arena a ON pts.arenaranchid = a.ranchid AND pts.arenaid = a.arenaid
    WHERE pts.paidtimeslotincompid = p_paidtimeslotincompid;
END;
$$;
