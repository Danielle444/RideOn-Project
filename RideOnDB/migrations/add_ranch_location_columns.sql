-- Migration: Add latitude and longitude columns to ranch table
-- Run this in Supabase SQL Editor

ALTER TABLE public.ranch
    ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT NULL;
