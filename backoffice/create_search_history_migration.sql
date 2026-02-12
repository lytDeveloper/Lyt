-- =====================================================
-- Search History and Popular Searches Migration
-- =====================================================
-- Description: Creates search_history table for tracking user searches,
--              indexes for performance, and popular_searches view
-- Author: Claude Code
-- Date: 2025-11-24
-- =====================================================

-- Create search_history table
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  search_type TEXT CHECK (search_type IN ('project', 'partner', 'collaboration', 'all')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.search_history IS 'Stores user search history for recent searches feature';
COMMENT ON COLUMN public.search_history.user_id IS 'User who performed the search';
COMMENT ON COLUMN public.search_history.query IS 'Search query text';
COMMENT ON COLUMN public.search_history.search_type IS 'Type of search performed (project/partner/collaboration/all)';
COMMENT ON COLUMN public.search_history.created_at IS 'When the search was performed';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_created
  ON public.search_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_query
  ON public.search_history(query);

CREATE INDEX IF NOT EXISTS idx_search_history_created
  ON public.search_history(created_at DESC);

-- Create popular_searches view (aggregates searches from last 7 days)
CREATE OR REPLACE VIEW public.popular_searches AS
SELECT
  query,
  COUNT(*) as search_count,
  MAX(created_at) as last_searched
FROM public.search_history
WHERE created_at > NOW() - INTERVAL '7 days'
  AND query IS NOT NULL
  AND LENGTH(TRIM(query)) >= 2  -- Only count meaningful searches
GROUP BY query
ORDER BY search_count DESC, last_searched DESC
LIMIT 20;

-- Add comment to view
COMMENT ON VIEW public.popular_searches IS 'Top 20 most popular search queries from the last 7 days';

-- Enable Row Level Security (RLS)
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own search history
CREATE POLICY "Users can view their own search history"
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
  ON public.search_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT SELECT ON public.popular_searches TO authenticated;

-- =====================================================
-- Verification Queries (Run these to test)
-- =====================================================
-- SELECT * FROM public.search_history LIMIT 10;
-- SELECT * FROM public.popular_searches;
-- SELECT COUNT(*) FROM public.search_history;
