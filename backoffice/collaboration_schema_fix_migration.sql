-- ============================================================================
-- Collaboration Schema Fix Migration
-- ============================================================================
-- Purpose: Fix data type mismatches between code expectations and DB schema
-- Date: 2025-01-21
--
-- Changes:
-- 1. requirements: text → text[] (array type)
-- 2. benefits: jsonb → text[] (array type)
--
-- IMPORTANT: Backup your data before running this migration!
-- ============================================================================

-- Step 1: Convert requirements from text to text[]
-- Handle existing JSON string data: "[\"item1\", \"item2\"]" → {"item1", "item2"}
ALTER TABLE collaborations
  ALTER COLUMN requirements TYPE text[]
  USING CASE
    WHEN requirements IS NULL THEN NULL
    WHEN requirements = '' THEN '{}'::text[]
    WHEN requirements LIKE '[%]' THEN
      -- Parse JSON string to array
      ARRAY(SELECT jsonb_array_elements_text(requirements::jsonb))
    ELSE
      -- If not JSON format, wrap as single-element array
      ARRAY[requirements]
  END;

-- Set default value for requirements
ALTER TABLE collaborations
  ALTER COLUMN requirements SET DEFAULT '{}'::text[];

-- Step 2: Convert benefits from jsonb to text[]
-- Handle existing JSONB data: [] → {}, ["item1", "item2"] → {"item1", "item2"}
ALTER TABLE collaborations
  ALTER COLUMN benefits TYPE text[]
  USING CASE
    WHEN benefits IS NULL THEN '{}'::text[]
    WHEN jsonb_typeof(benefits) = 'array' THEN
      ARRAY(SELECT jsonb_array_elements_text(benefits))
    ELSE
      '{}'::text[]
  END;

-- Set default value for benefits
ALTER TABLE collaborations
  ALTER COLUMN benefits SET DEFAULT '{}'::text[];

-- Step 3: Verify data conversion
-- Run this query to check the results:
-- SELECT
--   id,
--   title,
--   requirements,
--   benefits,
--   array_length(requirements, 1) as req_count,
--   array_length(benefits, 1) as ben_count
-- FROM collaborations
-- WHERE requirements IS NOT NULL OR benefits IS NOT NULL
-- LIMIT 10;

-- ============================================================================
-- Rollback (if needed):
-- ============================================================================
-- WARNING: This will lose data! Only use if you have a backup.
--
-- -- Rollback requirements to text
-- ALTER TABLE collaborations
--   ALTER COLUMN requirements TYPE text
--   USING array_to_json(requirements)::text;
--
-- -- Rollback benefits to jsonb
-- ALTER TABLE collaborations
--   ALTER COLUMN benefits TYPE jsonb
--   USING to_jsonb(benefits);
-- ============================================================================
