-- orders 테이블 생성
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_name TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('one_time', 'project_fee')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'payment_requested', 'confirmed', 'completed', 'failed', 'cancelled')),
  toss_order_id TEXT UNIQUE NOT NULL,
  payment_key TEXT UNIQUE,
  payment_method TEXT,
  related_id UUID,
  related_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  payment_requested_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT
);

-- 인덱스
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_toss_order_id ON public.orders(toss_order_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 주문만 조회/생성 가능
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- idempotency_keys 테이블 (중복 결제 방지)
CREATE TABLE public.payment_idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_idempotency_expires ON public.payment_idempotency_keys(expires_at);

ALTER TABLE public.payment_idempotency_keys ENABLE ROW LEVEL SECURITY;
