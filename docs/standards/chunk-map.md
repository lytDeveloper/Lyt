# BridgeApp Chunk Map (Learning Units)

| Chunk Name | Path | Reason | Keywords |
|---|---|---|---|
| Webapp Entry & Boot | `webapp/index.html`, `webapp/src/main.tsx` | 앱 부팅/프로바이더/초기 UX 기준 | entry, providers, skeleton, router |
| Routing & Guards | `webapp/src/routes/*` | 라우팅/권한/리다이렉트 흐름 이해 | react-router, guards, lazy |
| State Stores | `webapp/src/stores/*` | 클라이언트 상태 구조 파악 | zustand, persist |
| Data Fetching Hooks | `webapp/src/hooks/*` | 서버 상태/쿼리 설계 이해 | tanstack-query, cache |
| Supabase Client & Services | `webapp/src/lib/supabase.ts`, `webapp/src/services/*` | 백엔드 연동 표준 | supabase, rpc, storage |
| Notifications & Realtime | `webapp/src/hooks/useNotificationRealtime.ts`, `webapp/src/components/notification/*` | 실시간/알림 흐름 | realtime, invalidation |
| Native Bridge | `webapp/src/components/native/*`, `webapp/src/utils/nativeShare.ts`, `webapp/src/types/webview.d.ts` | WebView 메시지 규약 | postMessage, push, share |
| UI Components | `webapp/src/components/*` | 공용 UI 패턴 정리 | cards, modals, layouts |
| Pages | `webapp/src/pages/*` | 화면 단위 도메인 맥락 | home, explore, lounge |
| Performance Utilities | `webapp/src/utils/lazyWithRetry.ts`, `webapp/src/hooks/useScrollRestoration.ts` | 성능 최적화 기술 모음 | lazy, retry, scroll |
| Expo Shell | `expo-shell/App.tsx`, `expo-shell/lib/*` | 네이티브 컨테이너 동작 | webview, push, boot |
| Supabase Edge Functions | `supabase/functions/*` | 서버 로직/트리거 이해 | edge functions, deno |
| Backoffice App | `backoffice/src/*` | 관리자 앱 구조 파악 | admin, ant design |
| Landing & Assets | `landing/*`, `assets/*` | 마케팅/브랜드 리소스 | static, marketing |
