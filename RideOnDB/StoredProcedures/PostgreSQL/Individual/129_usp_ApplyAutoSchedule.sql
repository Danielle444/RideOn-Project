-- מחיל את תוצאות אלגוריתם השיבוץ האוטומטי על טבלת הבקשות, בטרנזקציה אחת.
-- הכול-או-כלום: אם בדיקה כלשהי נכשלת - שום חלק מהתוכנית אינו נשמר.
--
-- p_Assignments: מערך JSONB. כל פריט:
--   {
--     "paidTimeRequestId": int,
--     "assignedCompSlotId": int|null,
--     "assignedStartTime": timestamptz|null,
--     "assignedOrder": int|null,
--     "status": "Assigned"|"Pending"
--   }
-- p_AllowedRequestIds: מזהי-הבקשות שנוצרו בהגשה הנוכחית - ורק הם מועמדים לשיבוץ.
-- p_CompetitionId: התחרות (נדרש לנעילת-הייעוץ ולבדיקת שיוך-התחרות).
--
-- מחזיר את מספר השיבוצים החדשים (Assigned) שבוצעו בפועל - לא ספירת איטרציות.
--
-- שינוי חתימה => DROP + CREATE.
DROP FUNCTION IF EXISTS usp_applyautoschedule(jsonb);

