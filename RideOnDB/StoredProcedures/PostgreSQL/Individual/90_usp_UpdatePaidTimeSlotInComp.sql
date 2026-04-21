CREATE OR REPLACE FUNCTION usp_UpdatePaidTimeSlotInComp(
    p_PaidTimeSlotInCompId INTEGER,
    p_PaidTimeSlotId       INTEGER,
    p_ArenaRanchId         INTEGER,
    p_ArenaId              INTEGER,
    p_SlotDate             DATE,
    p_StartTime            TIME,
    p_EndTime              TIME,
    p_SlotStatus           TEXT DEFAULT NULL,
    p_SlotNotes            TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE paidtimeslotincompetition SET
        paidtimeslotid = p_PaidTimeSlotId,
        arenaranchid   = p_ArenaRanchId,
        arenaid        = p_ArenaId,
        slotdate       = p_SlotDate,
        starttime      = p_StartTime,
        endtime        = p_EndTime,
        slotstatus     = p_SlotStatus,
        slotnotes      = p_SlotNotes
    WHERE paidtimeslotincompid = p_PaidTimeSlotInCompId;
END;
$$;
