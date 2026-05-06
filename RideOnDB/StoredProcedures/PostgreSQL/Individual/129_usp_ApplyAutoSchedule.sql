-- מחיל את תוצאות אלגוריתם השיבוץ האוטומטי על טבלת הבקשות,
-- בטרנזקציה אחת. אם פריט אחד נכשל - הכול מתבטל.
--
-- p_Assignments: מערך JSONB. כל פריט:
--   {
--     "paidTimeRequestId": int,
--     "assignedCompSlotId": int|null,
--     "assignedStartTime": "HH:MM:SS"|null,
--     "assignedOrder": int|null,
--     "status": "Assigned"|"Pending"
--   }
--
-- מחזיר את מספר הבקשות שעודכנו.
CREATE OR REPLACE FUNCTION usp_ApplyAutoSchedule(
    p_Assignments JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_item        JSONB;
    v_request_id  INTEGER;
    v_slot_id     INTEGER;
    v_start_time  TIMESTAMP WITH TIME ZONE;
    v_order       INTEGER;
    v_status      TEXT;
    v_count       INTEGER := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_Assignments)
    LOOP
        v_request_id := (v_item->>'paidTimeRequestId')::INTEGER;
        v_slot_id    := NULLIF(v_item->>'assignedCompSlotId', '')::INTEGER;
        v_start_time := NULLIF(v_item->>'assignedStartTime', '')::TIMESTAMP WITH TIME ZONE;
        v_order      := NULLIF(v_item->>'assignedOrder', '')::INTEGER;
        v_status     := COALESCE(v_item->>'status', 'Pending');

        IF v_status NOT IN ('Pending', 'Assigned') THEN
            RAISE EXCEPTION 'Invalid status % for request %', v_status, v_request_id;
        END IF;

        UPDATE paidtimerequest
        SET assignedcompslotid = v_slot_id,
            assignedstarttime  = v_start_time,
            assignedorder      = v_order,
            status             = v_status
        WHERE paidtimerequestid = v_request_id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;
