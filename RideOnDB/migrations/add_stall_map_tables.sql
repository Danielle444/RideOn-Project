-- Migration: Add layout column to stallcompound + create stallassignment table
-- Run this in Supabase SQL Editor

-- 1. Add layout column to stallcompound
ALTER TABLE public.stallcompound
    ADD COLUMN IF NOT EXISTS layout JSONB DEFAULT NULL;

-- 2. Create stallassignment table
CREATE TABLE IF NOT EXISTS public.stallassignment (
    assignmentid  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    competitionid INTEGER   NOT NULL REFERENCES public.competition(competitionid) ON DELETE CASCADE,
    ranchid       INTEGER   NOT NULL,
    compoundid    SMALLINT  NOT NULL,
    stallid       SMALLINT  NOT NULL,
    horseid       INTEGER   NOT NULL REFERENCES public.horse(horseid) ON DELETE CASCADE,
    FOREIGN KEY (ranchid, compoundid, stallid) REFERENCES public.stall(ranchid, compoundid, stallid),
    UNIQUE (competitionid, ranchid, compoundid, stallid),
    UNIQUE (competitionid, horseid)
);
