# 설치 가이드

## AsyncStorage 오류 해결

### 오류 메시지
```
[runtime not ready]: Error: [@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.
```

### 해결 방법

#### 방법 1: Clean Install (권장)

```bash
cd expo-shell

# 캐시 및 node_modules 삭제
rm -rf node_modules
rm -rf package-lock.json
rm -rf yarn.lock

# 다시 설치
npm install

# 또는 yarn 사용
yarn install

# Expo 캐시 클리어
npx expo start --clear
```

#### 방법 2: Expo 방식으로 설치

```bash
cd expo-shell

# Expo CLI로 설치
npx expo install @react-native-async-storage/async-storage

# 모든 의존성 재설치
npx expo install --fix
```

#### 방법 3: React Native 캐시 클리어

```bash
cd expo-shell

# Metro bundler 캐시 클리어
npx expo start --clear

# 또는
npm start -- --reset-cache
```

### Windows에서 삭제 명령어

```powershell
cd expo-shell

# node_modules 삭제
Remove-Item -Recurse -Force node_modules

# lock 파일 삭제
Remove-Item -Force package-lock.json
Remove-Item -Force yarn.lock -ErrorAction SilentlyContinue

# 재설치
npm install
```

### 앱 재빌드

```bash
# 앱 삭제 후 재설치
# Expo Go에서 앱 삭제
# 다시 실행
npx expo start

# 개발 빌드를 사용하는 경우
npx expo run:android
# 또는
npx expo run:ios
```

## 전체 프로젝트 설치 단계

### 1. WebApp 설치

```bash
cd webapp
npm install
```

### 2. Expo Shell 설치

```bash
cd expo-shell
npm install
```

### 3. 환경 변수 설정

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

### 4. 실행

#### Terminal 1: WebApp
```bash
cd webapp
npm run dev
# Network 주소 확인: http://192.168.x.x:5173
```

#### Terminal 2: Expo Shell
```bash
cd expo-shell
# App.tsx에서 WEBAPP_DEV_URL 업데이트
npx expo start --clear
```

## 자주 발생하는 오류

### 1. Metro bundler 오류
```bash
npx expo start --clear
```

### 2. 네이티브 모듈 오류
```bash
# 앱 삭제 후 재설치
# 또는 개발 빌드 재생성
npx expo prebuild --clean
npx expo run:android
```

### 3. TypeScript 오류
```bash
cd expo-shell
npm install --save-dev typescript @types/react
```

### 4. Expo Go vs 개발 빌드

**Expo Go 사용 시:**
- 일부 네이티브 모듈은 작동하지 않을 수 있음
- AsyncStorage는 Expo Go에서 지원됨

**개발 빌드 필요 시:**
```bash
# 개발 빌드 생성
npx expo run:android
npx expo run:ios

# 또는 EAS Build
npx eas build --profile development --platform android
```

## 패키지 버전 확인

### expo-shell/package.json
```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@supabase/supabase-js": "^2.76.1",
    "expo": "~54.0.20",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-safe-area-context": "^5.6.1",
    "react-native-url-polyfill": "^3.0.0",
    "react-native-webview": "^13.16.0"
  }
}
```

## 추가 문제 해결

### Node.js 버전
```bash
node --version
# v18 이상 권장
```

### npm 캐시 클리어
```bash
npm cache clean --force
```

### Watchman (macOS/Linux)
```bash
# 캐시 클리어
watchman watch-del-all
```

## 도움이 되는 명령어

### 의존성 트리 확인
```bash
npm list @react-native-async-storage/async-storage
```

### Expo 진단
```bash
npx expo-doctor
```

### 로그 확인
```bash
# 상세 로그
npx expo start --dev-client --verbose
```

