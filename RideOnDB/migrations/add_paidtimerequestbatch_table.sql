-- טבלת אצוות בקשות פייד-טיים שנוצרו ביחד דרך הצ'אטבוט.
-- השדה payload (JSONB) שומר את כל המטא-דאטה: העדפות מאמן, העדפות סוס,
-- אילוצי זמן, צמדות, מרווחים מינימליים וסדר אימון - לשימוש אלגוריתם השיבוץ.
CREATE TABLE IF NOT EXISTS public.paidtimerequestbatch (
    batchid           SERIAL PRIMARY KEY,
    competitionid     INTEGER NOT NULL REFERENCES public.competition(competitionid),
    createdbypersonid INTEGER NOT NULL REFERENCES public.person(personid),
    createdat         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    payload           JSONB NOT NULL,
    requestids        INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[]
);

CREATE INDEX IF NOT EXISTS idx_paidtimerequestbatch_competition
    ON public.paidtimerequestbatch(competitionid);

CREATE INDEX IF NOT EXISTS idx_paidtimerequestbatch_creator
    ON public.paidtimerequestbatch(createdbypersonid);
