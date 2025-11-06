-- Migration: add workout_types column to workouts table
-- Run this in Supabase SQL editor or via your migration tooling.

DO $$
BEGIN
    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'workouts' AND column_name = 'workout_types'
    ) THEN
        ALTER TABLE public.workouts
        ADD COLUMN workout_types text;
        -- Optionally, copy any existing values from another source here.
    END IF;
END$$;

-- Optional: set a default or migrate values
-- ALTER TABLE public.workouts ALTER COLUMN workout_types SET DEFAULT '';

-- To verify, run:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='workouts';
