# SSO 브릿지 (Bridge) 구현 가이드

## 개요

이 프로젝트는 React Native WebView(expo-shell)와 웹앱(webapp) 간 SSO(Single Sign-On) 브릿지를 구현하여 사용자가 한 번 로그인하면 두 환경 모두에서 인증 상태가 동기화됩니다.

## 아키텍처

```
┌─────────────────────────────────────────┐
│         expo-shell (React Native)        │
│                                          │
│  ┌────────────────────────────────┐     │
│  │         WebView                │     │
│  │                                │     │
│  │  ┌──────────────────────────┐  │     │
│  │  │    webapp (Vite+React)   │  │     │
│  │  │                          │  │     │
│  │  │  - Google OAuth 로그인   │  │     │
│  │  │  - Apple OAuth 로그인    │  │     │
│  │  │  - Supabase Auth         │  │     │
│  │  │                          │  │     │
│  │  │  postMessage() ────────→ │  │     │
│  │  └──────────────────────────┘  │     │
│  │                                │     │
│  │  onMessage() ←────────────────┘     │
│  └────────────────────────────────┘     │
│                                          │
│  Supabase Auth (AsyncStorage)           │
│  - 세션 동기화                           │
│  - 토큰 저장                             │
└─────────────────────────────────────────┘
```

## 구현된 기능

### 1. WebApp (webapp/src/App.tsx)

#### Google/Apple OAuth 로그인
- Supabase Auth를 사용한 OAuth 로그인 구현
- Google과 Apple 로그인 버튼 제공

```typescript
const handleGoogleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
};
```

#### WebView 메시지 전송
- 로그인 성공 시 세션 정보를 React Native로 전송
- 로그아웃 시 이벤트 전송

```typescript
window.ReactNativeWebView?.postMessage(
  JSON.stringify({
    type: 'SESSION_UPDATE',
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user,
    },
  })
);
```

### 2. Expo Shell (expo-shell/App.tsx)

#### WebView 메시지 수신
- 웹에서 전송한 세션 정보를 수신
- React Native Supabase에 세션 저장

```typescript
const handleWebViewMessage = async (event: WebViewMessageEvent) => {
  const message = JSON.parse(event.nativeEvent.data);
  
  if (message.type === 'SESSION_UPDATE') {
    await supabase.auth.setSession({
      access_token: message.session.access_token,
      refresh_token: message.session.refresh_token,
    });
  }
};
```

#### 양방향 세션 동기화
- React Native에서도 세션 변경을 감지
- 필요시 WebView에 알림 전송

### 3. Supabase 설정

#### WebApp (webapp/src/lib/supabase.ts)
```typescript
// 브라우저 환경 - localStorage 자동 사용
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### Expo Shell (expo-shell/lib/supabase.ts)
```typescript
// React Native 환경 - AsyncStorage 사용
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## 메시지 프로토콜

### WebView → React Native

#### SESSION_UPDATE
```json
{
  "type": "SESSION_UPDATE",
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1234567890,
    "user": { ... }
  }
}
```

#### SIGNED_OUT
```json
{
  "type": "SIGNED_OUT"
}
```

## 설정 방법

### 1. Supabase 프로젝트 설정

1. Supabase 대시보드에서 프로젝트 생성
2. Authentication > Providers에서 Google/Apple 활성화
3. 각 프로바이더의 Client ID와 Secret 설정

### 2. 환경 변수 설정

#### webapp/.env
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### expo-shell/.env
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Redirect URL 설정

Supabase 대시보드의 Authentication > URL Configuration에서:
- Site URL: `http://localhost:5173` (개발) 또는 프로덕션 URL
- Redirect URLs에 추가:
  - `http://localhost:5173/**`
  - `http://192.168.x.x:5173/**` (로컬 네트워크 테스트용)
  - 프로덕션 도메인

## 테스트 방법

### 1. WebApp 단독 테스트
```bash
cd webapp
npm run dev
```
브라우저에서 `http://localhost:5173` 접속 후 로그인 테스트

