# Bridge 백오피스 설정 가이드

## 1. 데이터베이스 설정

### Supabase SQL 실행

1. Supabase Dashboard > SQL Editor로 이동
2. `supabase_setup.sql` 파일의 내용을 복사하여 실행
3. 모든 테이블과 정책이 정상적으로 생성되었는지 확인

### 관리자 계정 생성

데이터베이스 설정 후, 최초 관리자 계정을 생성해야 합니다:

#### 1단계: Supabase에서 사용자 생성

1. Supabase Dashboard > Authentication > Users로 이동
2. "Add user" 버튼 클릭
3. 관리자 이메일과 비밀번호 입력하여 사용자 생성
4. 생성된 사용자의 UUID를 복사

#### 2단계: admins 테이블에 추가

Supabase Dashboard > SQL Editor에서 다음 쿼리 실행:

```sql
INSERT INTO public.admins (profile_id, email, role)
VALUES (
  'your-user-uuid-here',  -- 1단계에서 복사한 UUID
  'admin@example.com',     -- 관리자 이메일
  'super_admin'            -- 역할 (super_admin 또는 admin)
);
```

#### 확인

```sql
SELECT * FROM public.admins;
```

## 2. 환경 변수 설정

### .env 파일 생성

```bash
cp .env.example .env
```

### .env 파일 수정

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
# 백오피스 URL (비밀번호 재설정 시 리다이렉트용)
# 예: 로컬 개발 - http://localhost:5173
# 예: 프로덕션 - https://backoffice.yourdomain.com
VITE_BACKOFFICE_URL=http://localhost:5173
```

Supabase 정보는 Dashboard > Settings > API에서 확인할 수 있습니다.

### Supabase Auth 설정 (중요)

비밀번호 재설정 기능이 정상 작동하려면 Supabase 대시보드에서 리다이렉트 URL을 설정해야 합니다:

1. Supabase Dashboard > Authentication > URL Configuration으로 이동
2. **Redirect URLs**에 백오피스 URL 추가:
   - 로컬 개발: `http://localhost:5173/auth/reset`
   - 스테이징: `https://your-backoffice-staging-url.vercel.app/auth/reset`
   - 프로덕션: `https://your-backoffice-production-url.com/auth/reset`
3. 여러 URL을 추가하려면 줄바꿈으로 구분
4. **Site URL**은 메인 앱(webapp) URL로 유지해도 됩니다 (백오피스와 별개)

**주의**: `VITE_BACKOFFICE_URL`을 설정하지 않으면 자동으로 현재 브라우저의 origin이 사용됩니다.

## 3. 패키지 설치

```bash
npm install
```

## 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

## 5. 로그인

1단계에서 생성한 관리자 계정으로 로그인합니다.

## 주요 기능

### 대시보드
- 전체 사용자 통계
- 아티스트/브랜드/크리에이티브/팬 수
- 승인 대기 중인 크리에이티브 수
- 최근 7일 신규 가입자 추세 차트
- 사용자 타입별 분포 차트
- 최근 가입자 목록 (10명)

### 사용자 관리
- 아티스트 탭: 전체 아티스트 목록 및 상세 정보
- 브랜드 탭: 전체 브랜드 목록 및 상세 정보
- 크리에이티브 탭: 전체 크리에이티브 목록 및 승인 상태
- 팬 탭: 전체 팬 목록 및 상세 정보
- 검색 기능
- 상세보기 모달

### 승인 관리
- 승인 대기 중인 크리에이티브 목록
- 승인/거절 기능
- 상세 정보 확인
- SNS 채널 링크 바로가기

## 트러블슈팅

### 로그인이 안 되는 경우
1. admins 테이블에 계정이 정상적으로 등록되었는지 확인
2. 브라우저 콘솔에서 에러 메시지 확인
3. Supabase RLS 정책이 올바르게 설정되었는지 확인

### 데이터가 보이지 않는 경우
1. Supabase RLS 정책 확인
2. admins 테이블에 현재 로그인한 사용자가 등록되어 있는지 확인
3. 네트워크 탭에서 API 응답 확인

### admin_all_users 뷰 오류
뷰 생성 시 오류가 발생하면, 각 프로필 테이블이 정상적으로 존재하는지 확인하세요.

## 보안 주의사항

1. `.env` 파일은 절대 Git에 커밋하지 마세요
2. 프로덕션 환경에서는 강력한 비밀번호를 사용하세요
3. super_admin 권한은 신뢰할 수 있는 사용자에게만 부여하세요
4. 정기적으로 관리자 계정을 검토하고 불필요한 계정은 삭제하세요

## 추가 개발 시 참고사항

### 타입 정의
`src/types/database.types.ts`에 모든 데이터베이스 타입이 정의되어 있습니다.

### 인증 유틸리티
`src/utils/auth.ts`에 인증 관련 헬퍼 함수들이 있습니다.

### Supabase 클라이언트
`src/lib/supabase.ts`에서 타입이 적용된 Supabase 클라이언트를 export합니다.

