-- Shop Feature Tables Migration
-- Created: 2026-01-26

-- 1. 상품 카탈로그
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('decoration', 'chat_ticket', 'explore_boost')),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,  -- KRW
  original_price INTEGER,  -- 할인 전 가격 (nullable)
  metadata JSONB NOT NULL DEFAULT '{}',
  -- decoration: { type: 'frame'|'background'|'badge'|'skin', style: string, imageUrl?: string }
  -- chat_ticket: { quantity: number }
  -- explore_boost: { rank: 1-5, days: 30|60 }
  badge_text TEXT,  -- e.g., '인기 상품', '최고 가성비'
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 사용자 인벤토리 (구매한 아이템)
CREATE TABLE public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id),
  order_id UUID REFERENCES public.orders(id),
  quantity INTEGER DEFAULT 1,  -- 채팅권 잔여 횟수
  expires_at TIMESTAMPTZ,  -- 기간제 아이템 만료일
  is_equipped BOOLEAN DEFAULT false,  -- 장착 상태 (decoration)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인벤토리 인덱스
CREATE INDEX idx_user_inventory_user_id ON public.user_inventory(user_id);
CREATE INDEX idx_user_inventory_product_id ON public.user_inventory(product_id);

-- 3. 탐색 부스트 (상단 노출)
-- GIST 인덱스 대신 트리거를 사용하여 중복 방지 구현
CREATE TABLE public.explore_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL CHECK (rank_position BETWEEN 1 AND 5),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 시작 시간은 종료 시간보다 앞서야 함
  CONSTRAINT check_dates CHECK (starts_at < ends_at)
);

-- 부스트 인덱스
CREATE INDEX idx_explore_boosts_user_id ON public.explore_boosts(user_id);
CREATE INDEX idx_explore_boosts_ends_at ON public.explore_boosts(ends_at);
-- 활성 부스트 빠른 조회를 위한 인덱스 (WHERE 절 제거)
CREATE INDEX idx_explore_boosts_active ON public.explore_boosts(rank_position, ends_at);

-- 중복 부스트 방지 트리거 함수
CREATE OR REPLACE FUNCTION check_explore_boost_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- 동일한 순위에 대해 기간이 겹치는 다른 활성 부스트가 있는지 확인
  IF EXISTS (
    SELECT 1 FROM public.explore_boosts
    WHERE rank_position = NEW.rank_position
      AND id != NEW.id -- 자기 자신 제외 (UPDATE 시)
      AND ends_at > NOW() -- 이미 만료된 건 무시
      AND (
        (starts_at, ends_at) OVERLAPS (NEW.starts_at, NEW.ends_at)
      )
  ) THEN
    RAISE EXCEPTION '해당 순위(%위)는 이미 다른 사용자가 점유 중입니다.', NEW.rank_position;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 연결
CREATE TRIGGER trigger_check_explore_boost_overlap
  BEFORE INSERT OR UPDATE ON public.explore_boosts
  FOR EACH ROW
  EXECUTE FUNCTION check_explore_boost_overlap();

-- 4. 채팅 횟수 추적 (user별 잔여 횟수)
CREATE TABLE public.user_chat_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  remaining_credits INTEGER NOT NULL DEFAULT 1000,  -- 기본 무료 1000회
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS Policies
-- ============================================

-- shop_products: 누구나 활성 상품 조회 가능
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.shop_products
  FOR SELECT USING (is_active = true);

-- user_inventory: 본인 인벤토리만 조회/수정
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own inventory" ON public.user_inventory
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own inventory" ON public.user_inventory
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own inventory" ON public.user_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- explore_boosts: 활성 부스트는 누구나 조회 (탐색 정렬용), 본인만 생성
ALTER TABLE public.explore_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active boosts" ON public.explore_boosts
  FOR SELECT USING (ends_at > NOW());
CREATE POLICY "Users create own boosts" ON public.explore_boosts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_chat_credits: 본인만 조회/수정
ALTER TABLE public.user_chat_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own credits" ON public.user_chat_credits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own credits" ON public.user_chat_credits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own credits" ON public.user_chat_credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 초기 상품 데이터 (Seed)
-- ============================================

