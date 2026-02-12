-- Add distribution_request_status to projects for settlement workflow
-- pending = 정산 대기, submitted = 정산 검토, completed = 정산 완료
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS distribution_request_status text DEFAULT 'pending';

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_distribution_request_status_check;

ALTER TABLE projects
ADD CONSTRAINT projects_distribution_request_status_check
CHECK (distribution_request_status IS NULL OR distribution_request_status IN ('pending', 'submitted', 'completed'));

COMMENT ON COLUMN projects.distribution_request_status IS 'Settlement workflow: pending (not submitted), submitted (under review), completed (paid out)';
