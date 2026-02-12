# Bridge 백오피스

Bridge 플랫폼의 관리자용 백오피스 애플리케이션입니다.

## 기술 스택

- **Frontend**: React 19 + TypeScript
- **UI Library**: Ant Design 5
- **Charts**: Recharts
- **Routing**: React Router v6
- **Database**: Supabase
- **Build Tool**: Vite

## 주요 기능

### 📊 대시보드
- 실시간 사용자 통계 (아티스트, 브랜드, 크리에이티브, 팬)
- 최근 7일 신규 가입자 추세 차트
- 사용자 타입별 분포 차트
- 최근 가입자 목록
- 승인 대기 중인 크리에이티브 수

### 👥 사용자 관리
- **아티스트**: 프로필 조회, 상세 정보 확인
- **브랜드**: 브랜드 정보, 협업 조건 확인
- **크리에이티브**: 승인 상태별 관리
- **팬**: 관심사 및 선호도 확인
- 검색 및 필터링 기능
- 상세 정보 모달

### ✅ 승인 관리
- 크리에이티브 신청 승인/거절
- SNS 채널 확인 및 바로가기
- 승인 이력 관리

## 시작하기

### 1. 데이터베이스 설정

`supabase_setup.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

자세한 설정 방법은 [SETUP.md](./SETUP.md)를 참고하세요.

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 패키지 설치 및 실행

```bash
npm install
npm run dev
```

### 4. 관리자 계정 생성

Supabase에서 사용자를 생성하고 `admins` 테이블에 추가해야 합니다.
자세한 방법은 [SETUP.md](./SETUP.md)를 참고하세요.

## 프로젝트 구조

```
backoffice/
├── src/
│   ├── components/      # 공통 컴포넌트
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/          # 페이지 컴포넌트
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   └── Approvals.tsx
│   ├── lib/            # 라이브러리 설정
│   │   └── supabase.ts
│   ├── types/          # TypeScript 타입
│   │   └── database.types.ts
│   ├── utils/          # 유틸리티 함수
│   │   └── auth.ts
│   ├── App.tsx         # 메인 앱 (라우팅)
│   └── main.tsx        # 진입점
├── supabase_setup.sql  # DB 설정 스크립트
├── SETUP.md           # 상세 설정 가이드
└── package.json
```

## 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 보안 고려사항

- 관리자 인증 필수
- Row Level Security (RLS) 적용
- 관리자 전용 정책 설정
- 환경 변수를 통한 민감 정보 관리

## 문의 및 지원

문제가 발생하면 [SETUP.md](./SETUP.md)의 트러블슈팅 섹션을 참고하세요.