INSERT INTO public.shop_products (category, name, description, price, original_price, metadata, badge_text, sort_order) VALUES
-- Decoration Items (₩1,500 each)
('decoration', '골드 프레임', '프로필 카드에 골드 테두리 적용', 1500, NULL, '{"type":"frame","style":"gold"}', NULL, 1),
('decoration', '실버 프레임', '프로필 카드에 실버 테두리 적용', 1500, NULL, '{"type":"frame","style":"silver"}', NULL, 2),
('decoration', '네온 프레임', '프로필 카드에 네온 테두리 적용', 1500, NULL, '{"type":"frame","style":"neon"}', '인기', 3),
('decoration', '그라데이션 배경', '프로필 상세에 그라데이션 배경 적용', 1500, NULL, '{"type":"background","style":"gradient"}', NULL, 4),
('decoration', '파티클 배경', '프로필 상세에 파티클 효과 적용', 1500, NULL, '{"type":"background","style":"particles"}', NULL, 5),
('decoration', '스타 뱃지', '프로필에 스타 뱃지 표시', 1500, NULL, '{"type":"badge","style":"star"}', NULL, 6),
('decoration', '크라운 뱃지', '프로필에 크라운 뱃지 표시', 1500, NULL, '{"type":"badge","style":"crown"}', NULL, 7),
('decoration', '다이아 카드 스킨', '프로필 카드에 다이아 스킨 적용', 1500, NULL, '{"type":"skin","style":"diamond"}', 'NEW', 8),

-- Chat Tickets
('chat_ticket', '채팅권 20회', '채팅방 개설 20회 추가', 15900, NULL, '{"quantity":20}', NULL, 1),
('chat_ticket', '채팅권 50회', '채팅방 개설 50회 추가', 25900, NULL, '{"quantity":50}', '인기 상품', 2),
('chat_ticket', '채팅권 100회', '채팅방 개설 100회 추가', 35900, NULL, '{"quantity":100}', '최고 가성비', 3),

-- Explore Boosts (Rank 1)
('explore_boost', '1위 노출 30일', '탐색 파트너 탭 1위 노출 30일', 9900, NULL, '{"rank":1,"days":30}', NULL, 1),
('explore_boost', '1위 노출 60일', '탐색 파트너 탭 1위 노출 60일', 16900, NULL, '{"rank":1,"days":60}', NULL, 2),
-- Explore Boosts (Rank 2: ~15% cheaper)
('explore_boost', '2위 노출 30일', '탐색 파트너 탭 2위 노출 30일', 8400, NULL, '{"rank":2,"days":30}', NULL, 3),
('explore_boost', '2위 노출 60일', '탐색 파트너 탭 2위 노출 60일', 14400, NULL, '{"rank":2,"days":60}', NULL, 4),
-- Explore Boosts (Rank 3: ~30% cheaper)
('explore_boost', '3위 노출 30일', '탐색 파트너 탭 3위 노출 30일', 6900, NULL, '{"rank":3,"days":30}', NULL, 5),
('explore_boost', '3위 노출 60일', '탐색 파트너 탭 3위 노출 60일', 11800, NULL, '{"rank":3,"days":60}', NULL, 6),
-- Explore Boosts (Rank 4: ~45% cheaper)
('explore_boost', '4위 노출 30일', '탐색 파트너 탭 4위 노출 30일', 5400, NULL, '{"rank":4,"days":30}', NULL, 7),
('explore_boost', '4위 노출 60일', '탐색 파트너 탭 4위 노출 60일', 9300, NULL, '{"rank":4,"days":60}', NULL, 8),
-- Explore Boosts (Rank 5: ~60% cheaper)
('explore_boost', '5위 노출 30일', '탐색 파트너 탭 5위 노출 30일', 4000, NULL, '{"rank":5,"days":30}', NULL, 9),
('explore_boost', '5위 노출 60일', '탐색 파트너 탭 5위 노출 60일', 6800, NULL, '{"rank":5,"days":60}', NULL, 10);

-- ============================================
-- Helper Functions
-- ============================================

-- 활성 부스트 사용자 조회 함수 (탐색 페이지용)
CREATE OR REPLACE FUNCTION public.get_active_boosted_partners()
RETURNS TABLE (
  user_id UUID,
  rank_position INTEGER,
  ends_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT eb.user_id, eb.rank_position, eb.ends_at
  FROM public.explore_boosts eb
  WHERE eb.ends_at > NOW()
  ORDER BY eb.rank_position ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 채팅 크레딧 차감 함수
CREATE OR REPLACE FUNCTION public.use_chat_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- 현재 크레딧 조회 (없으면 기본값으로 생성)
  INSERT INTO public.user_chat_credits (user_id, remaining_credits)
  VALUES (p_user_id, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT remaining_credits INTO v_remaining
  FROM public.user_chat_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_remaining <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_chat_credits
  SET remaining_credits = remaining_credits - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 채팅 크레딧 추가 함수 (구매 시)
CREATE OR REPLACE FUNCTION public.add_chat_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_new_credits INTEGER;
BEGIN
  INSERT INTO public.user_chat_credits (user_id, remaining_credits)
  VALUES (p_user_id, 1000 + p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET remaining_credits = user_chat_credits.remaining_credits + p_amount,
      updated_at = NOW();

  SELECT remaining_credits INTO v_new_credits
  FROM public.user_chat_credits
  WHERE user_id = p_user_id;

  RETURN v_new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
