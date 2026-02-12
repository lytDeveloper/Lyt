# React Performance Rules (BridgeApp)
> React/Performance 판단의 단일 기준 문서

## Stack Assumptions (Current)
- Vite SPA: `webapp/` (no SSR/RSC/hydration).
- Router: React Router v7 (`webapp/src/main.tsx`).
- Data/State: TanStack Query + Zustand.
- WebView container: Expo + React Native (`expo-shell/App.tsx`).

## Classification
- APPLY: 기본값으로 강력 추천. 대부분의 변경/리뷰에서 적용.
- ADAPT: 상황/맥락에 따라 조정해서 적용 (조건/주의 포함).
- IGNORE: 현 스택에서는 전제 조건이 달라 적용 대상 아님.

---

# APPLY

## Eliminating Waterfalls (async)

### Defer Await Until Needed (`async-defer-await`)
- Why: 불필요한 직렬 대기를 줄여 응답 시간을 단축한다.
- When to use: 결과가 모든 경로에서 필요하지 않은 경우.
- How: `supabase/functions/*/index.ts`, `webapp/src/hooks/*`에서 Promise를 먼저 만들고 분기 내부에서 await.
- Measure: 전체 처리 시간, waterfall depth (Sentry trace or console timing).

### Promise.all() for Independent Operations (`async-parallel`)
- Why: 독립 작업을 병렬화해 네트워크 대기 시간을 줄인다.
- When to use: 상호 의존성이 없는 여러 요청/연산.
- How: `Promise.all`을 `webapp/src/hooks/*`, `supabase/functions/*/index.ts`에서 사용.
- Measure: 병렬화 전/후 함수 실행 시간, 네트워크 요청 타임라인.

### Dependency-Based Parallelization (`async-dependencies`)
- Why: 일부 의존성만 순차 처리하고 나머지는 병렬화해 지연을 줄인다.
- When to use: A 결과가 B에만 필요하고 C는 독립적인 경우.
- How: A 요청을 시작하고, C는 즉시 병렬 실행 후 B에서 A를 await.
- Measure: Critical path 길이, TTFB/응답시간.

## Bundle Size Optimization (bundle)

### Avoid Barrel File Imports (`bundle-barrel-imports`)
- Why: Barrel import는 불필요한 모듈까지 포함해 번들을 키운다.
- When to use: 컴포넌트/유틸이 많은 폴더에서 `index.ts`를 경유할 때.
- How: `webapp/src/components/*`, `backoffice/src/*`에서 직접 경로 import 사용.
- Measure: 번들 크기, tree-shaking 결과 (`dist/assets`).

### Conditional Module Loading (`bundle-conditional`)
- Why: 사용 빈도가 낮은 기능을 초기 번들에서 제외한다.
- When to use: 모달, 에디터, 관리자 전용 UI 등.
- How: `import()` 또는 React.lazy로 분기 로딩 (예: `webapp/src/components/*`).
- Measure: 초기 JS payload, First Load JS size.

### Dynamic Imports for Heavy Components (`bundle-dynamic-imports`)
- Why: 초기 로드 비용을 줄이고 라우트 전환을 빠르게 만든다.
- When to use: 라우트 단위 페이지나 큰 위젯.
- How: `webapp/src/routes/lazyPages.tsx` 패턴 유지, `main.tsx`에서 필요 시에만 eager import.
- Measure: 라우트 청크 크기, 라우트 전환 LCP.

### Preload Based on User Intent (`bundle-preload`)
- Why: 클릭 직전 미리 로드해 전환 체감 속도를 개선한다.
- When to use: 클릭 확률이 높은 링크/탭.
- How: `webapp/src/components/common/PrefetchLink.tsx`, `Explore/BottomNavigationBar`의 query prefetch 유지.
- Measure: 라우트 전환 시간, 캐시 히트율.

## Client-Side Data Fetching (client)

### Deduplicate Global Event Listeners (`client-event-listeners`)
- Why: 중복 등록은 과도한 실행과 누수를 만든다.
- When to use: `message/scroll/touch` 같은 전역 이벤트.
- How: `NativeBridgeListener`, `PullToRefreshHandler`에서 1회 등록 + cleanup 보장.
- Measure: 리스너 수, 이벤트 핸들러 호출 횟수.

### Version and Minimize localStorage Data (`client-localstorage-schema`)
- Why: 큰/무버전 저장은 파싱 비용과 오류를 키운다.
- When to use: 세션/캐시/토큰 저장.
- How: `featureFlags.ts`, `NativeBridgeListener`의 key 버전 유지, payload 최소화.
- Measure: 저장 용량, read/parse 시간.

