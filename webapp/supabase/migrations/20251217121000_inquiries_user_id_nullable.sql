-- Make user_id nullable to allow anonymous signup inquiries
ALTER TABLE public.inquiries
  ALTER COLUMN user_id DROP NOT NULL;