# **'Bridge' MVP(최소 기능 제품) 개발 계획서**

- **프로젝트명:** Bridge
- **핵심 목표:** 2025년 12월 말 MVP 론칭
- **핵심 제약:** 1인 개발, 2개월의 긴급한 일정, 최소 비용

## **1. MVP 범위 (Scope)**

사업계획서를 기반으로 12월 말까지 구현해야 할 **핵심 기능**과 **제외할 기능**을 명확히 정의

### **A. MVP 핵심 기능 (Must-Have)**

1. **사용자 인증:** **SSO (Google, Apple) 전용**
2. **핵심 프로필 (CRUD):** 4개 주체(브랜드, 인플루언서, 아티스트, 고객)가 가입 시 역할을 선택하고, 그에 맞는 상세 프로필(태그, 자기소개, 포트폴리오 등)을 생성/수정
3. **매칭 (MVP Ver.):** **규칙 기반 매칭 (스마트 필터)**
    - 복잡한 AI 대신, 사용자가 프로필 태그와 카테고리를 기반으로 원하는 파트너를 검색하고 필터링
4. **기본 커머스 (CRUD):** '아티스트'가 자신의 작품, 굿즈, 티켓 등을 상품으로 등록/관리할 수 있는 기능
5. **기본 결제/후원:** '고객(팬)'이 등록된 상품을 구매하거나 아티스트에게 후원(기부)할 수 있는 결제 기능

### **B. MVP 제외 기능 (Postponed)**

- **이메일/비밀번호 가입:** '비밀번호 찾기' 기능 구현의 복잡성을 제거하기 위해 과감히 제외
- **복잡한 AI/ML 매칭:** 론칭 후 데이터가 쌓이면 고도화
- **라이브 스트리밍, 실시간 채팅:** 구현 난이도가 높으므로 제외
- **B2G/공공 협업, 상세 데이터 리포트:** MVP 범위가 아님

## **2. 핵심 아키텍처: 하이브리드 웹뷰 쉘 (Hybrid WebView Shell)**

**'Expo for Web' (네이티브 컴파일) 방식 대신, 'WebView 쉘' 방식을 최종 채택합니다.**

- **선택 이유:**
1. **압도적인 개발 속도:** SSO, 푸시 알림 등 네이티브 기능은 '껍데기(Shell)'에 한 번만 개발. 
    1. 이후 **모든 UI와 로직은 100% 웹(Web)**으로 개발하며, eas build 없이 **Vercel** 배포(1분)만으로 반영
2. **비용 절감:** eas build 횟수가 월 15회(무료) 미만으로 줄어, 유료 플랜(월 $29)이 필요 없음
- **구조:**
1. **네이티브 쉘 (expo-shell):** 최소한의 기능을 가진 Expo 앱 '껍데기'
    1. 네이티브 SDK(SSO, 푸시 알림, 결제)를 호출하고, 
    2. 그 결과를 내장된 WebView(웹)와 통신하는 '브릿지(Bridge)' 역할만 수행
2. **웹 UI (webapp):** 실제 모든 사용자 화면(로그인, 프로필, 매칭 등)이 담긴 React.js 웹 프로젝트
    1. 네이티브 쉘의 WebView 안에 로드됨

## **3. 리포지토리 및 프로젝트 구조**

- **BridgeApp**이라는 단일 GitHub 리포지토리 내에 3개의 독립된 프로젝트 폴더를 생성하여 관리

/BridgeApp (GitHub 리포지토리 루트)

│

├── 📁 backoffice/

│   ├── src/

│   ├── package.json  <-- (관리자용 React.js + Vite)

│   └── vite.config.js

│

├── 📁 expo-shell/

│   ├── app/ (단순 WebView 로딩용)

│   ├── package.json  <-- (네이티브 쉘 Expo. 기존 프로젝트)

│   └── supabase.ts

│

└── 📁 webapp/

├── src/

├── package.json  <-- (사용자용 React.js + Vite. 신규)

└── vite.config.js

## **4. 전체 기술 스택**

### **A. 백엔드 (공통)**

- **BaaS:** **Supabase** (인증, PostgreSQL DB, 스토리지, Edge Functions)
- **PG (결제):** **포트원**(구 아임포트) 또는 토스페이먼츠

### **B. expo-shell (네이티브 쉘)**

- **프레임워크:** **Expo (React Native)**
- **핵심 라이브러리:**
- react-native-webview: 웹-앱 통신 및 UI 로딩
- @react-native-google-signin/google-signin: Google 네이티브 SSO
- @invertase/react-native-apple-authentication: Apple 네이티브 SSO
- expo-dev-client: 네이티브 라이브러리 테스트용 개발 빌드
- **빌드/배포:** **EAS Build** (최초 1회 및 브릿지 수정 시에만 사용)

### **C. webapp (사용자 UI)**

- **프레임워크:** Vite.js
- **UI/스타일링:** MUI (웹 환경에 최적화)
- **라우팅:** react-router-dom
- **상태 관리:** Zustand
- **데이터 페칭:** TanStack Query (React Query) (캐싱 및 Supabase 연동)
- **배포:** **Vercel**(GitHub 연동 자동 배포)

### **D. backoffice (관리자 페이지)**

- **프레임워크:** Vite.js
- **UI 라이브러리:** **Ant Design** (데이터 그리드, 차트 등 PC용 컴포넌트)
- **배포:** **Vercel**

## **5. 개발 로드맵 (12월 말 목표)**

**Step 1: 환경 구축 및 '브릿지' 완성 (1-2주)**

- Supabase 프로젝트 생성 (인증, RLS, DB 테이블 스키마 설계)
- BridgeApp 리포지토리 3개 폴더 구조 설정
    - **[핵심]** expo-shell에 WebView 구현
    - **[핵심]** **SSO 브릿지 구현:**
        - webapp (웹)에서 로그인 요청
        - expo-shell (앱)이 네이티브 SSO 실행
        - idToken을 다시 webapp으로 전달
        - webapp이 Supabase로 로그인. (가장 복잡한 단계)
    - expo-shell 1차 빌드 (.apk, .ipa) 완료

**Step 2: webapp - 인증 및 프로필 (2주, 이후 모든 작업은 webapp 폴더에서 진행)**

- SSO 로그인 버튼 UI 구현 (브릿지 호출)
- 로그인 성공 시 profiles 테이블 확인
- 최초 로그인 시 '역할 선택' 및 '상세 프로필' 생성(C) 페이지
- 프로필 조회(R), 수정(U) 페이지 구현

**Step 3: webapp - 핵심 기능 (2주)**

- '규칙 기반 매칭' (파트너 검색/필터) UI 구현 (R)
- '커머스' 상품 등록(C), 조회(R), 수정(U) 기능 구현 (아티스트용)

**Step 4: webapp - 결제 및 테스트 (1-2주)**

- PG사(포트원/토스) 웹 결제 모듈 연동
- 결제 로직 및 웹훅(Webhook) 처리 (Supabase Edge Function 권장)
- 전체 기능 QA 및 버그 수정

**Step 5: backoffice 및 론칭 (병행)**

- backoffice에서 최소한의 관리 기능(사용자 조회, 데이터 관리) 구현
- webapp, backoffice Vercel/Netlify 배포
- expo-shell 최종 빌드본을 App Store / Play Store에 제출

참고 사이트

https://www.artworker.kr/

[https://store.cafe24.com › apps](https://store.cafe24.com/apps/22950)