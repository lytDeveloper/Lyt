# Delete User Account Edge Function

사용자 계정 및 관련 데이터를 완전히 삭제하는 Supabase Edge Function입니다.

## 기능

- 사용자 계정 완전 삭제
- 관련 데이터 자동 삭제:
  - 프로필 데이터 (brands, artists, creatives, fans)
  - 프로젝트 및 협업
  - 메시지 및 알림
  - 팔로우, 좋아요, 댓글, 북마크
  - 신고 내역 및 푸시 토큰
- auth.users에서 사용자 삭제
- 계정 삭제 요청 상태 업데이트

## 배포

### 1. Supabase CLI 설치

```bash
npm install -g supabase
```

### 2. Supabase 프로젝트 링크

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3. Edge Function 배포

```bash
# 단일 함수 배포
supabase functions deploy delete-user-account

# 또는 모든 함수 배포
cd supabase/functions
./deploy.sh
```

## 환경 변수

Edge Function은 다음 환경 변수를 자동으로 사용합니다:

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (관리자 권한)

이 변수들은 Supabase가 자동으로 제공하므로 별도 설정이 필요하지 않습니다.

## API 사용법

### 요청

```typescript
POST https://your-project.supabase.co/functions/v1/delete-user-account
Content-Type: application/json
Authorization: Bearer YOUR_ANON_KEY

{
  "userId": "user-uuid",
  "requestId": "deletion-request-uuid", // 선택
  "reason": "삭제 사유" // 선택
}
```

### 응답

**성공 (200)**:
```json
{
  "success": true,
  "message": "User account deleted successfully",
  "deletedData": {
    "profiles": 4,
    "projects": 2,
    "collaborations": 1,
    "messages": 15,
    "notifications": 30
  }
}
```

**실패 (400/500)**:
```json
{
  "success": false,
  "error": "Error message"
}
```

## 호출 예시

### JavaScript/TypeScript (Supabase Client)

```typescript
import { supabase } from './lib/supabase';

const { data, error } = await supabase.functions.invoke('delete-user-account', {
  body: {
    userId: 'user-uuid',
    requestId: 'deletion-request-uuid',
    reason: '사용 빈도가 낮아요'
  }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}
```

### cURL

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/delete-user-account' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-uuid",
    "requestId": "deletion-request-uuid",
    "reason": "사용 빈도가 낮아요"
  }'
```

## 보안

- Service Role Key를 사용하여 모든 데이터에 접근합니다.
- RLS (Row Level Security) 정책을 우회합니다.
- 관리자 권한으로 auth.users 테이블에 접근합니다.

## 주의사항

⚠️ **이 함수는 영구적으로 데이터를 삭제합니다. 실행 전 반드시 확인하세요!**

- 삭제된 데이터는 복구할 수 없습니다.
- 법적 요구사항에 따라 일부 데이터는 보관해야 할 수 있습니다.
- 프로덕션 환경에서는 신중하게 사용하세요.

## 로깅

Edge Function은 다음과 같은 로그를 생성합니다:

- 계정 삭제 시작
- 각 단계별 삭제 진행 상황
- 삭제된 데이터 카운트
- 오류 발생 시 에러 메시지

로그는 Supabase Dashboard의 Edge Functions 섹션에서 확인할 수 있습니다.

## 문제 해결

### 함수 호출 실패

```bash
# 함수 로그 확인
supabase functions logs delete-user-account

# 함수 재배포
supabase functions deploy delete-user-account
```

### 권한 오류

- Service Role Key가 올바른지 확인
- Supabase 프로젝트 설정에서 Edge Functions가 활성화되어 있는지 확인

### 타임아웃

- 삭제할 데이터가 너무 많으면 타임아웃이 발생할 수 있습니다.
- 필요시 함수를 여러 단계로 나누어 실행하세요.
