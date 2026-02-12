-- Add established_at column to profile_brands table
ALTER TABLE public.profile_brands
ADD COLUMN IF NOT EXISTS established_at TIMESTAMP WITH TIME ZONE;