CREATE OR REPLACE FUNCTION usp_ApplyAutoSchedule(
    p_Assignments       JSONB,
    p_AllowedRequestIds INTEGER[],
    p_CompetitionId     INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_item            JSONB;
    v_request_id      INTEGER;
    v_slot_id         INTEGER;
    v_start_time      TIMESTAMP WITH TIME ZONE;
    v_order           INTEGER;
    v_status          TEXT;
    v_assigned        INTEGER := 0;

    v_dur_min         INTEGER;
    v_cand_end        TIMESTAMP WITH TIME ZONE;
    v_slot_start_ts   TIMESTAMP WITH TIME ZONE;
    v_slot_end_ts     TIMESTAMP WITH TIME ZONE;
    v_slot_comp       INTEGER;
    v_slot_pub        BOOLEAN;
    v_req_comp        INTEGER;
    v_decisions_count INTEGER;
BEGIN
    -- ===== בדיקת ארגומנטים =====
    IF p_CompetitionId IS NULL
       OR p_AllowedRequestIds IS NULL
       OR array_length(p_AllowedRequestIds, 1) IS NULL THEN
        RAISE EXCEPTION 'invalid apply arguments';
    END IF;

    -- אין כפילויות בקבוצת המזהים המורשים.
    IF (SELECT COUNT(*) <> COUNT(DISTINCT x) FROM unnest(p_AllowedRequestIds) AS x) THEN
        RAISE EXCEPTION 'duplicate ids in allowed set';
    END IF;

    -- ===== נעילת-ייעוץ: מסדרת את כל השינויים באותה תחרות =====
    PERFORM pg_advisory_xact_lock(1734, p_CompetitionId);

    -- ===== בדיקות-מבנה של התוכנית לפני כל שינוי (כל RAISE => rollback מלא) =====
    -- אין כפילות של request_id בתוך התוכנית.
    IF (SELECT COUNT(*) <> COUNT(DISTINCT (e->>'paidTimeRequestId')::int)
        FROM jsonb_array_elements(p_Assignments) e) THEN
        RAISE EXCEPTION 'duplicate request id in decision set';
    END IF;

    -- שלמות: מספר ההחלטות = מספר המזהים המורשים.
    SELECT COUNT(*) INTO v_decisions_count FROM jsonb_array_elements(p_Assignments) e;
    IF v_decisions_count <> array_length(p_AllowedRequestIds, 1) THEN
        RAISE EXCEPTION 'decision set does not match allowed set (completeness)';
    END IF;

    -- כל החלטה מתייחסת למזהה שנמצא בקבוצה המורשית.
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_Assignments) e
        WHERE (e->>'paidTimeRequestId')::int <> ALL (p_AllowedRequestIds)
    ) THEN
        RAISE EXCEPTION 'decision references a request outside the allowed set';
    END IF;

    -- אין כפילות (slot, order) בין החלטות ה-Assigned.
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_Assignments) e
        WHERE COALESCE(e->>'status', 'Pending') = 'Assigned'
        GROUP BY (e->>'assignedCompSlotId')::int, (e->>'assignedOrder')::int
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'duplicate (slot, order) in decision set';
    END IF;

    -- ===== לולאת ההחלה =====
    -- הערה: חפיפת-מרווח בתוך-התוכנית נתפסת בעת ההחלה - כל החלטת Assigned
    -- מוחלת מיד, כך שהחלטה מאוחרת יותר באותו סלוט נבדקת מול המוקדמות שכבר
    -- הוחלו. כיוון שכל כשל מגלגל את הטרנזקציה כולה, אין שמירה חלקית.
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

        IF v_status = 'Assigned' THEN
            -- צורת החלטה תקינה.
            IF v_slot_id IS NULL OR v_start_time IS NULL OR v_order IS NULL OR v_order <= 0 THEN
                RAISE EXCEPTION 'incomplete Assigned decision for request %', v_request_id;
            END IF;

            -- משך הרכיבה (שלב זה שומר על durationminutes + 1).
            SELECT ptp.durationminutes + 1
            INTO v_dur_min
            FROM paidtimerequest ptr
            JOIN pricecatalog pc     ON pc.pricecatalogid = ptr.pricecatalogid AND pc.isactive
            JOIN paidtimeproduct ptp ON ptp.productid     = pc.productid
            WHERE ptr.paidtimerequestid = v_request_id;

            IF v_dur_min IS NULL THEN
                RAISE EXCEPTION 'duration unknown for request %', v_request_id;
            END IF;

            -- גבולות סלוט-היעד + שיוך-תחרות + מצב-פרסום.
            SELECT (s.slotdate + s.starttime)::timestamptz,
                   (s.slotdate + s.endtime)::timestamptz,
                   s.competitionid,
                   COALESCE(s.ispublished, FALSE)
            INTO v_slot_start_ts, v_slot_end_ts, v_slot_comp, v_slot_pub
            FROM paidtimeslotincompetition s
            WHERE s.paidtimeslotincompid = v_slot_id;

            IF v_slot_comp IS NULL THEN
                RAISE EXCEPTION 'target slot % missing', v_slot_id;
            END IF;
            IF v_slot_comp <> p_CompetitionId THEN
                RAISE EXCEPTION 'target slot % not in competition %', v_slot_id, p_CompetitionId;
            END IF;
            IF v_slot_pub THEN
                RAISE EXCEPTION 'target slot % is published', v_slot_id;
            END IF;

            -- הסלוט-המבוקש של הבקשה חייב להשתייך לאותה תחרות.
            SELECT rs.competitionid
            INTO v_req_comp
            FROM paidtimerequest ptr
            JOIN paidtimeslotincompetition rs ON rs.paidtimeslotincompid = ptr.requestedcompslotid
            WHERE ptr.paidtimerequestid = v_request_id;

            IF v_req_comp IS NULL OR v_req_comp <> p_CompetitionId THEN
                RAISE EXCEPTION 'request % not in competition %', v_request_id, p_CompetitionId;
            END IF;

            v_cand_end := v_start_time + (v_dur_min || ' minutes')::interval;

            -- גבול הסלוט.
            IF v_start_time < v_slot_start_ts OR v_cand_end > v_slot_end_ts THEN
                RAISE EXCEPTION 'request % exceeds slot bounds', v_request_id;
            END IF;

            -- חפיפה עם משובצים קיימים (חצי-פתוח: A.start < B.end AND B.start < A.end).
            IF EXISTS (
                SELECT 1
                FROM paidtimerequest o
                JOIN pricecatalog opc     ON opc.pricecatalogid = o.pricecatalogid
                JOIN paidtimeproduct optp ON optp.productid     = opc.productid
                WHERE o.assignedcompslotid = v_slot_id
                  AND o.status = 'Assigned'
                  AND o.paidtimerequestid <> v_request_id
                  AND o.assignedstarttime < v_cand_end
                  AND v_start_time < o.assignedstarttime + ((optp.durationminutes + 1) || ' minutes')::interval
            ) THEN
                RAISE EXCEPTION 'overlap with existing occupant in slot %', v_slot_id;
            END IF;

            -- החלה מוגנת: רק שורה Pending ולא-משובצת זזה (הגנה מפני תוכנית מיושנת).
            UPDATE paidtimerequest
            SET assignedcompslotid = v_slot_id,
                assignedstarttime  = v_start_time,
                assignedorder      = v_order,
                status             = 'Assigned',
                allocationorigin   = 'Auto'
            WHERE paidtimerequestid = v_request_id
              AND status = 'Pending'
              AND assignedcompslotid IS NULL;

            -- אינדקס-המיקום הייחודי החלקי יזרוק 23505 כאן על תפיסת-מיקום מקבילה => rollback מלא.
            IF NOT FOUND THEN
                RAISE EXCEPTION 'request % not Pending/unassigned (stale plan)', v_request_id;
            END IF;

            v_assigned := v_assigned + 1;
        ELSE
            -- Pending (לא נמצא מקום): ללא שיבוץ, ועם אימות שהשורה עדיין Pending.
            IF v_slot_id IS NOT NULL OR v_start_time IS NOT NULL OR v_order IS NOT NULL THEN
                RAISE EXCEPTION 'Pending decision for request % must have null allocation', v_request_id;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM paidtimerequest
                WHERE paidtimerequestid = v_request_id AND status = 'Pending'
            ) THEN
                RAISE EXCEPTION 'request % expected Pending (stale plan)', v_request_id;
            END IF;
        END IF;
    END LOOP;

    RETURN v_assigned;   -- מספר השיבוצים החדשים שבוצעו (אמיתי; לא ספירת איטרציות).
END;
$$;
