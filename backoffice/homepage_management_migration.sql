-- ============================================
-- 홈페이지 화면 관리 테이블 생성 마이그레이션
-- ============================================

-- Storage 버킷 생성 (수동으로 Supabase Dashboard에서 생성 필요)
-- 버킷명: homepage-images
-- Public: true
-- 관리자만 업로드 가능하도록 정책 설정

-- ============================================
-- 1. 이미지 슬라이더 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_slider_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  background_color TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL
);

-- ============================================
-- 2. 급상승 프로젝트 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_trending_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  tag TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL
);

-- ============================================
-- 3. 추천 프로필 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_recommended_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  job TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL
);

-- ============================================
-- 4. 새로운 브랜드/아티스트 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_new_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL
);

-- ============================================
-- 5. Bridge Magazine 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_magazines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  tag TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL
);

-- ============================================
-- 6. 인기 공연 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_popular_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  badges TEXT[] DEFAULT '{}',
  thumbnail_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL
);

-- ============================================
-- 7. 주목할 만한 브랜드/아티스트 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.homepage_spotlight_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL
);

-- ============================================
-- 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_homepage_slider_images_order ON public.homepage_slider_images(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_slider_images_active ON public.homepage_slider_images(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_trending_projects_order ON public.homepage_trending_projects(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_trending_projects_active ON public.homepage_trending_projects(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_recommended_profiles_order ON public.homepage_recommended_profiles(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_recommended_profiles_active ON public.homepage_recommended_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_new_brands_order ON public.homepage_new_brands(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_new_brands_active ON public.homepage_new_brands(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_magazines_order ON public.homepage_magazines(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_magazines_active ON public.homepage_magazines(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_popular_events_order ON public.homepage_popular_events(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_popular_events_active ON public.homepage_popular_events(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_spotlight_brands_order ON public.homepage_spotlight_brands(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_spotlight_brands_active ON public.homepage_spotlight_brands(is_active);

-- ============================================
-- 업데이트 시간 자동 갱신 트리거 함수
-- ============================================
CREATE OR REPLACE FUNCTION update_homepage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 생성
CREATE TRIGGER update_homepage_slider_images_updated_at
BEFORE UPDATE ON public.homepage_slider_images
FOR EACH ROW
EXECUTE FUNCTION update_homepage_updated_at();

CREATE TRIGGER update_homepage_trending_projects_updated_at
BEFORE UPDATE ON public.homepage_trending_projects
FOR EACH ROW
EXECUTE FUNCTION update_homepage_updated_at();

CREATE TRIGGER update_homepage_recommended_profiles_updated_at
BEFORE UPDATE ON public.homepage_recommended_profiles
FOR EACH ROW
EXECUTE FUNCTION update_homepage_updated_at();

CREATE TRIGGER update_homepage_new_brands_updated_at
BEFORE UPDATE ON public.homepage_new_brands
FOR EACH ROW
EXECUTE FUNCTION update_homepage_updated_at();

CREATE TRIGGER update_homepage_magazines_updated_at
BEFORE UPDATE ON public.homepage_magazines
FOR EACH ROW
EXECUTE FUNCTION update_homepage_updated_at();

CREATE TRIGGER update_homepage_popular_events_updated_at
BEFORE UPDATE ON public.homepage_popular_events
FOR EACH ROW
EXECUTE FUNCTION update_homepage_updated_at();

CREATE TRIGGER update_homepage_spotlight_brands_updated_at
BEFORE UPDATE ON public.homepage_spotlight_brands
FOR EACH ROW
EXECUTE FUNCTION update_homepage_updated_at();

-- ============================================
-- RLS 활성화
-- ============================================
ALTER TABLE public.homepage_slider_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_trending_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_recommended_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_new_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_magazines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_popular_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_spotlight_brands ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 정책: 모든 사용자가 조회 가능 (웹앱에서 사용)
-- ============================================
CREATE POLICY "Anyone can view homepage slider images"
ON public.homepage_slider_images FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view homepage trending projects"
ON public.homepage_trending_projects FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view homepage recommended profiles"
ON public.homepage_recommended_profiles FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view homepage new brands"
ON public.homepage_new_brands FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view homepage magazines"
ON public.homepage_magazines FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view homepage popular events"
ON public.homepage_popular_events FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Anyone can view homepage spotlight brands"
ON public.homepage_spotlight_brands FOR SELECT
TO public
USING (is_active = true);

-- ============================================
-- RLS 정책: 관리자만 전체 조회 및 CRUD 가능
-- ============================================
-- 슬라이더 이미지
CREATE POLICY "Admins can manage homepage slider images"
ON public.homepage_slider_images FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
);

-- 급상승 프로젝트
CREATE POLICY "Admins can manage homepage trending projects"
ON public.homepage_trending_projects FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
);

-- 추천 프로필
CREATE POLICY "Admins can manage homepage recommended profiles"
ON public.homepage_recommended_profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
);

-- 새로운 브랜드
CREATE POLICY "Admins can manage homepage new brands"
ON public.homepage_new_brands FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
);

-- 매거진
CREATE POLICY "Admins can manage homepage magazines"
ON public.homepage_magazines FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
);

-- 인기 공연
CREATE POLICY "Admins can manage homepage popular events"
ON public.homepage_popular_events FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
);

-- 주목할 만한 브랜드
CREATE POLICY "Admins can manage homepage spotlight brands"
ON public.homepage_spotlight_brands FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'content_management' = ANY(permissions)
  )
);

-- ============================================
-- Storage 버킷 정책 설정 (수동으로 Supabase Dashboard에서 설정 필요)
-- ============================================
-- Storage > Policies > homepage-images 버킷에서 다음 정책 추가:
--
-- 1. 관리자만 업로드 가능:
-- CREATE POLICY "Admins can upload homepage images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'homepage-images' AND
--   EXISTS (
--     SELECT 1 FROM public.admins
--     WHERE profile_id = auth.uid()
--     AND 'content_management' = ANY(permissions)
--   )
-- );
--
-- 2. 모든 사용자가 읽기 가능 (Public):
-- CREATE POLICY "Anyone can view homepage images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'homepage-images');
--
-- 3. 관리자만 삭제 가능:
-- CREATE POLICY "Admins can delete homepage images"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'homepage-images' AND
--   EXISTS (
--     SELECT 1 FROM public.admins
--     WHERE profile_id = auth.uid()
--     AND 'content_management' = ANY(permissions)
--   )
-- );

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '홈페이지 화면 관리 테이블 마이그레이션이 완료되었습니다.';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - 7개 홈페이지 섹션 테이블 생성';
  RAISE NOTICE '  - RLS 정책 설정';
  RAISE NOTICE '  - 인덱스 생성';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '  1. Supabase Dashboard > Storage에서 "homepage-images" 버킷 생성 (Public)';
  RAISE NOTICE '  2. Storage Policies에서 위 주석의 정책 3개 추가';
END $$;












