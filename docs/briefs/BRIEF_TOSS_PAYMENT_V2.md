# Execution Brief: 토스페이먼츠 결제 위젯 V2 연동

**Tier:** 3 - Critical Architecture
**Date:** 2026-01-25
**Author:** Opus (ARCHITECT mode)
**Target Environment:** Dev (`xianrhwkdarupnvaumti`)
**Status:** PENDING APPROVAL

---

## 1. Goal & Critical Path

### Goal
하이브리드 앱(Expo + React WebView)에 토스페이먼츠 V2 결제 위젯을 연동하여 일회성 결제 기능 구현

### Critical Path
```
1. DB 스키마 생성 (orders 테이블)
2. Edge Function 배포 (confirm-payment)
3. Webapp 결제 페이지 구현
4. Expo-shell WebView 딥링크 처리
5. E2E 테스트
```

### Success Criteria
- 사용자가 웹앱에서 결제 요청 가능
- 카드앱(ISP 등) 호출 후 앱으로 정상 복귀
- Edge Function에서 결제 승인 완료
- 결제 결과가 DB에 정확히 기록됨

---

## 2. Scope of Change

### ALLOWED (수정 가능)

| 위치 | 파일 | 작업 |
|------|------|------|
| supabase | `migrations/20260125_create_orders_table.sql` | **생성** |
| supabase | `functions/confirm-payment/index.ts` | **생성** |
| webapp | `src/services/paymentService.ts` | **생성** |
| webapp | `src/stores/paymentStore.ts` | **생성** |
| webapp | `src/hooks/useTossPayment.ts` | **생성** |
| webapp | `src/hooks/usePaymentRecovery.ts` | **생성** |
| webapp | `src/pages/payment/CheckoutPage.tsx` | **생성** |
| webapp | `src/pages/payment/PaymentCallbackPage.tsx` | **생성** |
| webapp | `src/types/payment.types.ts` | **생성** |
| webapp | `src/main.tsx` | **수정** - 라우트 2개 추가만 |
| webapp | `src/routes/lazyPages.tsx` | **수정** - lazy import 추가만 |
| webapp | `package.json` | **수정** - SDK 패키지 추가만 |
| webapp | `.env.local` | **수정** - VITE_TOSS_CLIENT_KEY 추가 |
| expo-shell | `App.tsx` | **수정** - onShouldStartLoadWithRequest 핸들러 추가 |
| expo-shell | `app.json` | **수정** - iOS LSApplicationQueriesSchemes + Android manifestQueries 추가 |
| expo-shell | `package.json` | **수정** - expo-build-properties 패키지 추가 |

### FORBIDDEN (수정 금지)

| 파일/영역 | 이유 |
|-----------|------|
| `webapp/vite.config.ts` | 빌드 설정 변경 금지 (CLAUDE.md §6) |
| `webapp/src/lib/supabase.ts` | 기존 인증 로직 변경 금지 |
| `webapp/src/providers/*` | 전역 Provider 구조 변경 금지 |
| `expo-shell/ios/*`, `expo-shell/android/*` | Native 코드 직접 수정 금지 |
| 기존 컴포넌트 리팩토링 | 범위 외 작업 금지 |
| Prod 환경 (`ywaldpxprcusqmfdnlfk`) | Dev 환경에서만 작업 |

---

## 3. Implementation Plan (Diff-focused)

### Phase 1: Database Schema

**파일:** `supabase/migrations/20260125_create_orders_table.sql`

```sql
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
```

### Phase 2: Edge Function

**파일:** `supabase/functions/confirm-payment/index.ts`

**핵심 로직:**
1. Bearer token으로 사용자 인증
2. orderId로 주문 조회 → 소유권 확인
3. **금액 검증** (order.amount === request.amount) - 보안 필수
4. Idempotency key 확인 (중복 요청 방지)
5. 토스 Confirm API 호출 (Secret Key 사용)
6. 성공/실패에 따라 orders 테이블 업데이트
7. Idempotency response 저장

**환경 변수 (Supabase Secrets):**
```bash
# Supabase CLI로 시크릿 설정 (Dev 환경)
npx supabase secrets set TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxx --project-ref xianrhwkdarupnvaumti

# 설정 확인
npx supabase secrets list --project-ref xianrhwkdarupnvaumti
```

### Phase 3: Webapp 수정

**3.1 패키지 설치**
```diff
// webapp/package.json
"dependencies": {
+  "@tosspayments/payment-widget-sdk": "^0.11.0"
}
```

**3.2 환경 변수**
```diff
// webapp/.env.local
+ VITE_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxxxx
```

