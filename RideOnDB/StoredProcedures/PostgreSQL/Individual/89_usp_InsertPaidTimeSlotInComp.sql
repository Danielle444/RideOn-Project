CREATE OR REPLACE FUNCTION usp_InsertPaidTimeSlotInComp(
    p_CompetitionId  INTEGER,
    p_PaidTimeSlotId INTEGER,
    p_ArenaRanchId   INTEGER,
    p_ArenaId        INTEGER,
    p_SlotDate       DATE,
    p_StartTime      TIME,
    p_EndTime        TIME,
    p_SlotStatus     TEXT DEFAULT NULL,
    p_SlotNotes      TEXT DEFAULT NULL
)
RETURNS TABLE("NewPaidTimeSlotInCompId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO paidtimeslotincompetition (
        competitionid, paidtimeslotid, arenaranchid, arenaid,
        slotdate, starttime, endtime, slotstatus, slotnotes
    )
    VALUES (
        p_CompetitionId, p_PaidTimeSlotId, p_ArenaRanchId, p_ArenaId,
        p_SlotDate, p_StartTime, p_EndTime, p_SlotStatus, p_SlotNotes
    )
    RETURNING paidtimeslotincompid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewPaidTimeSlotInCompId";
END;
$$;
