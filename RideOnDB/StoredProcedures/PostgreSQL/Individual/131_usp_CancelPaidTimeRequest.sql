-- ביטול בקשת פייד-טיים.
-- כללים:
--   1) הרשאה: כל אדמין חווה מאושר בחוות הסוס של הבקשה - לא רק היוצר המקורי.
--      (תוקן ב-fix/paidtime-cancel-ranch-scoped-auth, פרוס לייב 2026-08-07 דרך
--      CREATE OR REPLACE -- חתימה וסוג החזרה ללא שינוי. קודם לכן הבדיקה הייתה
--      "v_ordered_by <> p_OrderedBySystemUserId" -- מוגבל ליוצר בלבד, בניגוד
--      ל-usp_updatepaidtimerequest שכבר עבד לפי הרשאה ברמת-חווה. זה יצר כפתור
--      "בטוח להיכשל": אדמין חווה מאושר שני, הצופה בחשבון משלם מנוהל, ראה כפתור
--      ביטול פעיל על בקשה שיצר אדמין אחר וקיבל דחייה מובטחת. התיקון מיישר את
--      שני הפרוצים לאותו מודל הרשאה בדיוק: p_OrderedBySystemUserId חייב
--      personranchrole מאושר בתפקיד 'אדמין חווה' בחוות הסוס (horse.ranchid),
--      לא בדיקת זהות יוצר. p_OrderedBySystemUserId הוא תמיד ה-personId מה-JWT
--      (claims), לא ערך מהלקוח -- ראה EnsureUserHasRoleInRanch בקונטרולר.
--      sr.orderedbysystemuserid נשאר היסטורי/ביקורת בלבד ואינו נכתב מחדש כאן.
--      אומת rollback-only לפני ואחרי הפריסה: היוצר עדיין מצליח לבטל; אדמין
--      חווה מאושר אחר (לא היוצר, אותה חווה) מצליח כעת (נכשל קודם); זר ללא
--      תפקיד בחווה זו נדחה RN001; שני ה-guards הקיימים (כבר-בוטל, כבר-שולם)
--      נשארו ללא שינוי.
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
    v_ordered_by     INTEGER;
    v_horseid        INTEGER;
    v_horse_ranchid  INTEGER;
    v_paymentid      INTEGER;
    v_status         TEXT;
    v_competitionid  INTEGER;
BEGIN
    -- מזהה-התחרות של הבקשה (קבוע) - נגזר לפני הנעילה מהסלוט המבוקש.
    SELECT reqslot.competitionid
    INTO v_competitionid
    FROM paidtimerequest ptr
    INNER JOIN paidtimeslotincompetition reqslot
        ON reqslot.paidtimeslotincompid = ptr.requestedcompslotid
    WHERE ptr.paidtimerequestid = p_PaidTimeRequestId;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    -- נעילת-ייעוץ ברמת התחרות: כל הקריאה הסמכותית והשינוי מתבצעים תחת הנעילה.
    PERFORM pg_advisory_xact_lock(1734, v_competitionid);

    SELECT
        sr.orderedbysystemuserid,
        sr.horseid,
        sr.paymentid,
        ptr.status
    INTO
        v_ordered_by,
        v_horseid,
        v_paymentid,
        v_status
    FROM paidtimerequest ptr
    INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    WHERE ptr.paidtimerequestid = p_PaidTimeRequestId;

    IF v_ordered_by IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    -- מזהה-החווה הסמכותי של הבקשה נגזר מחוות הסוס (לא נשלח מהלקוח) - אותו
    -- עיקרון בדיוק כמו usp_updatepaidtimerequest, שכבר מיישם הרשאה ברמת-חווה.
    SELECT h.ranchid
    INTO v_horse_ranchid
    FROM public.horse h
    WHERE h.horseid = v_horseid;

    -- הרשאת ביטול: כל אדמין חווה מאושר בחוות הבקשה - לא רק היוצר המקורי.
    -- מיישר את מודל ההרשאה עם usp_updatepaidtimerequest. p_OrderedBySystemUserId
    -- הוא תמיד ה-personId של הקורא בפועל (claims), לא ערך מהלקוח.
    -- sr.orderedbysystemuserid נשאר היסטורי/ביקורת בלבד ואינו נכתב מחדש כאן.
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_OrderedBySystemUserId
          AND prr.ranchid = v_horse_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'אדמין חווה'
    ) THEN
        RAISE EXCEPTION 'Caller is not an approved ranch admin for this request''s ranch' USING ERRCODE = 'RN001';
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Request already cancelled';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot cancel a paid request';
    END IF;

    -- D5 = דחייה: אין ריקָלוק לסלוט-המקור המתפנה. הפער הנותר בטוח
    -- (אין חפיפה, רק קיבולת מבוזבזת) ויטופל בעבודת הדחיסה של שלב 2.
    UPDATE paidtimerequest
    SET status             = 'Cancelled',
        assignedcompslotid = NULL,
        assignedstarttime  = NULL,
        assignedorder      = NULL,
        allocationorigin   = NULL   -- אין שיבוץ פעיל
    WHERE paidtimerequestid = p_PaidTimeRequestId;
END;
$$;
