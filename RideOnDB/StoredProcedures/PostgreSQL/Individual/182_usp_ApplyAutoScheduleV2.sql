-- מחיל את קבוצת-הכתיבה של השיבוץ האוטומטי (V2-2) בטרנזקציה אחת.
-- הכול-או-כלום: אם בדיקה כלשהי נכשלת - שום חלק מהתוכנית ושום שורת ביקורת אינם נשמרים.
--
-- מדוע פרוצדורה חדשה ולא הרחבה של 129:
--   129 פורסה ומשרתת את המסלול הקיים (BulkCreate -> RunAutoScheduler). שינויי DB
--   נפרסים בנפרד מהקוד, ולכן שינוי הסמנטיקה של 129 היה שובר את ה-backend הפרוס
--   בין המיגרציה למיזוג. 129 נשארת ללא שינוי.
--
-- ההבדל המהותי מ-129:
--   129 מאמתת כל שורה מול מצב ה-DB *באמצע* הלולאה, ולכן החלפה הדדית חוקית
--   נדחית: כשנבדקת B, השורה של A עדיין יושבת במיקום הישן שלה. כאן המצב הסופי
--   מאומת פעם אחת, אחרי כל העדכונים, מול *כל* שורות ה-Assigned של התחרות.
--
-- p_plan: אובייקט JSONB { expectedWriteSetCount, items: [...] }.
--   כל פריט נושא גם מצב-ישן צפוי וגם מצב סופי:
--   {
--     "paidTimeRequestId": int,
--     "changeKind": "NewAssignment" | "Moved",
--     "expectedStatus": "Pending" | "Assigned",
--     "expectedAssignedCompSlotId": int|null,
--     "expectedAssignedStartTime": timestamptz|null,
--     "expectedAssignedOrder": int|null,
--     "expectedAllocationOrigin": "Auto"|"Manual"|null,
--     "newAssignedCompSlotId": int,
--     "newAssignedStartTime": timestamptz,
--     "newAssignedOrder": int,
--     "newStatus": "Assigned",
--     "newAllocationOrigin": "Auto"|"Manual"|null
--   }
--   חברי-התוכנית הם *אך ורק* שורות שמצבן משתנה. שורות ללא שינוי, קפואות ולא-משובצות
--   אינן נשלחות, אינן ננקות ואינן מתעדכנות - אך הן עדיין מגבילות את התוצאה, כי
--   אימות-המצב-הסופי רץ על כל שורות ה-Assigned של התחרות ולא רק על חברי התוכנית.
--
-- p_competitionid:     התחרות (לנעילת-הייעוץ ולבדיקות השיוך).
-- p_appliedbypersonid: המזכירה שאישרה (טענת "PersonId"), לשורות הביקורת.
--
-- מחזיר JSONB: {"assigned": n, "moved": n, "audited": n}
--
-- שינוי חתימה => DROP + CREATE.
CREATE OR REPLACE FUNCTION usp_ApplyAutoScheduleV2(
    p_plan              JSONB,
    p_competitionid     INTEGER,
    p_appliedbypersonid INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_expected_count INTEGER;
    v_actual_count   INTEGER;
    v_assigned       INTEGER := 0;
    v_moved          INTEGER := 0;
    v_audited        INTEGER := 0;
    v_bad            TEXT;
    v_before         JSONB;

    -- טביעת-אצבע של כל שיבוצי הסלוטים המפורסמים בתחרות, לפני ואחרי הכתיבה.
    -- משמשת להוכחה עצמאית שאף שיבוץ קפוא-בגלל-פרסום לא נגע - במקום להסתמך על
    -- הטענה המבנית ש-UPDATE נוגע רק בחברי התוכנית.
    v_published_before TEXT;
    v_published_after  TEXT;
    v_competitionenddate DATE;
BEGIN
    -- ===== בדיקת ארגומנטים =====
    IF p_competitionid IS NULL OR p_appliedbypersonid IS NULL THEN
        RAISE EXCEPTION 'invalid apply arguments';
    END IF;

    -- מועד סיום התחרות: נבדק ללא תנאי, גם כשקבוצת-הכתיבה ריקה - Apply על תחרות
    -- שהסתיימה נחסם תמיד, ולא רק כשיש בפועל מה לכתוב.
    SELECT c.competitionenddate
    INTO v_competitionenddate
    FROM public.competition c
    WHERE c.competitionid = p_competitionid;

    IF (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate THEN
        RAISE EXCEPTION 'Competition has already ended' USING ERRCODE = 'RN001';
    END IF;

    IF p_plan IS NULL OR jsonb_typeof(p_plan->'items') <> 'array' THEN
        RAISE EXCEPTION 'invalid plan payload';
    END IF;

    -- שלמות-תעבורה: המנוע מכריז על גודל קבוצת-הכתיבה, ואנחנו מוודאים שהוא הגיע
    -- שלם. זהו כשל שה-Fingerprint אינו יכול לראות - הוא מחושב לפני הסריאליזציה.
    v_expected_count := (p_plan->>'expectedWriteSetCount')::INTEGER;
    SELECT COUNT(*) INTO v_actual_count FROM jsonb_array_elements(p_plan->'items') e;

    IF v_expected_count IS NULL OR v_expected_count <> v_actual_count THEN
        RAISE EXCEPTION 'write set count mismatch (declared %, received %)',
            v_expected_count, v_actual_count;
    END IF;

    -- תוכנית ריקה היא תוצאה תקינה (שום בקשה לא שובצה ושום שיבוץ לא הוזז).
    IF v_actual_count = 0 THEN
        RETURN jsonb_build_object('assigned', 0, 'moved', 0, 'audited', 0);
    END IF;

    -- ===== נעילת-ייעוץ: אותו מפתח כמו 129/122/123/151/166 =====
    -- מסדרת את ההחלה מול כל נתיבי-השיבוץ הידניים של אותה תחרות.
    PERFORM pg_advisory_xact_lock(1734, p_competitionid);

    -- ===== בדיקות-מבנה של התוכנית, לפני כל שינוי =====
    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_plan->'items')
                      AS t("paidTimeRequestId" INTEGER)
        GROUP BY t."paidTimeRequestId" HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'duplicate request id in write plan';
    END IF;

    SELECT string_agg(DISTINCT t."changeKind", ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items') AS t("changeKind" TEXT)
    WHERE t."changeKind" IS NULL OR t."changeKind" NOT IN ('NewAssignment', 'Moved');

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'invalid changeKind in write plan: %', v_bad;
    END IF;

    -- צורת החלטה תקינה: מצב סופי מלא תמיד, ומצב-ישן מלא בהזזה בלבד.
    SELECT string_agg(t."paidTimeRequestId"::TEXT, ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items') AS t(
        "paidTimeRequestId" INTEGER, "changeKind" TEXT, "expectedStatus" TEXT,
        "expectedAssignedCompSlotId" INTEGER, "expectedAssignedStartTime" TIMESTAMPTZ,
        "expectedAssignedOrder" INTEGER,
        "newAssignedCompSlotId" INTEGER, "newAssignedStartTime" TIMESTAMPTZ,
        "newAssignedOrder" INTEGER, "newStatus" TEXT)
    WHERE t."newAssignedCompSlotId" IS NULL
       OR t."newAssignedStartTime" IS NULL
       OR t."newAssignedOrder" IS NULL
       OR t."newAssignedOrder" <= 0
       OR COALESCE(t."newStatus", '') <> 'Assigned'
       OR (t."changeKind" = 'NewAssignment' AND (
                COALESCE(t."expectedStatus", '') <> 'Pending'
             OR t."expectedAssignedCompSlotId" IS NOT NULL
             OR t."expectedAssignedStartTime" IS NOT NULL
             OR t."expectedAssignedOrder" IS NOT NULL))
       OR (t."changeKind" = 'Moved' AND (
                COALESCE(t."expectedStatus", '') <> 'Assigned'
             OR t."expectedAssignedCompSlotId" IS NULL
             OR t."expectedAssignedStartTime" IS NULL
             OR t."expectedAssignedOrder" IS NULL
             -- הזזה חייבת באמת לשנות משהו; אחרת היא שורה-ללא-שינוי שאין לכתוב.
             OR (t."expectedAssignedCompSlotId" = t."newAssignedCompSlotId"
                 AND t."expectedAssignedStartTime" = t."newAssignedStartTime"
                 AND t."expectedAssignedOrder" = t."newAssignedOrder")));

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'malformed write plan item(s): %', v_bad;
    END IF;

    -- אין כפילות (slot, order) בתוך התוכנית עצמה.
    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_plan->'items')
                      AS t("newAssignedCompSlotId" INTEGER, "newAssignedOrder" INTEGER)
        GROUP BY t."newAssignedCompSlotId", t."newAssignedOrder" HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'duplicate (slot, order) in write plan';
    END IF;

    -- ===== נעילת שורות בסדר מזהה דטרמיניסטי (מניעת deadlock) =====
    PERFORM 1
    FROM paidtimerequest p
    WHERE p.paidtimerequestid IN (
        SELECT t."paidTimeRequestId"
        FROM jsonb_to_recordset(p_plan->'items') AS t("paidTimeRequestId" INTEGER)
    )
    ORDER BY p.paidtimerequestid
    FOR UPDATE;

    -- נעילת הסלוטים המעורבים (מקור ויעד) כדי לקבע את מצב-הפרסום שלהם.
    PERFORM 1
    FROM paidtimeslotincompetition s
    WHERE s.paidtimeslotincompid IN (
        SELECT t."newAssignedCompSlotId"
        FROM jsonb_to_recordset(p_plan->'items') AS t("newAssignedCompSlotId" INTEGER)
        UNION
        SELECT t."expectedAssignedCompSlotId"
        FROM jsonb_to_recordset(p_plan->'items') AS t("expectedAssignedCompSlotId" INTEGER)
        WHERE t."expectedAssignedCompSlotId" IS NOT NULL
    )
    ORDER BY s.paidtimeslotincompid
    FOR SHARE;

    -- ===== כל חברי התוכנית קיימים =====
    SELECT string_agg(t."paidTimeRequestId"::TEXT, ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items') AS t("paidTimeRequestId" INTEGER)
    WHERE NOT EXISTS (
        SELECT 1 FROM paidtimerequest p WHERE p.paidtimerequestid = t."paidTimeRequestId"
    );

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'write plan references missing request(s): %', v_bad;
    END IF;

    -- ===== אימות המצב-הישן הצפוי, שורה-שורה =====
    -- מחליף את השומר של 129 ("status='Pending' AND assignedcompslotid IS NULL"),
    -- שאינו יודע לתאר שיבוץ קיים. IS DISTINCT FROM כדי ש-NULL יושווה כערך.
    SELECT string_agg(t."paidTimeRequestId"::TEXT, ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items') AS t(
        "paidTimeRequestId" INTEGER, "expectedStatus" TEXT,
        "expectedAssignedCompSlotId" INTEGER, "expectedAssignedStartTime" TIMESTAMPTZ,
        "expectedAssignedOrder" INTEGER, "expectedAllocationOrigin" TEXT)
    JOIN paidtimerequest p ON p.paidtimerequestid = t."paidTimeRequestId"
    WHERE p.status              IS DISTINCT FROM t."expectedStatus"
       OR p.assignedcompslotid  IS DISTINCT FROM t."expectedAssignedCompSlotId"
       OR p.assignedstarttime   IS DISTINCT FROM t."expectedAssignedStartTime"
       OR p.assignedorder       IS DISTINCT FROM t."expectedAssignedOrder"
       OR p.allocationorigin    IS DISTINCT FROM t."expectedAllocationOrigin";

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'expected old state mismatch for request(s) % (stale plan)', v_bad;
    END IF;

    -- ===== מצב-פרסום: צד-המקור =====
    -- 129 בדקה יעד בלבד. שיבוץ שיושב בסלוט שפורסם קפוא ואסור להזיזו, ואת זה
    -- חייבים לאכוף כאן בנפרד מה-Fingerprint ולא להסתמך עליו.
    SELECT string_agg(t."paidTimeRequestId"::TEXT, ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items')
         AS t("paidTimeRequestId" INTEGER, "expectedAssignedCompSlotId" INTEGER)
    JOIN paidtimeslotincompetition s
        ON s.paidtimeslotincompid = t."expectedAssignedCompSlotId"
    WHERE t."expectedAssignedCompSlotId" IS NOT NULL
      AND COALESCE(s.ispublished, FALSE);

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'source slot is published for request(s) %', v_bad;
    END IF;

    -- ===== מצב-פרסום, שיוך-תחרות, ותאריך/מגרש של סלוט-היעד =====
    -- התאריך והמגרש נבדקים מול הסלוט *המבוקש* של הבקשה, ישירות מה-DB - כך
    -- איסור-חציית-היום ואיסור-חציית-המגרש נאכפים בלי להסתמך על נכונות המנוע.
    SELECT string_agg(t."paidTimeRequestId"::TEXT, ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items')
         AS t("paidTimeRequestId" INTEGER, "newAssignedCompSlotId" INTEGER)
    JOIN paidtimerequest p ON p.paidtimerequestid = t."paidTimeRequestId"
    LEFT JOIN paidtimeslotincompetition ts
        ON ts.paidtimeslotincompid = t."newAssignedCompSlotId"
    LEFT JOIN paidtimeslotincompetition rs
        ON rs.paidtimeslotincompid = p.requestedcompslotid
    WHERE ts.paidtimeslotincompid IS NULL
       OR COALESCE(ts.ispublished, FALSE)
       OR ts.competitionid <> p_competitionid
       OR rs.paidtimeslotincompid IS NULL
       OR rs.competitionid <> p_competitionid
       OR ts.slotdate     <> rs.slotdate
       OR ts.arenaranchid <> rs.arenaranchid
       OR ts.arenaid      <> rs.arenaid;

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'illegal target slot for request(s) % (published / wrong competition / date / arena)', v_bad;
    END IF;

    -- ===== סלוטים לא-בטוחים (מדור קודם), משני הצדדים =====
    -- סלוט שמכיל ולו שורה אחת במצב Assigned ללא assignedstarttime הוא סלוט שמצב
    -- התפוסה האמיתי שלו אינו ניתן לאימות: לשורה הזו אין מרווח-זמן, ולכן בדיקות
    -- החפיפה, הגבולות והקיבולת שלמטה פשוט לא רואות אותה. אסור להתעלם ממנה ואז
    -- לאשר כתיבה לתוך הסלוט שלה. הבדיקה הזו מוכיחה, *לפני* כל שינוי, שאף סלוט
    -- מקור ואף סלוט יעד של התוכנית אינו כזה.
    SELECT string_agg(DISTINCT t."paidTimeRequestId"::TEXT, ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items') AS t(
        "paidTimeRequestId" INTEGER,
        "expectedAssignedCompSlotId" INTEGER,
        "newAssignedCompSlotId" INTEGER)
    WHERE EXISTS (
        SELECT 1
        FROM paidtimerequest o
        JOIN paidtimeslotincompetition os
            ON os.paidtimeslotincompid = o.assignedcompslotid
        WHERE os.competitionid = p_competitionid
          AND o.status = 'Assigned'
          AND o.assignedstarttime IS NULL
          AND o.assignedcompslotid IN (t."expectedAssignedCompSlotId",
                                       t."newAssignedCompSlotId")
    );

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'unsafe legacy slot (holds an Assigned row with no start time) for request(s) %', v_bad;
    END IF;

    -- ===== לכידת המצב הישן לפני הניקוי =====
    -- שלב הניקוי הורס את assignedcompslotid/assignedstarttime/assignedorder,
    -- ולכן ערכי-הביקורת חייבים להילכד עכשיו. נשמר כ-JSONB ולא כטבלה זמנית, כדי
    -- להימנע ממלכודת תוכניות-מטמון של plpgsql מול טבלאות זמניות.
    SELECT jsonb_agg(jsonb_build_object(
               'rid',    p.paidtimerequestid,
               'slotid', p.assignedcompslotid,
               'start',  p.assignedstarttime,
               'ord',    p.assignedorder,
               'origin', p.allocationorigin,
               'reqslot', p.requestedcompslotid))
    INTO v_before
    FROM paidtimerequest p
    WHERE p.paidtimerequestid IN (
        SELECT t."paidTimeRequestId"
        FROM jsonb_to_recordset(p_plan->'items') AS t("paidTimeRequestId" INTEGER)
    );

    -- ===== לכידת מצב השיבוצים בסלוטים מפורסמים, לפני הכתיבה =====
    -- שיבוץ שיושב בסלוט מפורסם קפוא: הוא נשאר בדיוק כפי שהוא, ונוכחותו אינה
    -- אמורה לחסום החלה חוקית בסלוטים אחרים. את *שני* החלקים חייבים להוכיח -
    -- החלק השני מוכח בהשוואת טביעת-האצבע הזו אחרי הכתיבה.
    SELECT COALESCE(string_agg(
               p.paidtimerequestid::TEXT || ':' ||
               COALESCE(p.assignedcompslotid::TEXT, '') || ':' ||
               COALESCE(p.assignedstarttime::TEXT, '') || ':' ||
               COALESCE(p.assignedorder::TEXT, '') || ':' ||
               COALESCE(p.status, '') || ':' ||
               COALESCE(p.allocationorigin, ''),
               '|' ORDER BY p.paidtimerequestid), '')
    INTO v_published_before
    FROM paidtimerequest p
    JOIN paidtimeslotincompetition s ON s.paidtimeslotincompid = p.assignedcompslotid
    WHERE s.competitionid = p_competitionid
      AND COALESCE(s.ispublished, FALSE)
      AND p.status = 'Assigned';

    -- ===== ניקוי: *רק* שורות שהוזזו =====
    -- זהו המנגנון היחיד שהופך החלפה הדדית ומעגל-שלושה לניתנים לביטוי: בלעדיו
    -- שורה נכנסת מתנגשת בשורה שטרם יצאה. בטוח דווקא משום שהוא בתוך הטרנזקציה
    -- שתתחייב במלואה או תתגלגל במלואה, ומשום שהמצב-הישן כבר אומת ונלכד.
    -- שורות ללא שינוי לעולם אינן ננקות.
    UPDATE paidtimerequest
    SET assignedcompslotid = NULL,
        assignedstarttime  = NULL,
        assignedorder      = NULL,
        status             = 'Pending'
    WHERE paidtimerequestid IN (
        SELECT t."paidTimeRequestId"
        FROM jsonb_to_recordset(p_plan->'items')
             AS t("paidTimeRequestId" INTEGER, "changeKind" TEXT)
        WHERE t."changeKind" = 'Moved'
    );

    -- ===== החלת המצב הסופי (חדשים והוזזו) =====
    UPDATE paidtimerequest p
    SET assignedcompslotid = t."newAssignedCompSlotId",
        assignedstarttime  = t."newAssignedStartTime",
        assignedorder      = t."newAssignedOrder",
        status             = 'Assigned',
        allocationorigin   = t."newAllocationOrigin"
    FROM jsonb_to_recordset(p_plan->'items') AS t(
        "paidTimeRequestId" INTEGER, "newAssignedCompSlotId" INTEGER,
        "newAssignedStartTime" TIMESTAMPTZ, "newAssignedOrder" INTEGER,
        "newAllocationOrigin" TEXT)
    WHERE p.paidtimerequestid = t."paidTimeRequestId";

    SELECT COUNT(*) FILTER (WHERE t."changeKind" = 'NewAssignment'),
           COUNT(*) FILTER (WHERE t."changeKind" = 'Moved')
    INTO v_assigned, v_moved
    FROM jsonb_to_recordset(p_plan->'items') AS t("changeKind" TEXT);

    -- =====================================================================
    -- אימות המצב הסופי - על *כל* שורות ה-Assigned של התחרות
    -- =====================================================================
    -- לא רק על חברי התוכנית. זה מה שהופך השמטה של משתתף-תנועה לבלתי-אפשרית
    -- בשקט: אם ההשמטה יוצרת חפיפה או כפילות-מיקום, הבדיקות כאן תופסות אותה.
    --
    -- שורות מדור קודם עם assignedstarttime = NULL מוחרגות מאוסף `final`: אין להן
    -- מרווח להשוות אליו, ולכן בדיקות החפיפה/הגבולות/הקיבולת אינן יכולות לפעול
    -- עליהן. חסימת ההחלה בגללן הייתה מונעת לצמיתות כל שיבוץ בתחרות שמכילה אותן
    -- (וקיימות כאלה בנתונים החיים).
    --
    -- הן *אינן* נעלמות מהחוקיות בגלל זה, בשתי דרכים נפרדות:
    --   1) הבדיקה למעלה כבר הוכיחה שאף סלוט מקור/יעד של התוכנית אינו מכיל שורה
    --      כזו, ולכן לא נכתב דבר לתוך סלוט שתפוסתו אינה ניתנת לאימות;
    --   2) אוסף `all_assigned` שלמטה כולל אותן במפורש, ובדיקת כפילות
    --      (סלוט, מיקום) רצה עליו - כך שמספר-מיקום שתפוס על ידי שורת-מדור-קודם
    --      לעולם לא יוקצה מחדש.
    -- שלמות חברי-התוכנית עצמם נבדקת כבדיקה 1 למטה.
    --
    -- הכול בהוראה אחת עם CTE משותף, ובמכוון לא דרך טבלה/מבט זמניים: אובייקט זמני
    -- שנוצר בתוך פונקציית plpgsql מסכן תוכניות-מטמון בקריאות חוזרות באותו session
    -- ("cache lookup failed for relation"). ההפרה הראשונה לפי סדר עדיפות מוחזרת.
    WITH all_assigned AS (
        -- כל שורות ה-Assigned של התחרות, *כולל* שורות ללא assignedstarttime.
        -- משמש אך ורק לבדיקת כפילות (סלוט, מיקום), שאינה תלויה בזמן.
        SELECT ptr.paidtimerequestid AS rid,
               ptr.assignedcompslotid AS slotid,
               ptr.assignedorder AS ord
        FROM paidtimerequest ptr
        JOIN paidtimeslotincompetition s ON s.paidtimeslotincompid = ptr.assignedcompslotid
        WHERE s.competitionid = p_competitionid
          AND ptr.status = 'Assigned'
          AND ptr.assignedorder IS NOT NULL
    ),
    final AS (
        SELECT ptr.paidtimerequestid AS rid,
               ptr.assignedcompslotid AS slotid,
               ptr.assignedstarttime AS st,
               ptr.assignedstarttime + ((ptp.durationminutes + 1) || ' minutes')::interval AS en,
               (ptp.durationminutes + 1) AS dur,
               ptr.assignedorder AS ord,
               s.arenaranchid, s.arenaid,
               COALESCE(s.ispublished, FALSE) AS ispublished,
               (s.slotdate + s.starttime)::timestamptz AS slot_start_ts,
               (s.slotdate + s.endtime)::timestamptz AS slot_end_ts,
               (EXTRACT(EPOCH FROM (s.endtime - s.starttime))::INTEGER / 60) AS slot_capacity,
               sr.coachfederationmemberid AS coachid,
               sr.riderfederationmemberid AS riderid,
               sr.horseid AS horseid
        FROM paidtimerequest ptr
        JOIN paidtimeslotincompetition s ON s.paidtimeslotincompid = ptr.assignedcompslotid
        JOIN servicerequest sr           ON sr.srequestid          = ptr.paidtimerequestid
        JOIN pricecatalog pc             ON pc.pricecatalogid      = ptr.pricecatalogid
        JOIN paidtimeproduct ptp         ON ptp.productid          = pc.productid
        WHERE s.competitionid = p_competitionid
          AND ptr.status = 'Assigned'
          AND ptr.assignedstarttime IS NOT NULL
    ),
    violation AS (
        -- 1. שלמות חברי-התוכנית: כל אחד חייב לשבת בדיוק במקום שהוכרז.
        --    זו גם הבדיקה שתופסת חבר-תוכנית שנעלם מהאוסף (סלוט בתחרות אחרת,
        --    שעת-התחלה שנותרה NULL וכדומה).
        SELECT 1 AS ord,
               'final state does not match the plan for request(s) '
               || string_agg(t."paidTimeRequestId"::TEXT, ', ') AS msg
        FROM jsonb_to_recordset(p_plan->'items') AS t(
            "paidTimeRequestId" INTEGER, "newAssignedCompSlotId" INTEGER,
            "newAssignedStartTime" TIMESTAMPTZ, "newAssignedOrder" INTEGER)
        LEFT JOIN final f ON f.rid = t."paidTimeRequestId"
        WHERE f.rid IS NULL
           OR f.slotid IS DISTINCT FROM t."newAssignedCompSlotId"
           OR f.st     IS DISTINCT FROM t."newAssignedStartTime"
           OR f.ord    IS DISTINCT FROM t."newAssignedOrder"

        UNION ALL
        -- 2. כפילות (סלוט, מיקום) - על *כל* שורות ה-Assigned, כולל שורות ללא
        --    שעת-התחלה. מספר-מיקום נתפס גם כשאין מרווח-זמן.
        SELECT 2, 'duplicate (slot, order) in final state'
        WHERE EXISTS (SELECT 1 FROM all_assigned GROUP BY slotid, ord HAVING COUNT(*) > 1)

        UNION ALL
        -- 3. חפיפת מרווחים בתוך אותו סלוט (חצי-פתוח).
        SELECT 3, 'interval overlap inside a slot in final state'
        WHERE EXISTS (
            SELECT 1 FROM final a JOIN final b ON b.slotid = a.slotid AND b.rid > a.rid
            WHERE a.st < b.en AND b.st < a.en)

        UNION ALL
        -- 4. גבולות הסלוט.
        SELECT 4, 'assignment exceeds slot bounds in final state'
        WHERE EXISTS (SELECT 1 FROM final WHERE st < slot_start_ts OR en > slot_end_ts)

        UNION ALL
        -- 5. קיבולת הסלוט - אותה סמנטיקה בדיוק כמו פרוצדורה 128:
        --    משך = durationminutes + 1, קיבולת = דקות חלון-הסלוט.
        SELECT 5, 'slot capacity exceeded in final state'
        WHERE EXISTS (
            SELECT 1 FROM final GROUP BY slotid, slot_capacity HAVING SUM(dur) > slot_capacity)

        UNION ALL
        -- 6. חפיפת מאמן, כולל מרווח-מעבר 7 דק' בין מגרשים שונים בלבד
        --    (זהה ל-CoachTimeline ב-C#, TRANSITION_MINUTES=7).
        SELECT 6, 'coach overlap in final state'
        WHERE EXISTS (
            SELECT 1 FROM final a JOIN final b ON b.rid > a.rid AND b.coachid = a.coachid
            WHERE a.coachid IS NOT NULL
              AND (a.st - ((CASE WHEN a.arenaranchid = b.arenaranchid
                                  AND a.arenaid      = b.arenaid
                                 THEN 0 ELSE 7 END) || ' minutes')::interval) < b.en
              AND b.st < (a.en + ((CASE WHEN a.arenaranchid = b.arenaranchid
                                         AND a.arenaid      = b.arenaid
                                        THEN 0 ELSE 7 END) || ' minutes')::interval))

        UNION ALL
        -- 7. חפיפת רוכב (ללא מרווח-מעבר).
        SELECT 7, 'rider overlap in final state'
        WHERE EXISTS (
            SELECT 1 FROM final a JOIN final b ON b.rid > a.rid AND b.riderid = a.riderid
            WHERE a.st < b.en AND b.st < a.en)

        UNION ALL
        -- 8. חפיפת סוס (ללא מרווח-מעבר).
        SELECT 8, 'horse overlap in final state'
        WHERE EXISTS (
            SELECT 1 FROM final a JOIN final b ON b.rid > a.rid AND b.horseid = a.horseid
            WHERE a.st < b.en AND b.st < a.en)

        UNION ALL
        -- 9. אף *חבר-תוכנית* אינו יושב בסלוט שפורסם.
        --
        --    מכוון ומוגבל לחברי-התוכנית בלבד: `final` מכיל את כל שיבוצי התחרות,
        --    וביניהם שיבוצים קפואים שכבר יושבים בסלוטים מפורסמים באופן לגיטימי.
        --    בדיקה גורפת על `final` הייתה מפילה *כל* החלה בתחרות שיש בה ולו שיבוץ
        --    מפורסם אחד - כלומר, הקיפאון שלו היה חוסם את יתר הסלוטים במקום להשאיר
        --    אותם לבד. השורות הקפואות האלה מוגנות בדרך אחרת: טביעת-האצבע
        --    v_published_before/after למטה מוכיחה שאף אחת מהן לא נגעה.
        SELECT 9,
               'plan member lands in a published slot in final state: '
               || string_agg(t."paidTimeRequestId"::TEXT, ', ')
        FROM jsonb_to_recordset(p_plan->'items') AS t("paidTimeRequestId" INTEGER)
        JOIN final f ON f.rid = t."paidTimeRequestId"
        WHERE f.ispublished
    )
    SELECT msg INTO v_bad
    FROM violation
    WHERE msg IS NOT NULL
    ORDER BY ord
    LIMIT 1;

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION '%', v_bad;
    END IF;

    -- 10. requestedcompslotid לא השתנה לאף חבר-תוכנית.
    --     מובטח גם מבנית (אף UPDATE כאן אינו נוגע בעמודה), אך נאכף במפורש כדי
    --     ששינוי עתידי לא ישבור זאת בשקט.
    SELECT string_agg((b->>'rid'), ', ')
    INTO v_bad
    FROM jsonb_array_elements(v_before) b
    JOIN paidtimerequest p ON p.paidtimerequestid = (b->>'rid')::INTEGER
    WHERE p.requestedcompslotid IS DISTINCT FROM (b->>'reqslot')::INTEGER;

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'requestedcompslotid changed for request(s) %', v_bad;
    END IF;

    -- 11. שימור מקור-השיבוץ: שורה שהוזזה שומרת את ערכה הקודם *במדויק* (כולל
    --     NULL); שיבוץ חדש הוא תמיד 'Auto'.
    SELECT string_agg(t."paidTimeRequestId"::TEXT, ', ')
    INTO v_bad
    FROM jsonb_to_recordset(p_plan->'items')
         AS t("paidTimeRequestId" INTEGER, "changeKind" TEXT)
    JOIN paidtimerequest p ON p.paidtimerequestid = t."paidTimeRequestId"
    LEFT JOIN jsonb_array_elements(v_before) b
        ON (b->>'rid')::INTEGER = t."paidTimeRequestId"
    WHERE (t."changeKind" = 'Moved'
             AND p.allocationorigin IS DISTINCT FROM (b->>'origin'))
       OR (t."changeKind" = 'NewAssignment'
             AND p.allocationorigin IS DISTINCT FROM 'Auto');

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'allocationorigin not preserved for request(s) %', v_bad;
    END IF;

    -- 12. אף שיבוץ בסלוט מפורסם לא נגע.
    --     ההוכחה העצמאית שמשלימה את בדיקה 9: בדיקה 9 מוודאת שאף חבר-תוכנית לא
    --     *נכנס* לסלוט מפורסם; כאן מוודאים שאף שורה קפואה-בגלל-פרסום, כולל כאלה
    --     שמחוץ לקבוצת-הכתיבה לחלוטין, לא זזה, לא שינתה סדר/שעה/סטטוס ולא איבדה
    --     את מקור-השיבוץ שלה. יחד השתיים נותנות את הכלל המלא בלי שנוכחות של
    --     שיבוץ מפורסם תחסום החלה חוקית בסלוטים אחרים.
    SELECT COALESCE(string_agg(
               p.paidtimerequestid::TEXT || ':' ||
               COALESCE(p.assignedcompslotid::TEXT, '') || ':' ||
               COALESCE(p.assignedstarttime::TEXT, '') || ':' ||
               COALESCE(p.assignedorder::TEXT, '') || ':' ||
               COALESCE(p.status, '') || ':' ||
               COALESCE(p.allocationorigin, ''),
               '|' ORDER BY p.paidtimerequestid), '')
    INTO v_published_after
    FROM paidtimerequest p
    JOIN paidtimeslotincompetition s ON s.paidtimeslotincompid = p.assignedcompslotid
    WHERE s.competitionid = p_competitionid
      AND COALESCE(s.ispublished, FALSE)
      AND p.status = 'Assigned';

    IF v_published_after IS DISTINCT FROM v_published_before THEN
        RAISE EXCEPTION 'a published-slot assignment was modified by this apply';
    END IF;

    -- ===== ביקורת: אחרי שהמצב הסופי אומת =====
    -- הערכים החדשים נקראים מהטבלה עצמה ולא מהתוכנית, כדי שהביקורת תתעד את מה
    -- שבאמת יישמר. הערכים הישנים מגיעים מהלכידה שלפני הניקוי. כישלון כלשהו
    -- קודם לכאן מגלגל הכול, ולכן לעולם אין שורת ביקורת להזזה שלא קרתה.
    INSERT INTO paidtimeassignmentchange (
        paidtimerequestid, competitionid, changekind,
        previousassignedslotid, previousassignedstarttime, previousassignedorder,
        previousallocationorigin,
        newassignedslotid, newassignedstarttime, newassignedorder, newallocationorigin,
        appliedbypersonid)
    SELECT t."paidTimeRequestId",
           p_competitionid,
           'Moved',
           (b->>'slotid')::INTEGER,
           (b->>'start')::TIMESTAMPTZ,
           (b->>'ord')::INTEGER,
           (b->>'origin'),
           p.assignedcompslotid,
           p.assignedstarttime,
           p.assignedorder,
           p.allocationorigin,
           p_appliedbypersonid
    FROM jsonb_to_recordset(p_plan->'items')
         AS t("paidTimeRequestId" INTEGER, "changeKind" TEXT)
    JOIN jsonb_array_elements(v_before) b
        ON (b->>'rid')::INTEGER = t."paidTimeRequestId"
    JOIN paidtimerequest p ON p.paidtimerequestid = t."paidTimeRequestId"
    WHERE t."changeKind" = 'Moved';

    GET DIAGNOSTICS v_audited = ROW_COUNT;

    -- בדיוק שורת ביקורת אחת לכל הזזה - לא פחות ולא יותר.
    IF v_audited <> v_moved THEN
        RAISE EXCEPTION 'audit row count % does not match moved count %', v_audited, v_moved;
    END IF;

    RETURN jsonb_build_object(
        'assigned', v_assigned,
        'moved',    v_moved,
        'audited',  v_audited);
END;
$$;
