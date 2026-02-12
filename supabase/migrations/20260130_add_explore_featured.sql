-- projects: is_explore_featured, explore_order 추가
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS is_explore_featured boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS explore_order integer;

-- collaborations: 동일 필드 추가
ALTER TABLE public.collaborations
ADD COLUMN IF NOT EXISTS is_explore_featured boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS explore_order integer;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_explore_featured
ON public.projects (is_explore_featured, explore_order) WHERE is_explore_featured = true;

CREATE INDEX IF NOT EXISTS idx_collaborations_explore_featured
ON public.collaborations (is_explore_featured, explore_order) WHERE is_explore_featured = true;
