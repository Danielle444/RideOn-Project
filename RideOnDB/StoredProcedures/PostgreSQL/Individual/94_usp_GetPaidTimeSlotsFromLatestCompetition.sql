CREATE OR REPLACE FUNCTION usp_GetPaidTimeSlotsFromLatestCompetition()
RETURNS TABLE(
    "PaidTimeSlotInCompId" INTEGER,
    "PaidTimeSlotId"       INTEGER,
    "TimeOfDay"            TEXT,
    "ArenaRanchId"         INTEGER,
    "ArenaId"              INTEGER,
    "StartTime"            TIME,
    "EndTime"              TIME,
    "SlotNotes"            TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_latest_comp_id INTEGER;
BEGIN
    SELECT c.competitionid INTO v_latest_comp_id
    FROM competition c
    WHERE EXISTS (
        SELECT 1 FROM paidtimeslotincompetition ptc WHERE ptc.competitionid = c.competitionid
    )
    ORDER BY c.competitionstartdate DESC
    LIMIT 1;

    IF v_latest_comp_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            ptc.paidtimeslotincompid,
            ptc.paidtimeslotid,
            pt.timeofday,
            ptc.arenaranchid,
            ptc.arenaid,
            ptc.starttime,
            ptc.endtime,
            ptc.slotnotes
        FROM paidtimeslotincompetition ptc
        INNER JOIN paidtimeslot pt ON ptc.paidtimeslotid = pt.paidtimeslotid
        WHERE ptc.competitionid = v_latest_comp_id
        ORDER BY ptc.slotdate ASC, ptc.starttime ASC;
    END IF;
END;
$$;
