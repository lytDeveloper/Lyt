# 파트너사이트

React + TypeScript + Vite로 구축된 파트너사이트 프로젝트입니다.

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

개발 서버는 `http://localhost:5174`에서 실행됩니다.

### 3. 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

## 프로젝트 구조

```
partnersite/
├── src/
│   ├── pages/          # 페이지 컴포넌트
│   ├── components/     # 재사용 가능한 컴포넌트
│   ├── lib/            # 유틸리티 및 설정
│   ├── hooks/          # 커스텀 훅
│   ├── stores/         # 상태 관리 (Zustand)
│   ├── types/          # TypeScript 타입 정의
│   ├── utils/          # 헬퍼 함수
│   ├── App.tsx         # 메인 앱 컴포넌트
│   ├── main.tsx        # 진입점
│   └── index.css      # 전역 스타일
├── public/             # 정적 파일
├── index.html          # HTML 템플릿
├── vite.config.ts      # Vite 설정
└── package.json        # 프로젝트 설정
```

## 사용 기술 스택

- **React 18.3.1** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Material-UI (MUI)** - UI 컴포넌트
- **React Router** - 라우팅
- **TanStack Query** - 서버 상태 관리
- **Zustand** - 클라이언트 상태 관리
- **React Toastify** - 알림

## 다음 단계

1. **라우팅 추가**: `src/App.tsx`에 새로운 라우트 추가
2. **페이지 생성**: `src/pages/` 폴더에 새 페이지 컴포넌트 생성
3. **컴포넌트 생성**: `src/components/` 폴더에 재사용 가능한 컴포넌트 생성
4. **상태 관리**: `src/stores/` 폴더에 Zustand 스토어 추가
5. **API 연동**: `src/lib/` 폴더에 Supabase 클라이언트 설정 (필요시)

## 참고

- `webapp` 폴더의 구조를 참고하여 일관된 코드 스타일 유지
- 기존 프로젝트의 컴포넌트나 유틸리티를 재사용할 수 있습니다
