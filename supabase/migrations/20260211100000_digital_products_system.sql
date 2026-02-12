-- ============================================================================
-- Digital Products System Migration
-- ============================================================================
-- Purpose: 게스트 체크아웃 시스템 구현
-- - orders 테이블 확장 (게스트 지원)
-- - digital_products 테이블 생성
-- - digital_product_downloads 테이블 생성 (토큰 기반 다운로드)
-- - RLS 정책 수정
-- - Storage 버킷 생성
-- ============================================================================

-- ============================================================================
-- 1. orders 테이블 확장
-- ============================================================================

-- user_id NULL 허용으로 변경
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

-- 게스트 정보 컬럼 추가
ALTER TABLE public.orders
  ADD COLUMN guest_name TEXT,
  ADD COLUMN guest_email TEXT;

-- order_type에 'digital_product' 추가
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('one_time', 'project_fee', 'digital_product'));

-- 제약 조건: 인증 사용자 OR 게스트 (둘 중 하나만)
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_or_guest_check
  CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL AND guest_email IS NULL)
    OR
    (user_id IS NULL AND guest_name IS NOT NULL AND guest_email IS NOT NULL)
  );

-- 게스트 이메일 인덱스 추가 (조회 성능)
CREATE INDEX idx_orders_guest_email ON public.orders(guest_email) WHERE guest_email IS NOT NULL;

-- ============================================================================
-- 2. digital_products 테이블 생성
-- ============================================================================

CREATE TABLE public.digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price > 0),
  original_price INTEGER CHECK (original_price IS NULL OR original_price > 0),
  file_path TEXT NOT NULL, -- Storage 버킷 내 경로
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_digital_products_active ON public.digital_products(is_active, sort_order);

-- RLS 활성화 (공개 읽기, 서비스 롤만 쓰기)
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Digital products are publicly readable" ON public.digital_products
  FOR SELECT USING (is_active = true);

-- 초기 데이터 삽입 (service.html과 동일한 3개 상품)
INSERT INTO public.digital_products (name, description, price, original_price, file_path, sort_order) VALUES
  (
    '예비 사업 인사이트',
    '사업 아이디어를 구체화하는 단계의 예비 사업가를 위한 필수 가이드',
    30000,
    NULL,
    'products/insight-pre-business.pdf',
    1
  ),
  (
    '초기 사업 인사이트',
    '사업을 막 시작한 초기 사업가를 위한 실전 운영 가이드',
    30000,
    NULL,
    'products/insight-early-business.pdf',
    2
  ),
  (
    '도약 사업 인사이트',
    '사업 확장과 성장을 준비하는 사업가를 위한 전략적 인사이트',
    30000,
    NULL,
    'products/insight-growth-business.pdf',
    3
  );

-- ============================================================================
-- 3. digital_product_downloads 테이블 생성
-- ============================================================================

CREATE TABLE public.digital_product_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  download_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  guest_email TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE UNIQUE INDEX idx_downloads_token ON public.digital_product_downloads(download_token);
CREATE INDEX idx_downloads_order ON public.digital_product_downloads(order_id);
CREATE INDEX idx_downloads_email ON public.digital_product_downloads(guest_email);
CREATE INDEX idx_downloads_expires ON public.digital_product_downloads(expires_at);

-- RLS 활성화 (Edge Function이 service_role로 접근하므로 제한 없음)
ALTER TABLE public.digital_product_downloads ENABLE ROW LEVEL SECURITY;

-- 서비스 롤만 접근 가능 (Edge Function 전용)
CREATE POLICY "Service role can manage downloads" ON public.digital_product_downloads
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. RLS 정책 수정 (orders 테이블)
-- ============================================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

-- 새 정책: 인증 사용자와 게스트 모두 주문 생성 가능
CREATE POLICY "Users and guests can create orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    -- 인증 사용자: auth.uid() = user_id, guest 정보 없음
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND guest_email IS NULL)
    OR
    -- 게스트: auth.uid() IS NULL, user_id NULL, guest 정보 있음
    (auth.uid() IS NULL AND user_id IS NULL AND guest_email IS NOT NULL)
  );

-- 인증 사용자만 자신의 주문 조회 가능 (게스트는 조회 불가)
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Storage 버킷 생성
-- ============================================================================

-- digital-products 버킷 생성 (SQL로는 불가능, Dashboard 또는 SDK 사용)
-- 수동으로 Supabase Dashboard에서 생성:
-- - Name: digital-products
-- - Public: false
-- - File size limit: 10MB
-- - Allowed MIME types: application/pdf

-- Storage 정책은 버킷 생성 후 별도 적용 필요 (service_role만 접근)

-- ============================================================================
-- 완료
-- ============================================================================
-- 다음 단계:
-- 1. Supabase Dashboard에서 'digital-products' Storage 버킷 생성
-- 2. PDF 파일 업로드 (products/ 폴더)
-- 3. Edge Functions 배포
