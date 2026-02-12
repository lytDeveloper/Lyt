# 디지털 상품 게스트 체크아웃 테스트 체크리스트

## 환경: Dev (xianrhwkdarupnvaumti.supabase.co)

---

## ✅ 사전 준비

### 1. Edge Functions 환경 변수 확인
Supabase Dashboard > Settings > Edge Functions > Environment Variables

- [ ] `RESEND_API_KEY`: 이메일 발송용 (send-digital-product-email)
- [ ] `TOSS_SECRET_KEY`: 결제 확인용 (confirm-payment)
- [ ] `APP_URL`: https://app.lyt-app.io (다운로드 링크 생성용)

### 2. Storage 파일 확인
Supabase Dashboard > Storage > digital-products

- [ ] `1. pre-insights.pdf` (예비 사업 인사이트)
- [ ] `2. initial-insights.pdf` (초기 사업 인사이트)
- [ ] `3. leap-insights.pdf` (도약 사업 인사이트)

### 3. TossPayments 테스트 모드 확인
- [ ] Test Secret Key 사용 중
- [ ] Test Client Key 사용 중 (`webapp/.env.local`의 `VITE_TOSS_CLIENT_KEY`)

---

## 📋 테스트 시나리오

### Scenario 1: 정상 구매 플로우 (게스트)

**1. Landing Page 접속**
- URL: `https://lyt-app.io/service.html` (또는 로컬)
- [ ] 3개 상품 카드가 정상 표시됨
- [ ] "구매하기" 버튼이 표시됨 (기존: "파일 다운받기")

**2. 구매 버튼 클릭**
- [ ] 게스트 정보 입력 모달이 나타남
- [ ] 이름, 이메일, 개인정보 동의 체크박스 표시
- [ ] 상품명과 가격이 올바르게 표시됨 (30,000원)

**3. 게스트 정보 입력**
- 테스트 데이터:
  - 이름: `테스트사용자`
  - 이메일: `[실제 이메일 주소]` (다운로드 링크 수신용)
- [ ] 필수 항목 미입력 시 에러 메시지 표시
- [ ] 이메일 형식 검증 작동
- [ ] 개인정보 동의 미체크 시 제출 불가

**4. CheckoutPage 이동**
- URL 파라미터 확인:
  - `orderName=예비 사업 인사이트`
  - `orderType=digital_product`
  - `amount=30000`
  - `relatedId=[상품 UUID]`
  - `guestMode=true`
  - `guestName=테스트사용자`
  - `guestEmail=[이메일]`
- [ ] CheckoutPage에 게스트 정보 표시: "Guest purchase: 테스트사용자 (이메일)"
- [ ] TossPayments 위젯이 정상 로드됨
- [ ] 주문 요약 정보가 올바름

**5. 결제 진행 (TossPayments Test Mode)**
- [ ] 결제 수단 선택 (카드)
- [ ] 테스트 카드 정보 입력:
  - 카드번호: `5570-1234-1234-1234`
  - 유효기간: `12/25`
  - CVC: `123`
- [ ] "Pay Now" 버튼 클릭
- [ ] TossPayments 결제창 정상 작동

**6. 결제 승인**
- [ ] confirm-payment Edge Function 호출 성공
- [ ] Console에서 로그 확인:
  ```
  [confirm-payment] Download token created: [UUID]
  ```
- [ ] orders 테이블에 레코드 생성됨 (status: confirmed)
  - `user_id`: NULL
  - `guest_name`: 테스트사용자
  - `guest_email`: [이메일]
  - `order_type`: digital_product
- [ ] digital_product_downloads 테이블에 레코드 생성됨
  - `download_token`: [UUID]
  - `expires_at`: 30일 후
  - `download_count`: 0

**7. 이메일 수신**
- [ ] 이메일이 1-2분 내 수신됨
- [ ] 제목: `[Lyt] [상품명] 다운로드 안내`
- [ ] 본문에 다운로드 버튼 표시
- [ ] 다운로드 링크 형식: `https://app.lyt-app.io/download?token=[UUID]`
- [ ] 안내사항 표시 (30일 유효, 만료 후 불가 등)

**8. 다운로드 페이지 접속**
- 이메일의 다운로드 링크 클릭
- [ ] DownloadPage가 로드됨
- [ ] "다운로드 준비 완료" 메시지 표시
- [ ] "다운로드" 버튼 표시
- [ ] 안내사항 (30일 유효 등) 표시

