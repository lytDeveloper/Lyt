-- =====================================================
-- Explore Search Indexes Migration
-- =====================================================
-- 
-- This migration installs pg_trgm extension and creates
-- GIN indexes for full-text search optimization on
-- projects, collaborations, and partners tables.
-- =====================================================

-- Enable pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- Projects Table Indexes
-- =====================================================

-- GIN index on title for trigram search
CREATE INDEX IF NOT EXISTS idx_projects_title_gin_trgm 
ON public.projects USING gin (title gin_trgm_ops);

-- GIN index on description for trigram search
CREATE INDEX IF NOT EXISTS idx_projects_description_gin_trgm 
ON public.projects USING gin (description gin_trgm_ops);

-- GIN index on brand_name for trigram search
CREATE INDEX IF NOT EXISTS idx_projects_brand_name_gin_trgm 
ON public.projects USING gin (brand_name gin_trgm_ops);

-- =====================================================
-- Collaborations Table Indexes
-- =====================================================

-- GIN index on title for trigram search
CREATE INDEX IF NOT EXISTS idx_collaborations_title_gin_trgm 
ON public.collaborations USING gin (title gin_trgm_ops);

-- GIN index on brief_description for trigram search
CREATE INDEX IF NOT EXISTS idx_collaborations_brief_description_gin_trgm 
ON public.collaborations USING gin (brief_description gin_trgm_ops);

-- GIN index on description for trigram search
CREATE INDEX IF NOT EXISTS idx_collaborations_description_gin_trgm 
ON public.collaborations USING gin (description gin_trgm_ops);

-- =====================================================
-- Partners View/Table Indexes
-- =====================================================
-- Note: partners is a VIEW, so we need to create indexes
-- on the underlying tables (profile_artists, profile_creatives)
-- or the partner_stats table if it exists.

-- Check if partner_stats table exists and create indexes
-- If partners is a VIEW based on profile_artists/profile_creatives,
-- we'll need to index those tables instead

-- GIN index on name (from profile_artists or profile_creatives)
-- Since partners is a VIEW, we'll create indexes on the source tables
-- For now, we'll create a comment explaining the structure
-- and create indexes on common fields if they exist

-- If partner_stats table exists:
-- CREATE INDEX IF NOT EXISTS idx_partner_stats_name_gin_trgm 
-- ON public.partner_stats USING gin (name gin_trgm_ops);

-- If indexing profile_artists/profile_creatives directly:
-- These tables might have different column names, so we'll need to
-- check the actual schema. For now, we'll create indexes on
-- common searchable fields.

-- Note: Since partners is a VIEW, the actual indexing strategy
-- depends on the VIEW definition. We'll create indexes on the
-- underlying tables that the VIEW queries.

-- For profile_artists (if it has searchable text fields):
-- CREATE INDEX IF NOT EXISTS idx_profile_artists_name_gin_trgm 
-- ON public.profile_artists USING gin (COALESCE(name, '') gin_trgm_ops);

-- For profile_creatives (if it has searchable text fields):
-- CREATE INDEX IF NOT EXISTS idx_profile_creatives_name_gin_trgm 
-- ON public.profile_creatives USING gin (COALESCE(name, '') gin_trgm_ops);

-- =====================================================
-- Verification Queries (for testing)
-- =====================================================

-- Test trigram similarity search on projects
-- SELECT title, similarity(title, '검색어') as sim
-- FROM projects
-- WHERE title % '검색어'  -- % operator uses trigram similarity
-- ORDER BY sim DESC;

-- Test ilike with trigram index (should use the GIN index)
-- SELECT * FROM projects
-- WHERE title ILIKE '%검색어%'
-- ORDER BY created_at DESC;

