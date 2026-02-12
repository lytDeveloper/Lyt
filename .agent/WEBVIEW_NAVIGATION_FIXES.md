# WebView Navigation Fixes - Implementation Summary

## Issue: White Screen and Navigation Failure After Background Recovery

### Symptoms
- **White Screen**: After 5+ minutes in background, clicking ProjectCard shows blank page
- **Navigation Failure**: Explore tab navigation completely fails in some cases  
- **Back Button Bug**: Home page back button navigates to SSO login page instead of exit
- **Missing Splash**: Recovered boot shows no splash screen, WebView not ready

### Root Causes Identified
1. **WebView Process Termination**: Android OS kills WebView when app is backgrounded for memory
2. **0ms Splash on Recovered Boot**: WebView loads but isn't ready for user interaction
3. **History State Issues**: `window.history.length` incorrect after WebView reload
4. **Missing Error Boundary**: Lazy-load failures show white screen instead of error
5. **Root Path Detection**: canGoBack logic doesn't account for SSO URLs in native history

---

## Implemented Fixes

### 1. Splash Screen Minimum Delay (URGENT) ✅
**File**: `expo-shell/App.tsx` (Line 443)

**Change**: 
```typescript
// Before
splashDelay = currentBootType === 'cold' ? 2000 : 0;

// After  
splashDelay = currentBootType === 'cold' ? 2000 : 500;
```

**Impact**: Ensures WebView is fully rendered before user can interact, preventing navigation failures on recovered/resume boot.

---

### 2. History State Reporting with Root Path Validation (URGENT) ✅
**File**: `webapp/src/components/native/NativeBridgeListener.tsx` (Lines 133-160)

**Changes**:
- Added 100ms delay to allow history to stabilize after WebView reload
- Added root path detection: `/home`, `/`, `/login`, `/auth/callback` always report `canGoBack=false`
- Prevents back navigation to SSO login page from Home

**Code**:
```typescript
const timer = setTimeout(() => {
  const canGoBack = window.history.length > 1;
  
  // Force canGoBack=false on root paths
  const isRootPath = ['/home', '/', '/login', '/auth/callback'].includes(location.pathname);
  const finalCanGoBack = isRootPath ? false : canGoBack;
  
  // Send to native
  (window as any).ReactNativeWebView.postMessage(JSON.stringify({
    type: 'HISTORY_STATE_REPORT',
    historyLength: window.history.length,
    currentPath: location.pathname,
    canGoBack: finalCanGoBack,
  }));
}, 100);
```

---

### 3. Error Boundary Component (HIGH) ✅
**File**: `webapp/src/components/common/ErrorBoundary.tsx` (NEW)

**Purpose**: Catches React errors during rendering, especially lazy-load failures from network issues.

**Features**:
- Catches component errors and prevents white screen
- Shows user-friendly error message with retry button
- Logs errors to console for debugging
- Supports custom fallback UI

---

### 4. Error Boundary Applied to Routes (HIGH) ✅
**File**: `webapp/src/main.tsx` (Lines 19, 533, 824)

**Change**: Wrapped `<Routes>` with `<ErrorBoundary>`

```tsx
<ErrorBoundary>
  <Routes>
    {/* All routes */}
  </Routes>
</ErrorBoundary>
```

**Impact**: All route-level errors (lazy load failures, component crashes) are caught and handled gracefully.

---

### 5. Consent Check Timeout (MEDIUM) ✅
**File**: `webapp/src/routes/Guards.tsx` (Lines 118, 163-176)

**Changes**:
- Added `consentTimeout` state
- Added 10-second timeout for consent check
- If consent check hangs, proceed anyway to avoid infinite loading