**9. 파일 다운로드**
- "다운로드" 버튼 클릭
- [ ] download-digital-product Edge Function 호출 성공
- [ ] PDF 파일 다운로드 시작
- [ ] 파일명: `[상품명].pdf` (한글 정상 표시)
- [ ] 파일 크기 확인:
  - 예비: ~192KB
  - 초기: ~54KB
  - 도약: ~116KB
- [ ] PDF 파일이 정상적으로 열림

**10. 다운로드 횟수 증가**
- Supabase Dashboard > digital_product_downloads 테이블 확인
- [ ] `download_count`: 1로 증가
- [ ] `last_downloaded_at`: 현재 시각

---

### Scenario 2: 다운로드 재시도 (같은 토큰)

**1. 다시 다운로드 시도**
- 같은 이메일 링크로 다시 접속
- [ ] DownloadPage 정상 표시
- [ ] 다운로드 버튼 클릭
- [ ] 파일 다운로드 성공
- [ ] `download_count`: 2로 증가

**2. 여러 번 다운로드**
- [ ] 횟수 제한 없이 다운로드 가능 (현재 Phase 1 스펙)

---

### Scenario 3: 에러 시나리오

**1. 잘못된 토큰**
- URL: `https://app.lyt-app.io/download?token=invalid-token`
- [ ] "다운로드 실패" 화면 표시
- [ ] 에러 메시지: "Invalid or expired download token"
- [ ] "홈으로 돌아가기" 버튼 표시

**2. 토큰 없음**
- URL: `https://app.lyt-app.io/download`
- [ ] "다운로드 실패" 화면 표시
- [ ] 에러 메시지: "다운로드 토큰이 없습니다."

**3. 만료된 토큰 (테스트 불가, 수동 DB 수정 필요)**
- digital_product_downloads 테이블에서 `expires_at`를 과거로 변경
- [ ] "다운로드 실패" 화면 표시
- [ ] 에러 메시지: "Download link has expired" (410 Gone)

**4. 결제 미완료 주문**
- orders 테이블에서 status를 'pending'으로 변경
- [ ] "다운로드 실패" 화면 표시
- [ ] 에러 메시지: "Payment not completed" (403 Forbidden)

**5. 존재하지 않는 파일**
- digital_products 테이블의 `file_path`를 잘못된 경로로 변경
- [ ] "다운로드 실패" 화면 표시
- [ ] 에러 메시지: "File not found" (404)

**6. 결제 실패**
- TossPayments 테스트 결제에서 "결제 취소" 선택
- [ ] orders 테이블 status: 'cancelled'
- [ ] digital_product_downloads 레코드 생성 안됨
- [ ] 이메일 발송 안됨

---

### Scenario 4: 보안 테스트

**1. 게스트가 다른 사용자 주문 조회 시도**
- Supabase Client로 직접 조회:
  ```javascript
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', '[다른 주문 ID]');
  ```
- [ ] RLS 정책에 의해 조회 불가 (auth.uid() = user_id 조건)
- [ ] 게스트 주문은 조회 불가 (user_id가 NULL)

**2. 무작위 토큰으로 다운로드 시도**
- 무작위 UUID 생성하여 다운로드 시도
- [ ] 404 에러 반환
- [ ] 파일 다운로드 불가

**3. 중복 결제 시도 (Idempotency)**
- 같은 idempotencyKey로 여러 번 confirm-payment 호출
- [ ] 첫 번째 요청만 처리됨
- [ ] 이후 요청은 캐시된 응답 반환
- [ ] 중복 주문 생성 안됨

---

### Scenario 5: 인증 사용자 구매 (기존 기능 호환성)

**1. 로그인 후 구매**
- 로그인 상태에서 CheckoutPage 접속
- [ ] 인증 사용자로 주문 생성됨
- [ ] orders 테이블:
  - `user_id`: [사용자 UUID]
  - `guest_name`: NULL
  - `guest_email`: NULL
- [ ] 기존 결제 플로우 정상 작동

---

## 🐛 알려진 이슈 / 제한사항

### Phase 1 제한사항 (설계상 의도된 사항)
1. 다운로드 횟수 제한 없음 (Phase 2에서 구현 예정)
2. 환불 자동화 없음 (수동 처리)
3. 구매 내역 조회 기능 없음 (게스트는 이메일로만 접근)
4. 워터마크 없음 (Phase 2에서 고려)