### 2. Expo Shell 통합 테스트

1. WebApp 서버 시작:
```bash
cd webapp
npm run dev
# Network 주소 확인 (예: http://192.168.123.176:5173)
```

2. expo-shell/App.tsx의 `WEBAPP_DEV_URL` 업데이트:
```typescript
const WEBAPP_DEV_URL = 'http://192.168.123.176:5173/';
```

3. Expo 앱 실행:
```bash
cd expo-shell
npm start
```

4. Expo Go 또는 개발 빌드에서 실행

5. 로그인 후 콘솔 확인:
   - WebView: "Auth event: SIGNED_IN"
   - React Native: "Session synced successfully to React Native"

## 디버깅

### Chrome DevTools로 WebView 디버깅
- Android: `chrome://inspect` 접속
- iOS: Safari > 개발자 메뉴 > 시뮬레이터 선택

### React Native 디버깅
```bash
# Expo 앱에서 Ctrl+M (Android) 또는 Cmd+D (iOS)
# "Debug Remote JS" 선택
```

### 로그 확인
```typescript
// WebView 콘솔
console.log('Auth event:', event, session);

// React Native 콘솔
console.log('Received message from WebView:', message);
console.log('Session synced successfully to React Native');
```

## 보안 고려사항

1. **HTTPS 사용**: 프로덕션 환경에서는 반드시 HTTPS 사용
2. **토큰 보안**: 
   - AsyncStorage는 암호화되지 않음 (고려 필요시 react-native-encrypted-storage 사용)
   - 민감한 데이터는 별도 암호화 권장
3. **메시지 검증**: WebView 메시지 origin 검증 고려
4. **토큰 만료**: Supabase의 자동 토큰 갱신 활용

## 추가 기능 제안

1. **오프라인 지원**: AsyncStorage에 저장된 세션으로 오프라인 작동
2. **생체인증 연동**: Face ID/Touch ID로 추가 보안
3. **다중 계정**: 여러 계정 전환 기능
4. **세션 갱신 UI**: 토큰 만료 시 사용자에게 재로그인 요청

## 트러블슈팅

### 문제: WebView에서 로그인 후 React Native에 세션이 전달되지 않음
- `window.ReactNativeWebView` 존재 여부 확인
- `onMessage` 핸들러가 WebView에 연결되었는지 확인
- 콘솔에서 postMessage 호출 확인

### 문제: Android에서 HTTP 연결 실패
- `expo-shell/app.json`에 `"usesCleartextTraffic": true` 추가:
```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true
    }
  }
}
```

### 문제: iOS에서 로그인 팝업이 열리지 않음
- Supabase 대시보드에서 Redirect URL 확인
- Info.plist에 URL Scheme 추가 필요할 수 있음

## 파일 구조

```
BridgeApp/
├── webapp/
│   ├── src/
│   │   ├── App.tsx              # OAuth 로그인 + 메시지 전송
│   │   ├── lib/
│   │   │   └── supabase.ts      # Supabase 클라이언트 (Web)
│   │   └── types/
│   │       └── webview.d.ts     # WebView 타입 정의
│   └── .env                     # 환경 변수
│
├── expo-shell/
│   ├── App.tsx                  # WebView + 메시지 수신
│   ├── lib/
│   │   └── supabase.ts          # Supabase 클라이언트 (RN)
│   └── .env                     # 환경 변수
│
└── SSO_BRIDGE_GUIDE.md          # 이 문서
```

## 다음 단계

1. Supabase 프로젝트 생성 및 OAuth 프로바이더 설정
2. 환경 변수 파일 생성
3. 로컬에서 테스트
4. 프로덕션 배포 시 HTTPS 및 보안 설정 강화
5. 사용자 프로필 페이지 구현
6. 로그아웃 기능 추가
7. 토큰 갱신 에러 핸들링

## 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [Expo 환경 변수](https://docs.expo.dev/guides/environment-variables/)