**Code**:
```typescript
useEffect(() => {
  if (consentChecked) return;
  const timer = setTimeout(() => {
    if (!consentChecked) {
      console.warn('[ProtectedRoute] Consent check timeout, proceeding anyway');
      setConsentTimeout(true);
      setConsentChecked(true);
    }
  }, 10000);
  return () => clearTimeout(timer);
}, [consentChecked]);

if (loading || isProfilePending || (!consentChecked && !consentTimeout)) {
  return <LoadingIndicator />;
}
```

---

## Testing Checklist

### Critical Scenarios
- [ ] **Long Background Test**: Home → Background 5+ min → Foreground → Explore → Click ProjectCard
  - Expected: Project detail loads normally (no white screen)
  
- [ ] **Home Back Button**: On Home page, press back button
  - Expected: Shows "press again to exit" toast (NOT SSO login page)
  
- [ ] **Explore Navigation**: Background 5 min → Return → Navigate to Explore tab
  - Expected: Explore page loads (not stuck on Home)

- [ ] **Splash Screen**: Kill app → Reopen (cold) / Background → Return (recovered)
  - Expected: Cold = 2s splash, Recovered = 0.5s splash

- [ ] **Network Failure**: Turn off network → Navigate to any lazy-loaded page
  - Expected: Shows ErrorBoundary with "페이지를 불러오는 중 오류가 발생했습니다" + retry button

- [ ] **Consent Timeout**: Mock slow consent check (delay 15s)
  - Expected: After 10s, proceeds anyway (doesn't hang forever)

### Edge Cases
- [ ] Deep link while app in background
- [ ] Rapid navigation after recovery
- [ ] Multiple tab switches immediately after recovery

---

## Technical Details

### WebView Lifecycle States
1. **Cold Boot**: App first launch → 2s splash
2. **Recovered Boot**: OS killed WebView, restarting → 0.5s splash  
3. **Resume**: App backgrounded and returned quickly → 0.5s splash

### History State Sync Flow
```
Location Change
  → Wait 100ms (history stabilizes)
  → Check if root path (/home, /, /login, /auth/callback)
    → YES: canGoBack = false (force)
    → NO: canGoBack = (history.length > 1)
  → Send HISTORY_STATE_REPORT to native
  → Native updates canGoBack state
  → Android BackHandler uses canGoBack to decide action
```

### Error Boundary Trigger Points
- Lazy component import() fails (network error)
- Component throws error during render
- Suspense fallback loads but component crashes
- useEffect/useState errors in child components

---

## Files Modified

| Priority | File | Change Summary |
|----------|------|----------------|
| 긴급 | `expo-shell/App.tsx` | Splash 500ms minimum |
| 긴급 | `webapp/src/components/native/NativeBridgeListener.tsx` | History delay + root path check |
| 높음 | `webapp/src/components/common/ErrorBoundary.tsx` | New component |
| 높음 | `webapp/src/main.tsx` | ErrorBoundary applied |
| 중간 | `webapp/src/routes/Guards.tsx` | Consent timeout |

---

## Rollback Instructions

If issues occur, revert in reverse priority order:

1. **Guards.tsx**: Remove `consentTimeout` state and timeout effect
2. **main.tsx**: Remove `<ErrorBoundary>` wrapper from Routes
3. **ErrorBoundary.tsx**: Delete file
4. **NativeBridgeListener.tsx**: Remove 100ms timeout, remove root path check
5. **App.tsx**: Change splash delay back to `0` for recovered boot

---

## Next Steps (Optional)

### Low Priority Improvements
- [ ] Review `AuthCallback.tsx` - ensure `replace: true` properly clears history
- [ ] Add telemetry for white screen occurrences
- [ ] Consider session storage for navigation state backup
- [ ] Add retry logic for lazy imports (exponential backoff)

### Monitoring
- Watch console for "[ErrorBoundary] Caught error" logs
- Monitor "[ProtectedRoute] Consent check timeout" warnings
- Track splash timing telemetry by boot type

---

## Implementation Date
2025-12-20

## Status
✅ All fixes implemented and ready for testing
