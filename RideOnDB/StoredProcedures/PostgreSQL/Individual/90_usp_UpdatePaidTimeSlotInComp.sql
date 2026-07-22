CREATE OR REPLACE FUNCTION usp_UpdatePaidTimeSlotInComp(
    p_PaidTimeSlotInCompId INTEGER,
    p_PaidTimeSlotId       INTEGER,
    p_ArenaRanchId         INTEGER,
    p_ArenaId              INTEGER,
    p_SlotDate             DATE,
    p_StartTime            TIME,
    p_EndTime              TIME,
    p_SlotStatus           VARCHAR DEFAULT NULL,
    p_SlotNotes            VARCHAR DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_competitionid INTEGER;
BEGIN
    -- נגזרים את התחרות מהסלוט לצורך נעילת-הייעוץ, כדי לסדר עריכת-סלוט
    -- מול החלת-שיבוץ/אימות-תפוסה. סלוט חסר => חריגה (קודם: עדכון-סרק).
    SELECT competitionid
    INTO v_competitionid
    FROM paidtimeslotincompetition
    WHERE paidtimeslotincompid = p_PaidTimeSlotInCompId;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Paid time slot not found';
    END IF;

    PERFORM pg_advisory_xact_lock(1734, v_competitionid);

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
