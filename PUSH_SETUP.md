# Push 알림 설정 체크리스트 (expo-shell + webapp)

이 프로젝트는 **`expo-shell`(React Native WebView 래퍼)** 에서 푸시 토큰을 발급하고, 웹앱(`webapp`)으로 브릿지하여 Supabase(`user_push_tokens`)에 저장하는 구조입니다.

## 1) 코드가 이미 해둔 것(자동)
- `expo-shell`에서 푸시 권한 요청 후 토큰 발급 시도
  - Android: FCM 디바이스 토큰(`getDevicePushTokenAsync`)
  - iOS: APNs 디바이스 토큰(`getDevicePushTokenAsync`)
  - (옵션) Expo Push Token(`getExpoPushTokenAsync`)
- 발급된 토큰을 WebView로 전달
  - 메시지 타입: `PUSH_TOKEN`, `PUSH_OPEN`, `PUSH_RECEIVED`
- 웹앱은 메시지를 수신해 Supabase 테이블에 upsert
  - 테이블: `public.user_push_tokens`
  - 마이그레이션: `supabase/migrations/20251211_user_push_tokens.sql`

## 2) 당신이 해야 하는 것 (필수)

### 2.1 Supabase 마이그레이션 적용
- Supabase 로컬/원격에 아래 마이그레이션을 적용합니다.
  - `supabase/migrations/20251211_user_push_tokens.sql`

### 2.2 Android (FCM) 설정
1. Firebase Console에서 프로젝트 생성
2. Android 앱 추가
   - Package name: `expo-shell/app.json`의 `"android.package"` 값(현재 `com.jhcol.bridgeshell`)
3. `google-services.json` 다운로드
4. 파일 배치
   - 권장 위치: `expo-shell/google-services.json`
5. Expo config에 연결
   - `expo-shell/app.json`의 `"expo.android.googleServicesFile"`에 위 파일 경로를 설정해야 합니다.
   - 예: `"googleServicesFile": "./google-services.json"`
6. EAS Build로 실제 기기 설치 후 토큰 발급 확인
   - `eas build --profile development --platform android`

### 2.3 iOS (APNs) 설정
1. Apple Developer에서 Identifiers 확인
   - Bundle ID: `expo-shell/app.json`의 `"ios.bundleIdentifier"` 값(현재 `com.jhcol.bridgeshell`)
2. APNs 키(.p8) 생성 (Keys > Apple Push Notification service)
3. EAS Credentials에 APNs 키 등록
   - 보통 `eas credentials`를 통해 업로드/연결
4. (Firebase도 쓸 경우) iOS 앱 추가 후 `GoogleService-Info.plist` 다운로드
   - 권장 위치: `expo-shell/GoogleService-Info.plist`
   - 그리고 `expo-shell/app.json`에 `"expo.ios.googleServicesFile"` 지정 필요
5. EAS Build로 실제 기기 설치 후 수신 확인
   - `eas build --profile development --platform ios`

## 3) 푸시 “발송”은 별도입니다
현재 구현은 **(A) 토큰 수집/저장**과 **(B) 알림 탭 시 웹앱 라우팅**까지입니다.

실제로 “채팅/제안/지원/마감” 같은 이벤트가 발생했을 때 푸시를 보내려면, 서버(또는 Supabase Edge Function)에서:
- `user_push_tokens`에서 수신자 토큰을 조회하고
- FCM/APNs(또는 Expo Push)로 발송하는 로직이 필요합니다.

원하시면 다음 단계로 **Supabase Edge Function 기반 발송(개발용: Expo Push / 운영용: FCM HTTP v1)** 까지 이어서 붙여드릴게요.

## 4) 간단 검증 방법(추천)
- Android 실기기 Dev Client/EAS 빌드에서 앱 실행 → 로그인 → 콘솔에서 토큰 로그 확인
- Supabase `user_push_tokens`에 row가 생겼는지 확인
- 테스트 발송(서버/도구)로 푸시가 도착하는지 확인


