-- Migration: Add skills column to projects table
-- Date: 2025-01-18
-- Description: Add skills column to store required skills for each project

-- Add skills column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';

-- Add comment to the new column
COMMENT ON COLUMN public.projects.skills IS '프로젝트에 필요한 스킬 목록 (예: 보컬, 작곡, 편곡, 믹싱, 마스터링, 뮤직비디오, 안무, 패션디자인, 스타일링, 포토그래피, 영상편집, 그래픽디자인, 메이크업, 헤어, 네일아트, 요리, 베이킹, 푸드스타일링)';
