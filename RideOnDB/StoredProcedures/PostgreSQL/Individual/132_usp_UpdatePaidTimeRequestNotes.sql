-- עריכת בקשת פייד-טיים על-ידי האדמין שיצר אותה.
-- כללי גישה (גזורים בתוך הפונקציה):
--   1) הבקשה חייבת להיות שייכת ל-p_OrderedBySystemUserId.
--   2) שולמה (sr.paymentid לא NULL) -> כל העריכות שכאן חסומות.
--      (החלפת סוס לאחר תשלום מטופלת ב-USP נפרד עתידי - לא במסך זה כרגע.)
--   3) בוטלה (status='Cancelled') -> חסום הכל.
--   4) נותרו <= 24h עד תחילת הפייד-טיים -> שינוי PriceCatalogId חסום
--      (לא ניתן לשנות סוג פייד-טיים בטווח 24h - משפיע על מחיר).
--   5) כל פרמטר אופציונלי NULL = "אל תשנה". מחרוזת ריקה ב-p_Notes = "נקה".
--      הסיגנל לעריכת notes: לא NULL (כלומר באופן מפורש - גם '' לניקוי).
--   6) שינוי PriceCatalogId מעדכן גם את bill.amounttopay (דלתא בין מחירים).
--   7) שינוי RequestedCompSlotId חייב להיות סלוט מאותה תחרות.
DROP FUNCTION IF EXISTS usp_updatepaidtimerequestnotes(INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS usp_updatepaidtimerequest(INTEGER, INTEGER, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION usp_UpdatePaidTimeRequest(
    p_PaidTimeRequestId     INTEGER,
    p_OrderedBySystemUserId INTEGER,
    p_Notes                 TEXT,     -- NULL = no change, '' = clear
    p_PriceCatalogId        INTEGER,  -- NULL = no change
    p_RequestedCompSlotId   INTEGER   -- NULL = no change
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_ordered_by         INTEGER;
    v_paymentid          INTEGER;
    v_status             TEXT;
    v_billid             INTEGER;
    v_current_pcid       INTEGER;
    v_current_slotid     INTEGER;
    v_start_ts           TIMESTAMP WITH TIME ZONE;
    v_hours              NUMERIC;
    v_old_price          NUMERIC;
    v_new_price          NUMERIC;
    v_catalog_ranchid    INTEGER;
    v_current_competition INTEGER;
    v_new_slot_competition INTEGER;
    v_notes_provided     BOOLEAN := (p_Notes IS NOT NULL);
BEGIN
    SELECT
        sr.orderedbysystemuserid,
        sr.paymentid,
        ptr.status,
        sr.billid,
        ptr.pricecatalogid,
        ptr.requestedcompslotid,
        COALESCE(
            ptr.assignedstarttime,
            (req_slot.slotdate + req_slot.starttime)::TIMESTAMP WITH TIME ZONE
        ),
        req_slot.competitionid
    INTO
        v_ordered_by,
        v_paymentid,
        v_status,
        v_billid,
        v_current_pcid,
        v_current_slotid,
        v_start_ts,
        v_current_competition
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
        RAISE EXCEPTION 'Cannot edit a paid request via this endpoint';
    END IF;

    -- נעילת-ייעוץ ברמת התחרות (מזהה-התחרות קבוע, נקרא לעיל לפני הנעילה).
    PERFORM pg_advisory_xact_lock(1734, v_current_competition);

    v_hours := EXTRACT(EPOCH FROM (v_start_ts - NOW())) / 3600.0;

    -- שינוי סוג פייד-טיים (מחיר) - רק >24h.
    IF p_PriceCatalogId IS NOT NULL AND p_PriceCatalogId <> v_current_pcid THEN
        IF v_hours <= 24 THEN
            RAISE EXCEPTION 'Cannot change price catalog within 24 hours of start time';
        END IF;

        SELECT pc.itemprice, pc.ranchid
        INTO v_new_price, v_catalog_ranchid
        FROM pricecatalog pc
        WHERE pc.pricecatalogid = p_PriceCatalogId
          AND pc.isactive = TRUE;

        IF v_new_price IS NULL THEN
            RAISE EXCEPTION 'New price catalog item not found or inactive';
        END IF;

        SELECT pc.itemprice
        INTO v_old_price
        FROM pricecatalog pc
        WHERE pc.pricecatalogid = v_current_pcid;

        UPDATE paidtimerequest
        SET pricecatalogid = p_PriceCatalogId
        WHERE paidtimerequestid = p_PaidTimeRequestId;

        UPDATE bill
        SET amounttopay = amounttopay + (v_new_price - COALESCE(v_old_price, 0))
        WHERE billid = v_billid;
    END IF;

    -- שינוי סלוט מבוקש - חייב להיות מאותה תחרות.
    IF p_RequestedCompSlotId IS NOT NULL AND p_RequestedCompSlotId <> v_current_slotid THEN
        SELECT competitionid
        INTO v_new_slot_competition
        FROM paidtimeslotincompetition
        WHERE paidtimeslotincompid = p_RequestedCompSlotId;

        IF v_new_slot_competition IS NULL THEN
            RAISE EXCEPTION 'New requested slot not found';
        END IF;

        IF v_new_slot_competition <> v_current_competition THEN
            RAISE EXCEPTION 'Cannot move request to a slot in a different competition';
        END IF;

        -- מבטלים שיבוץ קיים כי הסלוט המבוקש השתנה - השיבוץ מחדש דרך האלגוריתם.
        -- תיקון פגם: קובעים גם status='Pending' (קודם נותר 'Assigned' עם שיבוץ NULL)
        -- ומאפסים allocationorigin, כדי לקיים את אילוץ מחזור-החיים.
        -- D5 = דחייה: אין ריקָלוק לסלוט-המקור המתפנה (פער בטוח).
        UPDATE paidtimerequest
        SET requestedcompslotid = p_RequestedCompSlotId,
            assignedcompslotid  = NULL,
            assignedstarttime   = NULL,
            assignedorder       = NULL,
            status              = 'Pending',
            allocationorigin    = NULL
        WHERE paidtimerequestid = p_PaidTimeRequestId;
    END IF;

    -- עדכון notes - מתבצע רק אם הועבר במפורש.
    IF v_notes_provided THEN
        UPDATE paidtimerequest
        SET notes = NULLIF(p_Notes, '')
        WHERE paidtimerequestid = p_PaidTimeRequestId;
    END IF;
END;
$$;