### 잠재적 이슈
1. **이메일 전송 실패**
   - Resend API 장애 시 이메일 발송 실패
   - 하지만 주문은 성공 처리됨 (digital_product_downloads에 토큰 저장)
   - 수동으로 이메일 재전송 가능 (관리자)

2. **파일 불법 공유**
   - 구매자가 다운로드 링크를 공유할 수 있음
   - 토큰 만료 시간 30일 (단기적 완화)
   - IP 추적, 다운로드 제한 등은 Phase 2

3. **게스트 주문 스팸**
   - 게스트가 무제한으로 주문 생성 가능 (결제 전)
   - TossPayments가 결제 단계에서 검증
   - Edge Function Rate Limiting (Supabase 자체)

---

## 📊 데이터베이스 확인 쿼리

### 주문 확인
```sql
SELECT
  id,
  user_id,
  guest_name,
  guest_email,
  order_name,
  order_type,
  amount,
  status,
  created_at
FROM orders
WHERE order_type = 'digital_product'
ORDER BY created_at DESC
LIMIT 10;
```

### 다운로드 토큰 확인
```sql
SELECT
  d.id,
  d.download_token,
  d.guest_email,
  d.expires_at,
  d.download_count,
  d.last_downloaded_at,
  d.email_sent_at,
  o.order_name,
  o.status,
  p.name as product_name
FROM digital_product_downloads d
JOIN orders o ON d.order_id = o.id
JOIN digital_products p ON d.product_id = p.id
ORDER BY d.created_at DESC
LIMIT 10;
```

### 만료 예정 토큰 확인
```sql
SELECT
  download_token,
  guest_email,
  expires_at,
  download_count
FROM digital_product_downloads
WHERE expires_at > NOW()
  AND expires_at < NOW() + INTERVAL '3 days'
ORDER BY expires_at;
```

---

## ✅ 테스트 완료 체크리스트

### 필수 테스트
- [ ] Scenario 1: 정상 구매 플로우 (게스트) - 전체 통과
- [ ] Scenario 2: 다운로드 재시도 - 통과
- [ ] Scenario 3: 에러 시나리오 - 최소 3개 통과
- [ ] Scenario 4: 보안 테스트 - 통과
- [ ] Scenario 5: 인증 사용자 구매 - 기존 기능 정상 작동

### 선택 테스트
- [ ] 3개 상품 모두 구매 및 다운로드 테스트
- [ ] 다양한 이메일 주소로 테스트
- [ ] 모바일 브라우저에서 테스트
- [ ] 다양한 브라우저에서 테스트 (Chrome, Safari, Firefox)

---

## 🚀 Prod 배포 전 체크리스트

Dev 환경 테스트 완료 후:

- [ ] 모든 필수 테스트 통과
- [ ] 알려진 이슈 없음 또는 수용 가능
- [ ] Prod 환경 변수 설정 (ywaldpxprcusqmfdnlfk)
  - [ ] RESEND_API_KEY (Prod 키)
  - [ ] TOSS_SECRET_KEY (Prod 키)
  - [ ] APP_URL: https://app.lyt-app.io
- [ ] Prod Storage 버킷 생성 및 파일 업로드
- [ ] Prod Migration 적용
- [ ] Prod Edge Functions 배포
- [ ] Prod 환경에서 1회 테스트 (실제 카드 사용 주의)

---

## 📝 테스트 결과 기록

| 날짜 | 테스터 | Scenario | 결과 | 비고 |
|------|--------|----------|------|------|
| 2026-02-11 | | Scenario 1 | | |
| | | Scenario 2 | | |
| | | Scenario 3 | | |
| | | Scenario 4 | | |
| | | Scenario 5 | | |

---

## 🔧 문제 발생 시 디버깅

### Edge Function 로그 확인
```bash
# Supabase CLI
supabase functions logs confirm-payment
supabase functions logs download-digital-product
supabase functions logs send-digital-product-email

# 또는 Dashboard
# Supabase Dashboard > Edge Functions > [Function Name] > Logs
```

### 브라우저 Console 로그
- CheckoutPage: `[CheckoutPage]`, `[useTossPayment]`, `[paymentService]` 로그 확인
- DownloadPage: `[DownloadPage]` 로그 확인

### 네트워크 탭
- Edge Function 호출 확인
- 응답 상태 코드 확인
- 에러 메시지 확인

---

**테스트 시작일**: 2026-02-11
**예상 소요 시간**: 1-2시간
