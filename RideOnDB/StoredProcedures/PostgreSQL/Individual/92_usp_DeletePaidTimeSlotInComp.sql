CREATE OR REPLACE FUNCTION usp_DeletePaidTimeSlotInComp(
    p_PaidTimeSlotInCompId INTEGER,
    forcedelete_param      BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql AS $function$
DECLARE
    v_competitionid INTEGER;
BEGIN
    -- forcedelete_param מתקבל לשם תאימות-חתימה עם ההגדרה הפרוסה, אך אינו
    -- משנה התנהגות (נשמרת הסמנטיקה הפרוסה: מחיקה ישירה לפי מזהה-הסלוט).
    -- הבדיקה הישנה מול paidtimerequest.paidtimeslotincompid הוסרה - אותה
    -- עמודה אינה קיימת, ולכן הבדיקה במאגר הייתה מיושנת ולא-תקינה. אין
    -- מחליפים אותה בבדיקת-תלות חדשה ואין מוסיפים התנהגות force-delete חדשה.

    -- שלב טרום-נעילה: שולפים אך ורק את מזהה-התחרות (מפתח קבוע) הדרוש לנעילה.
    SELECT competitionid
    INTO v_competitionid
    FROM paidtimeslotincompetition
    WHERE paidtimeslotincompid = p_PaidTimeSlotInCompId;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Paid time slot not found';
    END IF;

    -- נעילת-ייעוץ ברמת התחרות: מסדרת מחיקת-סלוט מול החלת-שיבוץ/עריכת-סלוט
    -- של אותה תחרות (עקבי עם יתר הפרוצדורות של שלב 2).
    PERFORM pg_advisory_xact_lock(1734, v_competitionid);

    -- בדיקת-קיום סמכותית תחת הנעילה (מטפלת במחיקה מקבילה בין השליפה לנעילה),
    -- ולאחריה המחיקה עצמה.
    IF NOT EXISTS (
        SELECT 1
        FROM paidtimeslotincompetition
        WHERE paidtimeslotincompid = p_PaidTimeSlotInCompId
    ) THEN
        RAISE EXCEPTION 'Paid time slot not found';
    END IF;

    DELETE FROM paidtimeslotincompetition
    WHERE paidtimeslotincompid = p_PaidTimeSlotInCompId;
END;
$function$;
