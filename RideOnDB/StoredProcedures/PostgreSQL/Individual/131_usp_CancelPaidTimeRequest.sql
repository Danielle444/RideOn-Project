-- ביטול בקשת פייד-טיים על-ידי האדמין שיצר אותה.
-- כללים:
--   1) הבקשה חייבת להיות שייכת ל-p_OrderedBySystemUserId.
--   2) אם הבקשה כבר שולמה (sr.paymentid לא NULL) - חסום.
--   3) ביטול אפשרי בכל זמן (גם בתוך 24 שעות) - חיוב מלא חל עפ"י כללי העסק.
--      האזהרה על חיוב מוצגת ב-UI בלבד.
--   4) על ביטול: סטטוס -> 'Cancelled', שדות שיבוץ מתאפסים כדי לפנות סלוט לרוכב אחר.
DROP FUNCTION IF EXISTS usp_cancelpaidtimerequest(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION usp_CancelPaidTimeRequest(
    p_PaidTimeRequestId     INTEGER,
    p_OrderedBySystemUserId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_ordered_by INTEGER;
    v_paymentid  INTEGER;
    v_status     TEXT;
BEGIN
    SELECT
        sr.orderedbysystemuserid,
        sr.paymentid,
        ptr.status
    INTO
        v_ordered_by,
        v_paymentid,
        v_status
    FROM paidtimerequest ptr
    INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    WHERE ptr.paidtimerequestid = p_PaidTimeRequestId;

    IF v_ordered_by IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    IF v_ordered_by <> p_OrderedBySystemUserId THEN
        RAISE EXCEPTION 'Permission denied: not the request owner';
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Request already cancelled';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot cancel a paid request';
    END IF;

    UPDATE paidtimerequest
    SET status             = 'Cancelled',
        assignedcompslotid = NULL,
        assignedstarttime  = NULL,
        assignedorder      = NULL
    WHERE paidtimerequestid = p_PaidTimeRequestId;
END;
$$;
