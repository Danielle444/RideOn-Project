-- ביקורת תנועת-שיבוץ פייד-טיים (V2-2).
--
-- V2-2 הוא השלב הראשון שבו השיבוץ האוטומטי דורס מיקום של שיבוץ קיים. עד כה
-- Apply רק מילא שורות ריקות ולכן לא יכול היה לאבד מידע; מרגע שהוא מזיז שורות,
-- המיקום הקודם נמחק ללא זכר. הטבלה הזו היא רישום append-only של כל הזזה כזו.
--
-- מדיניות רישום (מאושרת, מכוונת):
--   * נרשמות *אך ורק* הזזות של שיבוצים קיימים (changekind = 'Moved').
--   * שיבוץ חדש (Pending -> Assigned) אינו נרשם - הוא אינו דורס דבר.
--   * שורות ללא שינוי, שורות קפואות ובקשות שלא שובצו אינן נרשמות.
--
-- אטומיות: השורות נכתבות בתוך אותה טרנזקציה של usp_ApplyAutoScheduleV2, אחרי
-- שאימות-המצב-הסופי עבר. כל כשל בהחלה מגלגל גם את שורות הביקורת - אין מצב שבו
-- קיימת שורת ביקורת להזזה שלא קרתה, ואין הזזה בלי שורת ביקורת.
--
-- מוסכמות שנשמרות מהפרויקט: SERIAL כמפתח ראשי (כמו paidtimerequestbatch,
-- billcharge), TIMESTAMPTZ NOT NULL DEFAULT NOW() לחותמת-זמן, שמות באותיות
-- קטנות ללא קווים תחתונים, varchar + CHECK במקום ENUM, ו-FK ללא ON DELETE
-- (המוסכמה בפרויקט היא NO ACTION עם מחיקות מפורשות בפרוצדורות).
CREATE TABLE IF NOT EXISTS public.paidtimeassignmentchange (
    assignmentchangeid        SERIAL PRIMARY KEY,

    paidtimerequestid         INTEGER NOT NULL
        REFERENCES public.paidtimerequest(paidtimerequestid),
    competitionid             INTEGER NOT NULL
        REFERENCES public.competition(competitionid),

    changekind                CHARACTER VARYING(20) NOT NULL,

    -- מצב לפני ההזזה.
    previousassignedslotid    INTEGER NOT NULL
        REFERENCES public.paidtimeslotincompetition(paidtimeslotincompid),
    -- nullable במכוון: קיימות בנתונים החיים שורות Assigned ללא assignedstarttime
    -- (מדור קודם). הן מסווגות כקפואות ולא יוזזו, ולכן בפועל לא יגיעו לכאן - אבל
    -- אילוץ NOT NULL כאן היה הופך הרחבה עתידית של קבוצת-הניידות לכשל שמגלגל
    -- תוכנית-שיבוץ שלמה, וזה מחיר שאסור לעמודת ביקורת לגבות.
    previousassignedstarttime TIMESTAMP WITH TIME ZONE,
    previousassignedorder     INTEGER NOT NULL,
    -- nullable: NULL הוא ערך מקור-שיבוץ תקין ונפוץ (רוב שורות ה-Assigned החיות).
    previousallocationorigin  CHARACTER VARYING(20),

    -- מצב אחרי ההזזה.
    newassignedslotid         INTEGER NOT NULL
        REFERENCES public.paidtimeslotincompetition(paidtimeslotincompid),
    newassignedstarttime      TIMESTAMP WITH TIME ZONE NOT NULL,
    newassignedorder          INTEGER NOT NULL,
    -- nullable מאותה סיבה: "שימור המקור" פירושו גם NULL -> NULL.
    newallocationorigin       CHARACTER VARYING(20),

    -- המזכירה שאישרה את ההחלה. זהו ערך טענת "PersonId" של ה-JWT, בדיוק כפי
    -- שהוא מגיע מ-UserAccessValidator.GetPersonIdFromClaims. FK ל-person ולא
    -- ל-systemuser: אותה מוסכמה כמו paidtimerequestbatch.createdbypersonid,
    -- והיא גם היחידה שאינה יכולה להפיל החלה תקינה על שורת ביקורת.
    appliedbypersonid         INTEGER NOT NULL
        REFERENCES public.person(personid),
    appliedat                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_paidtimeassignmentchange_changekind
        CHECK (changekind IN ('Moved')),
    -- מראה את ck_paidtimerequest_allocationorigin: הביקורת לא יכולה להחזיק
    -- ערך-מקור שעמודת-המקור עצמה לא הייתה מקבלת.
    CONSTRAINT ck_paidtimeassignmentchange_prevorigin
        CHECK (previousallocationorigin IS NULL
               OR previousallocationorigin IN ('Auto', 'Manual')),
    CONSTRAINT ck_paidtimeassignmentchange_neworigin
        CHECK (newallocationorigin IS NULL
               OR newallocationorigin IN ('Auto', 'Manual')),
    CONSTRAINT ck_paidtimeassignmentchange_order
        CHECK (previousassignedorder > 0 AND newassignedorder > 0)
);

-- היסטוריית שינויים של בקשה בודדת, מהחדש לישן.
CREATE INDEX IF NOT EXISTS idx_paidtimeassignmentchange_request
    ON public.paidtimeassignmentchange(paidtimerequestid, appliedat DESC);

-- היסטוריית שינויים של תחרות שלמה, מהחדש לישן.
CREATE INDEX IF NOT EXISTS idx_paidtimeassignmentchange_competition
    ON public.paidtimeassignmentchange(competitionid, appliedat DESC);