### Use Passive Event Listeners for Scrolling Performance (`client-passive-event-listeners`)
- Why: 스크롤 성능을 높이고 main thread 차단을 줄인다.
- When to use: `scroll/touch` 이벤트에서 preventDefault가 불필요할 때.
- How: `{ passive: true }` 유지 (`useScrollRestoration`), 필요 시에만 `{ passive: false }` (`PullToRefreshHandler`).
- Measure: 스크롤 jank, DevTools warning.

## Re-render Optimization (rerender)

### Defer State Reads to Usage Point (`rerender-defer-reads`)
- Why: 불필요한 구독은 렌더를 증가시킨다.
- When to use: 값이 콜백 내부에서만 필요할 때.
- How: 핸들러 내부에서 읽거나 Zustand selector로 최소 구독 (`webapp/src/stores/*`).
- Measure: React Profiler 렌더 횟수.

### Narrow Effect Dependencies (`rerender-dependencies`)
- Why: 불안정한 deps는 effect를 반복 실행시킨다.
- When to use: 배열/객체를 deps로 쓰는 훅.
- How: primitive로 축소하거나 memoize (`webapp/src/hooks/*`).
- Measure: effect rerun 횟수.

### Subscribe to Derived State (`rerender-derived-state`)
- Why: 큰 객체 구독은 변경 감지를 과도하게 만든다.
- When to use: boolean/숫자만 필요할 때.
- How: selector로 derived 값만 구독 (`webapp/src/stores/*`).
- Measure: 렌더 횟수, props 변경 빈도.

### Use Functional setState Updates (`rerender-functional-setstate`)
- Why: stale closure를 방지하고 deps를 줄인다.
- When to use: 이전 상태에 의존하는 업데이트.
- How: `setState(prev => ...)` 패턴 사용.
- Measure: 불필요한 렌더/버그 감소.

### Use Lazy State Initialization (`rerender-lazy-state-init`)
- Why: 초기화 비용을 첫 렌더에만 지불한다.
- When to use: 초기값 계산이 비싸거나 I/O가 있는 경우.
- How: `useState(() => initialValue)` 사용.
- Measure: 초기 렌더 시간.

### Extract to Memoized Components (`rerender-memo`)
- Why: 무거운 자식 컴포넌트를 불필요하게 다시 렌더하지 않는다.
- When to use: props가 안정적이고 렌더 비용이 큰 컴포넌트.
- How: `React.memo`로 카드/리스트 아이템 최적화 (`webapp/src/components/*`).
- Measure: React Profiler commit 시간.

### Extract Default Non-primitive Parameter Value from Memoized Component to Constant (`rerender-memo-with-default-value`)
- Why: 기본 객체/배열 생성은 memo 무효화를 유발한다.
- When to use: memoized 컴포넌트의 default params.
- How: module-level const로 분리해 전달.
- Measure: memo hit rate.

### Do not wrap a simple expression with a primitive result type in useMemo (`rerender-simple-expression-in-memo`)
- Why: useMemo 오버헤드가 더 클 수 있다.
- When to use: 계산이 단순하고 결과가 primitive일 때.
- How: inline 계산으로 단순화.
- Measure: render time, hook count.

### Use Transitions for Non-Urgent Updates (`rerender-transitions`)
- Why: UI 입력 지연(INP)을 줄인다.
- When to use: 검색, 필터, 정렬 등 비긴급 업데이트.
- How: `startTransition`으로 상태 업데이트 래핑.
- Measure: INP, 입력 응답 시간.

## Rendering Performance (rendering)

### Animate SVG Wrapper Instead of SVG Element (`rendering-animate-svg-wrapper`)
- Why: SVG 직접 변형은 repaint 비용이 크다.
- When to use: 아이콘/로더 애니메이션.
- How: wrapper div에 transform 적용.
- Measure: FPS, paint 비용.

### Use Explicit Conditional Rendering (`rendering-conditional-render`)
- Why: `&&`는 falsey 값을 렌더할 수 있어 예측이 어렵다.
- When to use: 조건부 UI.
- How: 삼항 연산자 사용.
- Measure: UI 이상 동작 감소.

### CSS content-visibility for Long Lists (`rendering-content-visibility`)
- Why: offscreen 렌더링을 건너뛰어 스크롤 성능을 개선한다.
- When to use: 피드/리스트가 길 때.
- How: `Explore/Lounge` 리스트 아이템에 `content-visibility: auto`.
- Measure: 스크롤 성능, 렌더링 시간.

