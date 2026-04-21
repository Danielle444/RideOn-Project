-- טבלת טוקנים לסיום הרשמת משלם
CREATE TABLE IF NOT EXISTS public.registrationtoken (
    tokenid      SERIAL PRIMARY KEY,
    personid     INTEGER NOT NULL REFERENCES public.person(personid),
    tokenhash    TEXT NOT NULL,
    expiresat    TIMESTAMP WITH TIME ZONE NOT NULL,
    isused       BOOLEAN NOT NULL DEFAULT FALSE,
    createdat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- עמודה לסימון שהמשלם השלים הרשמה
ALTER TABLE public.systemuser
    ADD COLUMN IF NOT EXISTS registrationcompleted BOOLEAN NOT NULL DEFAULT FALSE;
