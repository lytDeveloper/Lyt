# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Dummy Data Seeding (Supabase)

### 1) 환경 변수 설정

- 개발 환경에 다음 환경 변수를 설정하세요(예: PowerShell 세션 또는 로컬 .env 파일).
  - `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (시드 스크립트 전용)

### 2) Node(CommonJS) 시드 실행 (권장)

- 파일: `scripts/seedjs.js`

```bash
# webapp 디렉토리에서
npm install @supabase/supabase-js

# 실행 (Windows PowerShell)
node scripts/seedjs.js
```

내용:
- 관리자 API로 가짜 유저 생성(email 확인 처리)
- 각 프로필 테이블에 더미 데이터 삽입

### (선택) SQL 빠른 시드

- Supabase SQL Editor에서 사용자 UUID 배열을 채운 뒤 실행:
  - `backoffice/seed/seed_profiles.sql`

### (선택) TypeScript 시드 (ESM 필요)

- 파일: `scripts/seed.ts`
- 실행 예:

```bash
npm install @supabase/supabase-js dotenv ts-node
npx ts-node --esm scripts/seed.ts
```

### 리셋 실행 (CommonJS)

```bash
node scripts/resetjs.js
```

리셋 스크립트는 `dummy-*@bridge.com` 형태의 가짜 유저를 검색해 관련 `profile_*` 레코드 삭제 후 `auth.users`를 제거합니다.



You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
