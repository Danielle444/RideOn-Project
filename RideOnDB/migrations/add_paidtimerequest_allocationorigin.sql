-- הוספת עמודת מקור-שיבוץ (allocationorigin) לבקשות פייד-טיים.
-- 'Auto'   = שובץ על ידי אלגוריתם השיבוץ האוטומטי.
-- 'Manual' = שובץ או הוזז ידנית על ידי מזכירה.
-- NULL     = אין שיבוץ פעיל (בקשה במצב Pending או Cancelled).
-- שלב זה מוסיף אך ורק את העמודה ואת אילוץ הערכים המותרים.
-- אילוץ מחזור-החיים המלא ואינדקס-המיקום הייחודי החלקי אינם נוספים כאן -
-- הם ננעלים עד להחלפת הפרוצדורות ולבנייה מחדש של נתוני הבדיקה, לפי סדר המעבר המאושר.
ALTER TABLE public.paidtimerequest
    ADD COLUMN IF NOT EXISTS allocationorigin character varying(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name        = 'paidtimerequest'
          AND constraint_name   = 'ck_paidtimerequest_allocationorigin'
    ) THEN
        ALTER TABLE public.paidtimerequest
            ADD CONSTRAINT ck_paidtimerequest_allocationorigin
            CHECK (allocationorigin IS NULL OR allocationorigin IN ('Auto', 'Manual'));
    END IF;
END $$;
