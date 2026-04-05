CREATE OR REPLACE FUNCTION usp_InsertPaidTimeSlotInComp(
    "CompetitionId"   INTEGER,
    "PaidTimeSlotId"  INTEGER,
    "ArenaRanchId"    INTEGER,
    "ArenaId"         SMALLINT,
    "SlotDate"        DATE,
    "StartTime"       TIME,
    "EndTime"         TIME,
    "SlotStatus"      TEXT DEFAULT NULL,
    "SlotNotes"       TEXT DEFAULT NULL
)
RETURNS TABLE("NewCompSlotId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO paidtimeslotincompetition (
        competitionid, paidtimeslotid, arenaranchid, arenaid,
        slotdate, starttime, endtime, slotstatus, slotnotes
    )
    VALUES (
        "CompetitionId", "PaidTimeSlotId", "ArenaRanchId", "ArenaId",
        "SlotDate", "StartTime", "EndTime", "SlotStatus", "SlotNotes"
    )
    RETURNING compslotid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewCompSlotId";
END;
$$;
