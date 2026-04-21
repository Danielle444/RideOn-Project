CREATE OR REPLACE FUNCTION usp_DeletePaidTimeSlotInComp(
    p_PaidTimeSlotInCompId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    -- Block deletion if any paid time requests reference this slot
    IF EXISTS (
        SELECT 1 FROM paidtimerequest ptr
        WHERE ptr.paidtimeslotincompid = p_PaidTimeSlotInCompId
    ) THEN
        RAISE EXCEPTION 'Cannot delete: There are paid time requests linked to this slot.';
    END IF;

    DELETE FROM paidtimeslotincompetition WHERE paidtimeslotincompid = p_PaidTimeSlotInCompId;
END;
$$;
