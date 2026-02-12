# Native OAuth 구현 가이드 (WebView 403 에러 해결)

## 문제

Google OAuth는 보안상의 이유로 WebView에서의 로그인을 차단합니다:
- **403 오류: disallowed_useragent**

## 해결 방법

### 방법 1: User-Agent 변경 (임시 방법) ✅ 적용됨

WebView의 User-Agent를 변경하여 일반 브라우저처럼 보이게 합니다.

```typescript
// expo-shell/App.tsx
<WebView
  userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
  ...
/>
```

**장점:** 간단한 수정
**단점:** Google 정책 변경 시 작동하지 않을 수 있음

### 방법 2: React Native에서 Native OAuth (권장) 🚀

WebView 대신 React Native에서 직접 시스템 브라우저를 열어 OAuth 처리

#### 필요한 패키지

```bash
cd expo-shell
npx expo install expo-auth-session expo-crypto
```

#### 구현 예시

```typescript
// expo-shell/App.tsx
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function NativeAuth() {
  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AuthSession.makeRedirectUri({
            scheme: 'your-app-scheme'
          }),
        },
      });
      
      if (error) throw error;
      
      // 시스템 브라우저에서 OAuth 처리
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          AuthSession.makeRedirectUri({
            scheme: 'your-app-scheme'
          })
        );
        
        if (result.type === 'success') {
          // URL에서 토큰 추출 및 세션 설정
          const { url } = result;
          // Supabase가 자동으로 세션 설정
        }
      }
    } catch (error) {
      console.error('로그인 에러:', error);
    }
  };
  
  return (
    <Button onPress={handleGoogleLogin} title="Google 로그인" />
  );
}
```

#### app.json 설정

```json
{
  "expo": {
    "scheme": "your-app-scheme",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "your-app-scheme"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "ios": {
      "bundleIdentifier": "com.yourapp.bridge"
    }
  }
}
```

### 방법 3: 하이브리드 접근 (최적)

1. **Native에 로그인 버튼** 배치
2. **로그인 후 WebView** 표시
3. **세션은 Native가 관리**

```typescript
// expo-shell/App.tsx
import { useState } from 'react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    // 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);
  
  if (!isLoggedIn) {
    return <NativeLoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }
  
  return <WebViewContainer />;
}
```

## 현재 적용된 방법

✅ **User-Agent 변경** 적용됨

```typescript
userAgent="Mozilla/5.0 (Linux; Android 10; Android SDK built for x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
```

## 테스트

1. 앱 재시작 (Expo 서버 재시작)
```bash
cd expo-shell
npm start
# 앱에서 R 두 번 눌러 새로고침
```

2. Google 로그인 버튼 클릭
3. 정상 동작 확인

## 여전히 403 오류가 발생한다면

### 옵션 A: Supabase Redirect URL 직접 확인

Supabase 대시보드에서:
1. Authentication > URL Configuration
2. **Site URL** 확인
3. **Redirect URLs**에 다음 추가:
   - `http://localhost:5173/**`
   - `http://192.168.x.x:5173/**`
   - `exp://192.168.x.x:8081/**` (Expo)

### 옵션 B: Google Cloud Console 설정

1. Google Cloud Console > 프로젝트 선택
2. APIs & Services > Credentials
3. OAuth 2.0 클라이언트 ID 선택
4. **승인된 JavaScript 원본**에 추가:
   - `http://localhost:5173`
   - `http://192.168.x.x:5173`
5. **승인된 리디렉션 URI**에 Supabase 콜백 URL 추가:
   - `https://your-project.supabase.co/auth/v1/callback`

### 옵션 C: 완전한 Native OAuth 구현

장기적으로 가장 안정적인 방법:

```bash
cd expo-shell
npx expo install expo-auth-session expo-crypto expo-web-browser
```

별도의 Native 로그인 화면 구현 (위의 방법 3 참고)

## 추천 접근 방법

### 단기 (현재)
✅ User-Agent 변경으로 테스트

### 중기
🔄 Native 로그인 화면 추가
- WebView 밖에서 로그인
- 로그인 후 WebView 진입

### 장기 (프로덕션)
🚀 완전한 Native OAuth
- expo-auth-session 사용
- 시스템 브라우저로 OAuth
- WebView는 콘텐츠만 표시

## 참고 자료

- [Google OAuth WebView 정책](https://developers.googleblog.com/2016/08/modernizing-oauth-interactions-in-native-apps.html)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Supabase React Native Auth](https://supabase.com/docs/guides/auth/social-login/auth-google?platform=react-native)

