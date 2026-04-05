CREATE OR REPLACE FUNCTION usp_GetAllPaidTimeBaseSlots()
RETURNS TABLE(
    "PaidTimeSlotId" INTEGER,
    "DayOfWeek"      TEXT,
    "TimeOfDay"      TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pts.paidtimeslotid, pts.dayofweek, pts.timeofday FROM paidtimeslot pts;
END;
$$;
