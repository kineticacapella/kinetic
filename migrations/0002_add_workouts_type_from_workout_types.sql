-- Migration: add `type` column to `workouts` and copy values from `workout_types`.
-- Run this in Supabase SQL editor or via your migration tooling.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workouts' AND column_name = 'type'
    ) THEN
        ALTER TABLE public.workouts
        ADD COLUMN type text;
    END IF;
END$$;

-- Note: `workout_types` is a column on `user_settings` (list of allowed types per user).
-- We should not attempt to copy from a non-existent `workouts.workout_types` column.
-- This migration will only add a `type` column to `workouts` so each workout can store a single selected type.

-- Verify the column exists after running:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='workouts' ORDER BY ordinal_position;

-- If you want to backfill existing workouts from user_settings, we'll need a per-user mapping; handle that separately.
