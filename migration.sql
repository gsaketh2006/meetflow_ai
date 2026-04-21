-- Run this in your Supabase SQL Editor
ALTER TABLE public.action_plans 
ADD COLUMN confidence FLOAT DEFAULT 0.0;

-- Optional: Update existing tasks to have a baseline confidence
UPDATE public.action_plans 
SET confidence = 0.8 
WHERE confidence IS NULL OR confidence = 0.0;
