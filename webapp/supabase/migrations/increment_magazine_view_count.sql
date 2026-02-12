-- Function to atomically increment magazine view count
-- Usage: SELECT increment_magazine_view_count('uuid-here');

CREATE OR REPLACE FUNCTION increment_magazine_view_count(magazine_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE magazines
  SET view_count = view_count + 1
  WHERE id = magazine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_magazine_view_count(UUID) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION increment_magazine_view_count IS 'Atomically increments the view_count for a magazine. Used when a user views a magazine detail page.';
