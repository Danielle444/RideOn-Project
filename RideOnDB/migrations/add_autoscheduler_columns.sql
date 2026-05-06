-- מיגרציה לאלגוריתם השיבוץ האוטומטי.
--
-- 1) ispublished בסלוט פייד-טיים: כשפורסם, האלגוריתם לא יזיז שיבוצים שכבר נמצאים בסלוט.
-- 2) batchid בבקשה: קישור הפוך לאצווה כדי שהאלגוריתם ידע אילו בקשות
--    באו ביחד עם אילוצים משותפים (מרווחים, צמדות, סדר אימון).
ALTER TABLE public.paidtimeslotincompetition
    ADD COLUMN IF NOT EXISTS ispublished BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.paidtimerequest
    ADD COLUMN IF NOT EXISTS batchid INTEGER;

-- FK יישמר רק אם הטבלה paidtimerequestbatch כבר קיימת (היא נוצרה במיגרציה קודמת)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'paidtimerequestbatch'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND constraint_name   = 'fk_paidtimerequest_batch'
    ) THEN
        ALTER TABLE public.paidtimerequest
            ADD CONSTRAINT fk_paidtimerequest_batch
            FOREIGN KEY (batchid)
            REFERENCES public.paidtimerequestbatch(batchid)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_paidtimerequest_batch
    ON public.paidtimerequest(batchid);