**3.3 라우트 추가**
```diff
// webapp/src/main.tsx (라우트 섹션에만 추가)
+ <Route path="/checkout" element={<ProtectedRoute><LazyCheckoutPage /></ProtectedRoute>} />
+ <Route path="/payment/callback" element={<ProtectedRoute><LazyPaymentCallbackPage /></ProtectedRoute>} />
```

```diff
// webapp/src/routes/lazyPages.tsx
+ export const LazyCheckoutPage = lazy(() => import('../pages/payment/CheckoutPage'));
+ export const LazyPaymentCallbackPage = lazy(() => import('../pages/payment/PaymentCallbackPage'));
```

### Phase 4: Expo-shell 수정

**4.1 패키지 설치**
```bash
cd expo-shell && npx expo install expo-build-properties
```

> **대안 고려:** 토스가 공식 제공하는 `@tosspayments/widget-sdk-react-native` SDK에는
> `ConvertUrl` 유틸리티가 내장되어 있어 intent:// 파싱 로직을 직접 구현할 필요가 없음.
> 단, 현재 구조(WebView 기반)에서는 webapp에서 결제 위젯을 렌더링하므로
> React Native SDK보다 Web SDK (`@tosspayments/payment-widget-sdk`)가 적합함.
> intent:// 처리만 RN SDK의 `ConvertUrl`을 참고하여 구현.

**4.2 app.json - iOS/Android 결제앱 설정 (토스 공식 문서 기준 전체 목록)**
```diff
// expo-shell/app.json
{
  "expo": {
    "ios": {
      "infoPlist": {
+       "LSApplicationQueriesSchemes": [
+         // 토스페이
+         "supertoss",
+         // 국민카드
+         "kb-acp", "liivbank", "newliiv", "kbbank",
+         // 농협카드
+         "nhappcardansimclick", "nhallonepayansimclick", "nonghyupcardansimclick",
+         // 롯데카드
+         "lottesmartpay", "lotteappcard",
+         // 삼성카드
+         "mpocket.online.ansimclick", "ansimclickscard", "tswansimclick",
+         "ansimclickipcollect", "vguardstart", "samsungpay", "scardcertiapp",
+         "monimopay", "monimopayauth",
+         // 신한카드
+         "shinhan-sr-ansimclick", "smshinhanansimclick",
+         // 우리카드
+         "com.wooricard.wcard", "newsmartpib", "wooripay",
+         // 씨티카드
+         "citispay", "citicardappkr", "citimobileapp",
+         // 하나카드
+         "cloudpay", "hanawalletmembers", "hanaskcardmobileportal",
+         // 현대카드
+         "hdcardappcardansimclick", "smhyundaiansimclick",
+         // 간편결제
+         "shinsegaeeasypayment", "payco", "lpayapp", "lmslpay",
+         // ISP/뱅크페이
+         "ispmobile", "kftc-bankpay", "kb-bankpay",
+         // 본인인증 (통신사 PASS)
+         "tauthlink", "ktauthexternalcall", "upluscorporation",
+         // 카카오/네이버
+         "kakaotalk", "kakaobank", "naversearchthirdlogin"
+       ]
      }
    },
+   "plugins": [
+     [
+       "expo-build-properties",
+       {
+         "android": {
+           "manifestQueries": {
+             "package": [
+               // 카카오/네이버
+               "com.kakao.talk",
+               "com.nhn.android.search",
+               "com.kakaobank.channel",
+               // 삼성페이
+               "com.samsung.android.spay",
+               "com.samsung.android.spaylite",
+               "net.ib.android.smcard",
+               // 신한
+               "com.shinhan.smartcaremgr",
+               "com.shinhan.sbanking",
+               "com.shcard.smartpay",
+               "com.shinhancard.smartshinhan",
+               "com.mobiletoong.travelwallet",
+               // 현대
+               "com.hyundaicard.appcard",
+               "com.lumensoft.touchenappfree",
+               // 삼성카드
+               "kr.co.samsungcard.mpocket",
+               // NH
+               "nh.smart.nhallonepay",
+               // KB
+               "com.kbcard.cxh.appcard",
+               "com.kbstar.liivbank",
+               "com.kbstar.reboot",
+               "com.kbstar.kbbank",
+               // ISP/페이북
+               "kvp.jjy.MispAndroid320",
+               // 롯데
+               "com.lcacApp",
+               "com.lottemembers.android",
+               // 하나
+               "com.hanaskcard.paycla",
+               "com.hanaskcard.rocomo.potal",
+               "kr.co.hanamembers.hmscustomer",
+               // 씨티
+               "kr.co.citibank.citimobile",
+               // 우리
+               "com.wooricard.wpay",
+               "com.wooricard.smartapp",
+               "com.wooribank.smart.npib",
+               // 기타 간편결제
+               "viva.republica.toss",
+               "com.ssg.serviceapp.android.egiftcertificate",
+               "com.nhnent.payapp",
+               "com.lguplus.paynow",
+               "com.lotte.lpay",
+               // 뱅크페이
+               "com.kftc.bankpay.android",
+               // 보안앱 (필수)
+               "com.TouchEn.mVaccine.webs",
+               "kr.co.shiftworks.vguardweb",
+               "com.ahnlab.v3mobileplus"
+             ]
+           }
+         }
+       }
+     ]
+   ]
  }
}
```

