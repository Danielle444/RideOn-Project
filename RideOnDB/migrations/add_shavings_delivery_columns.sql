ALTER TABLE public.shavingsorder
    ADD COLUMN IF NOT EXISTS deliverystatus character varying NOT NULL DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS deliveryphotourl text,
    ADD COLUMN IF NOT EXISTS deliveryphotodate timestamp with time zone,
    ADD COLUMN IF NOT EXISTS approvedbypersonid integer REFERENCES public.person(personid),
    ADD COLUMN IF NOT EXISTS approvedat timestamp with time zone;
