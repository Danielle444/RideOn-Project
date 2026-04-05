CREATE OR REPLACE FUNCTION usp_UpdatePaidTimeSlotInComp(
    "CompSlotId"     INTEGER,
    "PaidTimeSlotId" INTEGER,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "SlotDate"       DATE,
    "StartTime"      TIME,
    "EndTime"        TIME,
    "SlotStatus"     TEXT DEFAULT NULL,
    "SlotNotes"      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE paidtimeslotincompetition SET
        paidtimeslotid = "PaidTimeSlotId",
        arenaranchid   = "ArenaRanchId",
        arenaid        = "ArenaId",
        slotdate       = "SlotDate",
        starttime      = "StartTime",
        endtime        = "EndTime",
        slotstatus     = "SlotStatus",
        slotnotes      = "SlotNotes"
    WHERE compslotid = "CompSlotId";
END;
$$;
