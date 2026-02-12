# BridgeApp Stack Context
> Last verified: 2026-01-22

## Repository Structure (Workspace)
- webapp/: Vite + React SPA (main product UI).
- expo-shell/: Expo + React Native shell hosting the WebView.
- backoffice/: Vite + React admin app.
- supabase/: database migrations + edge functions.
- assets/, landing/, supabase-mcp-server/: shared assets, marketing site, local MCP utilities.

## Webapp (Vite SPA)

### Framework & Libraries (from `webapp/package.json`)
- React 18.3.1, React Router 7.9.4, Vite 7.1.7.
- UI: MUI 7.3.4 + Emotion.
- State: Zustand 5.0.8.
- Server state: TanStack Query 5.x.
- Monitoring: Sentry 10.x.

### Entry & Routing
- Entry HTML: `webapp/index.html` loads `webapp/src/main.tsx`.
- Router: `BrowserRouter` + `Routes/Route` in `webapp/src/main.tsx` (React Router v7 from `webapp/package.json`).
- Guards: `webapp/src/routes/Guards.tsx` (RootRedirect / ProtectedRoute).
- Lazy routes: route-level React.lazy exports in `webapp/src/routes/lazyPages.tsx`.
- Home is eagerly imported in `webapp/src/main.tsx` (first screen optimization).

### State & Data
- Client state: Zustand stores in `webapp/src/stores/*`.
- Server state: TanStack Query in `webapp/src/lib/queryClient.ts` (staleTime 60s, gcTime 5m, refetchOnWindowFocus false, retry 1, placeholderData).
- Backend access: Supabase client in `webapp/src/lib/supabase.ts`.
- Edge/server logic: Supabase Edge Functions in `supabase/functions/*/index.ts`.
- Direct fetch usage exists but limited (e.g., `webapp/src/hooks/useDefaultImages.tsx`, `webapp/src/services/fileUploadService.ts`).

### Error Handling, Logging, Monitoring
- ErrorBoundary in `webapp/src/components/common/ErrorBoundary.tsx` (console logging + retry UI).
- Sentry initialized in `webapp/src/main.tsx`; chunk-load telemetry in `webapp/src/utils/lazyWithRetry.ts`.
- Custom telemetry helpers: `webapp/src/lib/featureFlags.ts` + `webapp/src/lib/stabilityTelemetry.ts` (console logging in dev).

### Code Splitting & Performance Techniques
- Route-based code splitting via React.lazy in `webapp/src/routes/lazyPages.tsx`.
- Suspense fallback `PageLoadingFallback` used in `webapp/src/main.tsx`.
- Chunk-load retry + guarded reload in `webapp/src/utils/lazyWithRetry.ts`.
- Initial skeleton UI + preconnect to Supabase in `webapp/index.html`.
- Prefetch patterns:
  - `webapp/src/components/common/PrefetchLink.tsx` (hover prefetch).
  - `webapp/src/pages/Main/Explore.tsx` + `webapp/src/components/navigation/BottomNavigationBar.tsx` (query prefetch).
- Pull-to-refresh handler in `webapp/src/main.tsx` (touch listeners + reload).
- Scroll restoration hook exists at `webapp/src/pages/profile/ActivityListPage.tsx`

### WebView Bridge & Native Touchpoints
- Web-to-native messaging via `window.ReactNativeWebView.postMessage`:
  - `webapp/src/components/native/NativeBridgeListener.tsx`
  - `webapp/src/utils/nativeShare.ts`
- NativeBridgeListener handles push tokens/open, nav sync, boot hints, session refresh, and cache invalidation.
- WebView-specific UX tweaks in `webapp/index.html` (image drag prevention, tap highlight removal, iOS input zoom prevention).

## Expo Shell (React Native WebView)
- WebView host: `expo-shell/App.tsx` uses `react-native-webview` with navigation sync + Android back handling.
- Push notifications: `expo-notifications` in `expo-shell/App.tsx`, tokens sent to web via postMessage.
- Sentry for RN initialized in `expo-shell/App.tsx`.
- Boot/app-state tracking uses AsyncStorage in `expo-shell/lib/bootTypeManager.ts`.

## Backoffice (Admin)
- Vite + React (React 19.1.1 per `backoffice/package.json`) + React Router + Ant Design.
- Entry point: `backoffice/src/main.tsx`.

## Supabase
- Edge functions: `supabase/functions/*` (Deno).
- Migrations: `supabase/migrations/*`.

## Unknown / Not Verified
- No evidence of SSR/Next.js, service worker, or custom bundler chunking beyond Vite defaults.
- Analytics/monitoring beyond Sentry + local telemetry not found in repo scan.
