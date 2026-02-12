# SSO 브릿지 테스트 체크리스트

## 사전 준비

- [ ] Supabase 프로젝트 생성 완료
- [ ] Google OAuth 프로바이더 설정 완료
- [ ] Apple OAuth 프로바이더 설정 완료 (선택)
- [ ] webapp/.env 파일 생성 및 설정
- [ ] expo-shell/.env 파일 생성 및 설정

## 테스트 시나리오

### 1. WebApp 단독 테스트 (브라우저)

#### 준비
```bash
cd webapp
npm install
npm run dev
```

#### 테스트 케이스
- [ ] 1.1: 브라우저에서 `http://localhost:5173` 접속
- [ ] 1.2: Google 로그인 버튼 클릭
- [ ] 1.3: Google 로그인 팝업 표시 확인
- [ ] 1.4: 계정 선택 및 로그인 완료
- [ ] 1.5: 콘솔에 "Auth event: SIGNED_IN" 메시지 확인
- [ ] 1.6: localStorage에 세션 저장 확인 (DevTools > Application > Local Storage)

#### 예상 로그
```
Auth event: SIGNED_IN {access_token: "eyJ...", refresh_token: "...", ...}
```

### 2. Expo Shell WebView 통합 테스트

#### 준비
```bash
# Terminal 1: WebApp 서버
cd webapp
npm run dev
# Network 주소 확인: http://192.168.x.x:5173

# Terminal 2: Expo Shell
cd expo-shell
# App.tsx에서 WEBAPP_DEV_URL 업데이트
npm start
```

#### 테스트 케이스 A: 웹에서 로그인 → React Native 동기화
- [ ] 2.1: Expo Go 또는 개발 빌드에서 앱 실행
- [ ] 2.2: WebView가 webapp을 로드하는지 확인
- [ ] 2.3: Google 로그인 버튼 클릭
- [ ] 2.4: 로그인 완료
- [ ] 2.5: WebView 콘솔에 "Auth event: SIGNED_IN" 확인
- [ ] 2.6: React Native 콘솔에 다음 메시지 확인:
  - "Received message from WebView: {type: 'SESSION_UPDATE', ...}"
  - "Session synced successfully to React Native"

#### 예상 로그 (WebView)
```javascript
Auth event: SIGNED_IN {access_token: "eyJ...", ...}
Posting message to React Native: {"type":"SESSION_UPDATE",...}
```

#### 예상 로그 (React Native)
```javascript
Received message from WebView: {type: "SESSION_UPDATE", session: {...}}
Session synced successfully to React Native
React Native Auth event: SIGNED_IN {access_token: "eyJ...", ...}
```

#### 테스트 케이스 B: 세션 유지 확인
- [ ] 2.7: 앱 종료
- [ ] 2.8: 앱 재실행
- [ ] 2.9: WebView에서 자동 로그인 상태 확인
- [ ] 2.10: React Native에서 세션 복원 확인

#### 테스트 케이스 C: 로그아웃 동기화
- [ ] 2.11: WebView에서 로그아웃 기능 호출 (개발 필요 시)
- [ ] 2.12: "SIGNED_OUT" 메시지 전송 확인
- [ ] 2.13: React Native에서 로그아웃 처리 확인

### 3. 네트워크 환경 테스트

#### 테스트 케이스
- [ ] 3.1: WiFi 연결 상태에서 로그인 테스트
- [ ] 3.2: 모바일 데이터 연결 상태에서 로그인 테스트
- [ ] 3.3: 오프라인 상태에서 저장된 세션 복원 확인
- [ ] 3.4: 네트워크 재연결 시 토큰 자동 갱신 확인

### 4. 다양한 디바이스 테스트

#### iOS
- [ ] 4.1: iOS 시뮬레이터에서 테스트
- [ ] 4.2: 실제 iOS 디바이스에서 테스트
- [ ] 4.3: Safari WebView 동작 확인

#### Android
- [ ] 4.4: Android 에뮬레이터에서 테스트
- [ ] 4.5: 실제 Android 디바이스에서 테스트
- [ ] 4.6: Chrome WebView 동작 확인

### 5. 에러 처리 테스트

#### 테스트 케이스
- [ ] 5.1: 잘못된 Supabase URL로 테스트 (에러 처리 확인)
- [ ] 5.2: 네트워크 타임아웃 시뮬레이션
- [ ] 5.3: 토큰 만료 후 자동 갱신 확인
- [ ] 5.4: 로그인 취소 시 에러 핸들링

## 디버깅 도구

### WebView 디버깅

**Android:**
```
1. Chrome 브라우저에서 chrome://inspect 접속
2. "Inspect" 클릭하여 DevTools 열기
3. Console 탭에서 로그 확인
```

**iOS:**
```
1. Safari > 환경설정 > 고급 > "메뉴 막대에서 개발자용 메뉴 보기" 활성화
2. Safari > 개발 > [디바이스] > [WebView] 선택
3. Web Inspector에서 Console 확인
```

### React Native 디버깅

**Expo Dev Tools:**
```bash
# 앱에서 개발자 메뉴 열기
- Android: Ctrl+M 또는 디바이스 흔들기
- iOS: Cmd+D 또는 디바이스 흔들기

# "Debug Remote JS" 선택
# Chrome DevTools 자동 열림
```

**콘솔 로그 확인:**
```bash
# Expo 로그
cd expo-shell
npm start
# 터미널에서 실시간 로그 확인

# 또는
npx expo start --dev-client
```

## 성능 체크

- [ ] 로그인 완료까지 걸리는 시간: ___초
- [ ] 세션 동기화 시간: ___ms
- [ ] 앱 재시작 후 세션 복원 시간: ___ms
- [ ] WebView 초기 로딩 시간: ___초

## 보안 체크

- [ ] 액세스 토큰이 콘솔에 노출되지 않는지 확인 (프로덕션)
- [ ] HTTPS 사용 확인 (프로덕션)
- [ ] 민감한 정보가 평문으로 저장되지 않는지 확인
- [ ] WebView의 origin 검증 (선택)

## 알려진 이슈

### Android HTTP 연결 문제
**증상**: Android에서 WebView가 빈 화면으로 표시
**해결**: `expo-shell/app.json`에 다음 추가
```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true
    }
  }
}
```

### iOS 리다이렉트 문제
**증상**: OAuth 로그인 후 앱으로 돌아오지 않음
**해결**: Supabase 대시보드에서 Redirect URL 정확히 설정

### 세션 동기화 지연
**증상**: 로그인 후 React Native에 바로 반영되지 않음
**해결**: `onAuthStateChange` 리스너가 제대로 등록되었는지 확인

## 테스트 결과 요약

| 테스트 항목 | 상태 | 비고 |
|-----------|------|------|
| WebApp 단독 로그인 | ⬜ | |
| Expo Shell 통합 로그인 | ⬜ | |
| 세션 유지 및 복원 | ⬜ | |
| 로그아웃 동기화 | ⬜ | |
| iOS 테스트 | ⬜ | |
| Android 테스트 | ⬜ | |
| 오프라인 모드 | ⬜ | |
| 에러 처리 | ⬜ | |

**범례:**
- ✅ 통과
- ❌ 실패
- ⏸️ 대기
- ⬜ 미실행

## 다음 단계

테스트 완료 후:
1. [ ] 발견된 버그 수정
2. [ ] 성능 최적화
3. [ ] 사용자 피드백 수집
4. [ ] 프로덕션 배포 준비

