-- עריכת notes של בקשת פייד-טיים על-ידי האדמין שיצר אותה.
-- אותם כללי שערים כמו ביטול: לא שולם וגם נותרו >24 שעות וגם לא בוטלה.
DROP FUNCTION IF EXISTS usp_updatepaidtimerequestnotes(INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION usp_UpdatePaidTimeRequestNotes(
    p_PaidTimeRequestId     INTEGER,
    p_OrderedBySystemUserId INTEGER,
    p_Notes                 TEXT
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_ordered_by INTEGER;
    v_paymentid  INTEGER;
    v_status     TEXT;
    v_start_ts   TIMESTAMP WITH TIME ZONE;
    v_hours      NUMERIC;
BEGIN
    SELECT
        sr.orderedbysystemuserid,
        sr.paymentid,
        ptr.status,
        COALESCE(
            ptr.assignedstarttime,
            (req_slot.slotdate + req_slot.starttime)::TIMESTAMP WITH TIME ZONE
        )
    INTO
        v_ordered_by,
        v_paymentid,
        v_status,
        v_start_ts
    FROM paidtimerequest ptr
    INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    INNER JOIN paidtimeslotincompetition req_slot
        ON req_slot.paidtimeslotincompid = ptr.requestedcompslotid
    WHERE ptr.paidtimerequestid = p_PaidTimeRequestId;

    IF v_ordered_by IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    IF v_ordered_by <> p_OrderedBySystemUserId THEN
        RAISE EXCEPTION 'Permission denied: not the request owner';
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Cannot edit a cancelled request';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit a paid request';
    END IF;

    v_hours := EXTRACT(EPOCH FROM (v_start_ts - NOW())) / 3600.0;
    IF v_hours <= 24 THEN
        RAISE EXCEPTION 'Cannot edit less than 24 hours before start time';
    END IF;

    UPDATE paidtimerequest
    SET notes = NULLIF(p_Notes, '')
    WHERE paidtimerequestid = p_PaidTimeRequestId;
END;
$$;
