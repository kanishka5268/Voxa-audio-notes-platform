-- Migration: Add is_pinned and is_archived columns to public.audio_notes
-- Run this in your Supabase SQL Editor:

ALTER TABLE public.audio_notes
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE public.audio_notes
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