### Hoist Static JSX Elements (`rendering-hoist-jsx`)
- Why: 정적 JSX를 매 렌더마다 새로 생성하지 않는다.
- When to use: 아이콘, 라벨 등 변하지 않는 JSX.
- How: 컴포넌트 외부로 상수 이동.
- Measure: 렌더 비용 감소.

### Optimize SVG Precision (`rendering-svg-precision`)
- Why: 과도한 정밀도는 DOM/페인트 비용을 키운다.
- When to use: 커스텀 SVG 자산.
- How: SVG path precision 축소 후 assets 교체.
- Measure: SVG 파일 크기, 페인트 시간.

## JavaScript Performance (js)

### Avoid Layout Thrashing (`js-batch-dom-css`)
- Why: layout read/write가 교차되면 reflow가 반복된다.
- When to use: 직접 DOM 조작이나 스타일 변경.
- How: class 토글/일괄 변경 (예: `webapp/index.html` 스크립트).
- Measure: layout thrash 이벤트, CPU.

### Cache Repeated Function Calls (`js-cache-function-results`)
- Why: 반복 계산 비용을 줄인다.
- When to use: 동일 입력의 반복 호출.
- How: module-level Map 캐싱 (`webapp/src/utils/*`).
- Measure: CPU time.

### Cache Property Access in Loops (`js-cache-property-access`)
- Why: 루프 내 반복 접근 비용 절감.
- When to use: 대량 배열/객체 반복.
- How: `const value = obj.prop`로 캐싱.
- Measure: CPU time.

### Cache Storage API Calls (`js-cache-storage`)
- Why: storage 접근은 느리다.
- When to use: 반복되는 localStorage/sessionStorage read.
- How: 메모리 캐싱 패턴 유지 (`featureFlags.ts`).
- Measure: storage access 횟수.

### Combine Multiple Array Iterations (`js-combine-iterations`)
- Why: 다중 순회를 줄여 CPU 사용 감소.
- When to use: filter+map chain이 커질 때.
- How: 단일 loop로 통합.
- Measure: CPU time.

### Early Return from Functions (`js-early-exit`)
- Why: 불필요한 연산을 피한다.
- When to use: 조건 불일치 시.
- How: guard clause 패턴 (`NativeBridgeListener` 참고).
- Measure: 함수 실행 시간.

### Hoist RegExp Creation (`js-hoist-regexp`)
- Why: 루프 안 정규식 생성 비용 절감.
- When to use: 반복 매칭 로직.
- How: RegExp를 루프 밖 상수로 이동.
- Measure: CPU time.

### Build Index Maps for Repeated Lookups (`js-index-maps`)
- Why: O(n) 검색을 O(1)로 줄인다.
- When to use: id 기반 반복 조회.
- How: Map으로 인덱스 구성 후 조회.
- Measure: lookup 시간.

### Early Length Check for Array Comparisons (`js-length-check-first`)
- Why: 깊은 비교 이전에 빠른 탈출.
- When to use: 배열 동등성 비교.
- How: length 먼저 비교.
- Measure: 비교 시간.

### Use Loop for Min/Max Instead of Sort (`js-min-max-loop`)
- Why: sort는 O(n log n), loop는 O(n).
- When to use: min/max 계산.
- How: 단일 loop 사용.
- Measure: CPU time.

### Use Set/Map for O(1) Lookups (`js-set-map-lookups`)
- Why: includes/indexOf보다 빠르다.
- When to use: membership check가 빈번할 때.
- How: Set/Map으로 변환 후 조회.
- Measure: lookup 시간.

## Advanced Patterns (advanced)

### Store Event Handlers in Refs (`advanced-event-handler-refs`)
- Why: 핸들러 변경으로 인한 리스너 재등록을 피한다.
- When to use: 전역 이벤트 리스너/브리지 핸들러.
- How: `useRef`에 최신 핸들러 저장 후 리스너는 고정.
- Measure: 리스너 등록 횟수, 렌더 수.

---

# ADAPT

### Prevent Waterfall Chains in API Routes (`async-api-routes`)
- Why: 서버 함수 내부 직렬 await는 응답 지연을 키운다.
- When to use: Edge Function/서버 로직 (`supabase/functions/*`).
- How: Supabase query를 먼저 시작하고 필요 시점에 await; parallelize 독립 작업.
- Measure: 함수 실행 시간, cold start 대비.

### Strategic Suspense Boundaries (`async-suspense-boundaries`)
- Why: 긴 작업을 경계로 분리해 UI 응답성을 유지한다.
- When to use: 코드 스플릿 + 향후 Suspense 데이터 로딩 도입 시.
- How: 현재는 라우트 lazy + `PageLoadingFallback`; 데이터 suspense는 도입 시점에 평가.
- Measure: 전환 시 fallback 노출 시간, LCP.

