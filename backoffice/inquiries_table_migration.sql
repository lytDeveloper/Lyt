-- ============================================
-- 문의사항 테이블 생성 마이그레이션
-- ============================================

CREATE TABLE IF NOT EXISTS public.inquiries (
  inquiry_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('ban_appeal', 'general', 'technical', 'payment', 'other')),
  subject TEXT NOT NULL,
  contents TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  manager_profile_id UUID REFERENCES public.admins(profile_id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  answer_content TEXT,
  attachments JSONB DEFAULT '[]'::JSONB
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON public.inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_manager_profile_id ON public.inquiries(manager_profile_id);

-- RLS 활성화
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 문의사항 조회 및 생성 가능
CREATE POLICY "Users can view their own inquiries"
ON public.inquiries FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create inquiries"
ON public.inquiries FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 관리자는 모든 문의사항 조회 및 업데이트 가능
CREATE POLICY "Admins can view all inquiries"
ON public.inquiries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'inquiry_management' = ANY(permissions)
  )
);

CREATE POLICY "Admins can update inquiries"
ON public.inquiries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'inquiry_management' = ANY(permissions)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE profile_id = auth.uid()
    AND 'inquiry_management' = ANY(permissions)
  )
);

-- username 자동 업데이트 트리거 (선택사항)
CREATE OR REPLACE FUNCTION update_inquiry_username()
RETURNS TRIGGER AS $$
BEGIN
  -- username이 없거나 변경된 경우 프로필에서 가져오기
  IF NEW.username IS NULL OR NEW.username = '' THEN
    SELECT username INTO NEW.username
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- username이 여전히 없으면 nickname 조회 시도
    IF NEW.username IS NULL OR NEW.username = '' THEN
      SELECT COALESCE(
        (SELECT nickname FROM public.profile_artists WHERE profile_id = NEW.user_id LIMIT 1),
        (SELECT nickname FROM public.profile_brands WHERE profile_id = NEW.user_id LIMIT 1),
        (SELECT nickname FROM public.profile_creatives WHERE profile_id = NEW.user_id LIMIT 1),
        (SELECT nickname FROM public.profile_fans WHERE profile_id = NEW.user_id LIMIT 1)
      ) INTO NEW.username;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_inquiry_username
BEFORE INSERT OR UPDATE ON public.inquiries
FOR EACH ROW
EXECUTE FUNCTION update_inquiry_username();

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '문의사항 테이블 마이그레이션이 완료되었습니다.';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  - public.inquiries 테이블 생성';
  RAISE NOTICE '  - RLS 정책 설정';
  RAISE NOTICE '  - username 자동 업데이트 트리거 생성';
END $$;



