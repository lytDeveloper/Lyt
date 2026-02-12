-- Migration: Add viewed_at columns for tracking new item status
-- Date: 2026-01-17

-- Add viewed_at to talk_requests table
ALTER TABLE talk_requests
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL;

-- Add viewed_at to project_applications table
ALTER TABLE project_applications
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL;

-- Add viewed_at to collaboration_applications table
ALTER TABLE collaboration_applications
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN talk_requests.viewed_at IS 'Timestamp when the receiver first viewed this talk request';
COMMENT ON COLUMN project_applications.viewed_at IS 'Timestamp when the reviewer first viewed this application';
COMMENT ON COLUMN collaboration_applications.viewed_at IS 'Timestamp when the reviewer first viewed this application';