### Defer Non-Critical Third-Party Libraries (`bundle-defer-third-party`)
- Why: 초기 번들 크기와 실행 시간을 줄인다.
- When to use: 분석/로그 등 핵심이 아닌 SDK.
- How: 필요 시점에 `import()`로 로드. 단, Sentry처럼 초기 오류 캡처가 필요한 것은 제외.
- Measure: 초기 JS 크기, TTI.

### Use SWR for Automatic Deduplication (`client-swr-dedup`)
- Why: 중복 요청을 줄여 네트워크 비용 절감.
- When to use: 이 스택에서는 React Query로 동일 목표 달성.
- How: `webapp/src/lib/queryClient.ts` 정책 유지 + 적절한 queryKey 구성.
- Measure: 중복 요청 수, 캐시 hit rate.

### Use toSorted() Instead of sort() for Immutability (`js-tosorted-immutable`)
- Why: 불변성을 유지하며 정렬 사이드이펙트를 방지한다.
- When to use: 대상 런타임이 `toSorted()`를 지원하거나 polyfill이 있을 때.
- How: 미지원 환경에서는 `array.slice().sort()`로 대체.
- Measure: 버그 감소, 불변성 위반 여부.

### Use Activity Component for Show/Hide (`rendering-activity`)
- Why: DOM/state 유지로 토글 비용을 줄인다.
- When to use: React 19 환경에서 토글이 잦은 무거운 컴포넌트.
- How: webapp(React 18)에서는 CSS visibility/keep-mounted 패턴으로 대체.
- Measure: 토글 시 렌더 시간, state 유지 여부.

### useEffectEvent for Stable Callback Refs (`advanced-use-latest`)
- Why: 최신 콜백을 유지하며 리스너 재등록을 피한다.
- When to use: React 19의 `useEffectEvent` 사용 가능 시.
- How: webapp(React 18)은 `useRef` 기반 `useLatest` 패턴으로 대체.
- Measure: 리스너 재등록 횟수, 버그 감소.

---

# IGNORE

### Prevent Hydration Mismatch Without Flickering (`rendering-hydration-no-flicker`)
- Why: SSR/hydration 전제가 없다 (Vite SPA).
- When to use: SSR/Next 도입 시.
- How: SSR 도입 시에만 검토.
- Measure: Hydration mismatch 로그, CLS.

### Use after() for Non-Blocking Operations (`server-after-nonblocking`)
- Why: Next.js 서버 환경 전제.
- When to use: Next/SSR 도입 시.
- How: 서버 런타임 전환 후 적용.
- Measure: TTFB, 서버 처리 시간.

### Authenticate Server Actions Like API Routes (`server-auth-actions`)
- Why: Server Actions/RSC 전제.
- When to use: Next.js Server Actions 도입 시.
- How: 인증/인가 정책 수립 후 적용.
- Measure: 보안 이벤트, 에러율.

### Cross-Request LRU Caching (`server-cache-lru`)
- Why: 장기 서버 프로세스 전제.
- When to use: Next/서버 런타임에서 캐시 계층 도입 시.
- How: 서버 캐시 전략 설계 후 적용.
- Measure: 캐시 hit ratio, TTFB.

### Per-Request Deduplication with React.cache() (`server-cache-react`)
- Why: React Server Components 전제.
- When to use: RSC 도입 시.
- How: RSC 환경에서만 검토.
- Measure: 서버 렌더 시간, 중복 요청 수.

### Avoid Duplicate Serialization in RSC Props (`server-dedup-props`)
- Why: RSC/SSR 직렬화 전제.
- When to use: RSC 도입 시.
- How: RSC 데이터 전달 구조 설계 후 적용.
- Measure: 직렬화 크기, 응답 시간.

### Parallel Data Fetching with Component Composition (`server-parallel-fetching`)
- Why: Server Component 기반 데이터 패칭 전제.
- When to use: SSR/RSC 도입 시.
- How: 서버 컴포넌트 설계 후 적용.
- Measure: 서버 waterfall depth.

### Minimize Serialization at RSC Boundaries (`server-serialization`)
- Why: RSC 경계 직렬화 전제.
- When to use: RSC 도입 시.
- How: 서버/클라이언트 경계 설계 후 적용.
- Measure: payload 크기, TTFB.

# WebView Guardrails (Mobile-Specific Constraints)
> These rules override or constrain APPLY/ADAPT items when running inside iOS/Android WebViews.