**4.3 App.tsx - WebView URL 핸들러 추가**
```diff
// expo-shell/App.tsx
+ import { Linking, Platform } from 'react-native';

// 결제앱 커스텀 스킴 목록 (상수로 분리)
+ const PAYMENT_APP_SCHEMES = [
+   'ispmobile://',
+   'kftc-bankpay://',
+   'kb-acp://',
+   'liivbank://',
+   'mpocket.online.ansimclick://',
+   'lotteappcard://',
+   'shinhan-sr-ansimclick://',
+   'hdcardappcardansimclick://',
+   'nhappcardansimclick://',
+   'cloudpay://',
+   'hanawalletmembers://',
+   'supertoss://',
+   'kakaotalk://',
+   'payco://',
+ ];

// intent:// URL 핸들러 (Android 전용, Play Store fallback 포함)
+ const handleIntentUrl = async (intentUrl: string) => {
+   try {
+     const schemeMatch = intentUrl.match(/scheme=([^;]+)/);
+     const packageMatch = intentUrl.match(/package=([^;]+)/);
+
+     if (schemeMatch) {
+       const scheme = schemeMatch[1];
+       const path = intentUrl.replace('intent://', '').split('#Intent')[0];
+       const schemeUrl = `${scheme}://${path}`;
+
+       const supported = await Linking.canOpenURL(schemeUrl);
+       if (supported) {
+         await Linking.openURL(schemeUrl);
+         return;
+       }
+     }
+
+     // Fallback: Play Store로 이동 (Android only)
+     if (packageMatch && Platform.OS === 'android') {
+       const packageName = packageMatch[1];
+       await Linking.openURL(`market://details?id=${packageName}`);
+     }
+   } catch (error) {
+     console.error('[handleIntentUrl] Error:', error);
+   }
+ };

// WebView URL 요청 핸들러
+ const handleShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
+   const { url } = request;
+   console.log('[WebView] Navigation request:', url);
+
+   // 일반 웹 URL 허용
+   if (url.startsWith('http://') || url.startsWith('https://')) {
+     return true;
+   }
+
+   // intent:// 스킴 처리 (Android 카드앱)
+   if (url.startsWith('intent://')) {
+     handleIntentUrl(url);
+     return false;
+   }
+
+   // 카드앱 커스텀 스킴 처리
+   if (PAYMENT_APP_SCHEMES.some(scheme => url.startsWith(scheme))) {
+     Linking.openURL(url).catch(err => {
+       console.error('[WebView] Failed to open payment app:', err);
+     });
+     return false;
+   }
+
+   // 기타 스킴은 시스템에 위임
+   Linking.openURL(url).catch(console.error);
+   return false;
+ }, []);

// WebView 컴포넌트에 prop 추가
<WebView
  ...existing props...
+ onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
+ // 결제 세션 쿠키 유지를 위한 설정
+ sharedCookiesEnabled={true}           // iOS: 앱과 WebView 간 쿠키 공유
+ thirdPartyCookiesEnabled={true}       // Android: 서드파티 쿠키 허용
/>
```

### Phase 5: 결제 상태 복구 (앱 종료 후 복귀 시)

**문제:** 사용자가 카드앱에서 결제 중 앱이 종료되면 결제 상태를 잃어버릴 수 있음

**해결:** Webapp에서 앱 복귀 시 pending 상태 주문 확인

**파일:** `webapp/src/hooks/usePaymentRecovery.ts`
```typescript
// 앱 복귀 시 pending 주문 확인 및 처리
export function usePaymentRecovery() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // pending 상태 주문 확인
        const pendingOrders = await getPendingOrders();
        if (pendingOrders.length > 0) {
          // 가장 최근 pending 주문의 상태 확인
          // 토스에서 이미 승인됐으나 우리 서버에 반영 안 된 경우 처리
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
```

**파일:** `webapp/src/services/paymentService.ts`에 추가
```typescript
// pending 상태 주문 조회
export async function getPendingOrders(): Promise<Order[]> {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'payment_requested')
    .order('created_at', { ascending: false })
    .limit(1);
  return data || [];
}
```

---

## 4. Constraints & Invariants

### Security Invariants (절대 위반 금지)
1. **Secret Key**: `TOSS_SECRET_KEY`는 Edge Function 환경변수에만 존재
2. **금액 검증**: 서버에서 `order.amount === request.amount` 필수 확인
3. **RLS 적용**: orders 테이블은 RLS 활성화, 사용자는 자신의 주문만 접근
4. **Idempotency**: 동일 paymentKey+orderId 조합은 한 번만 처리

### Technical Constraints
1. Expo Managed Workflow 유지 (Native 코드 직접 수정 금지)
2. 기존 빌드 설정 변경 금지 (vite.config.ts)
3. 기존 인증/세션 로직 변경 금지

### Build Constraints
> **중요:** `LSApplicationQueriesSchemes` (iOS)와 `manifestQueries` (Android) 설정은
> **Expo Go에서는 동작하지 않음**. 반드시 **Development Build** 또는 **Production Build**로 테스트해야 함.
>
> ```bash
> # Development Build 생성
> cd expo-shell && eas build --profile development --platform all
> ```

### API Constraints
- 토스 Confirm API: `POST https://api.tosspayments.com/v1/payments/confirm`
- 인증: `Basic {base64(secretKey:)}`
- Body: `{ paymentKey, orderId, amount }`

---

## 5. Risk & Validation Checklist

### High Risk
| 리스크 | 완화 방안 | 검증 방법 |
|--------|----------|----------|
| 금액 변조 | 서버에서 DB 금액과 요청 금액 비교 | 다른 금액으로 confirm 시도 → 거부 확인 |
| 중복 결제 | Idempotency key로 중복 요청 차단 | 동일 요청 2회 전송 → 1회만 처리 확인 |
| Secret Key 노출 | Edge Function에만 저장 | 클라이언트 번들 검사 |

### Medium Risk
| 리스크 | 완화 방안 | 검증 방법 |
|--------|----------|----------|
| 카드앱 미설치 | Linking.canOpenURL 체크 후 안내 | ISP 미설치 기기에서 테스트 |
| 앱 백그라운드 중 결제 완료 | 콜백 URL로 상태 복구 | 결제 중 앱 종료 후 재진입 테스트 |
| intent:// 파싱 실패 | fallback으로 Play Store 열기 | 다양한 intent URL 테스트 |

### Validation Checklist

**Database & Edge Function**
- [ ] orders 테이블 RLS 정책 적용 확인
- [ ] Edge Function CORS 설정 확인
- [ ] Supabase Secret (TOSS_SECRET_KEY) 설정 확인
- [ ] 금액 불일치 시 거부 확인
- [ ] 중복 요청 시 idempotency 동작 확인

**결제 플로우**
- [ ] 테스트 카드로 정상 결제 확인 (4330000004300004)
- [ ] 결제 취소 플로우 확인
- [ ] 결제 중 앱 종료 후 복귀 시 상태 복구 확인

**iOS (실기기 필수)**
- [ ] 카드앱 스킴 호출 확인 (ISP, KB Pay 등)
- [ ] 앱 미설치 시 App Store 이동 확인
- [ ] WebView 쿠키 유지 확인

**Android (실기기 필수)**
- [ ] intent:// URL 파싱 및 앱 호출 확인
- [ ] 앱 미설치 시 Play Store fallback 확인
- [ ] 보안앱 (TouchEn, V-Guard) 호출 확인
- [ ] WebView 쿠키 유지 확인

---

## 6. Non-Goals

이 Brief 범위에서 **명시적으로 제외**:

1. **정기 구독/빌링키**: 일회성 결제만 구현
2. **결제 취소/환불 API**: 추후 별도 Brief로 처리
3. **결제 내역 조회 UI**: 기본 콜백 페이지만 구현
4. **관리자 백오피스 연동**: 추후 작업
5. **Prod 환경 배포**: Dev 환경에서만 작업
6. **알림톡/문자 연동**: 범위 외
7. **기존 코드 리팩토링**: 신규 파일만 생성

---

## 7. Approval

이 Execution Brief의 승인을 요청합니다.

- [ ] **사용자 승인** (필수)
- [ ] 보안 항목 검토 완료
- [ ] 범위 제한 확인

**승인 후 구현을 시작합니다.**
