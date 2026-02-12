# Week 4: Realtime Updates & Infinite Scroll - Implementation Plan

**Date**: 2025-01-28
**Status**: 🚧 Planning

---

## 🎯 Objectives

1. **Realtime Subscriptions**: Listen to database changes and auto-update UI
2. **Cache Invalidation**: Automatically refetch when data changes
3. **Infinite Scroll**: Load more items as user scrolls down
4. **Cursor-based Pagination**: Efficient pagination in Edge Function
5. **Integration Testing**: Ensure realtime + infinite scroll work together

---

## 🏗️ Architecture Design

### 1. Realtime Subscription Strategy

#### Tables to Monitor
```typescript
const REALTIME_TABLES = {
  projects: 'public:projects',
  collaborations: 'public:collaborations',
  // Partners is a VIEW, not a table - need to subscribe to base tables
  profile_artists: 'public:profile_artists',
  profile_creatives: 'public:profile_creatives',
};
```

#### Event Types to Handle
```typescript
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

// Example event payload
{
  eventType: 'INSERT',
  table: 'projects',
  new: { id: '...', title: '...', category: 'fashion', ... },
  old: null,
}
```

#### Subscription Lifecycle
```
User enters /explore
  ↓
Subscribe to realtime channels
  ↓
Listen for INSERT/UPDATE/DELETE
  ↓
Invalidate React Query cache
  ↓
React Query refetches automatically
  ↓
UI updates smoothly
  ↓
User leaves /explore
  ↓
Unsubscribe from channels
```

---

### 2. Cache Invalidation Strategy

#### React Query Cache Structure (Infinite Queries)
```typescript
// Query key structure
['explore', category, statuses, searchQuery]

// Cache data structure (useInfiniteQuery)
{
  pages: [
    { projects: [...], collaborations: [...], partners: [...], nextCursor: '...' },
    { projects: [...], collaborations: [...], partners: [...], nextCursor: '...' },
  ],
  pageParams: [undefined, 'cursor1', 'cursor2', ...],
}
```

#### Invalidation Rules

| Event | Table | Action | Reason |
|-------|-------|--------|--------|
| **INSERT** | Any | `invalidateQueries(['explore'])` | New item might appear in current view |
| **UPDATE** | Any | `invalidateQueries(['explore'])` | Item properties changed (status, category, etc.) |
| **DELETE** | Any | `invalidateQueries(['explore'])` | Item should be removed from view |

**Why simple invalidation?**
- Ensures data consistency
- Avoids complex cache manipulation
- React Query handles refetch efficiently (only visible pages)
- "My Items" priority requires full refetch anyway

#### Smart Invalidation (Optional Enhancement)
```typescript
// Only invalidate if event affects current view
const shouldInvalidate = (event: RealtimeEvent, currentFilters: Filters) => {
  // Example: Only invalidate if category matches
  if (event.new?.category !== currentFilters.category) return false;

  // Example: Only invalidate if status matches
  if (!currentFilters.statuses.includes(event.new?.status)) return false;

  return true;
};
```

---

### 3. Infinite Scroll Implementation

#### useInfiniteQuery Structure

```typescript
const {
  data,           // { pages: [...], pageParams: [...] }
  fetchNextPage,  // Function to load next page
  hasNextPage,    // Boolean: is there more data?
  isFetchingNextPage,  // Loading state for next page
} = useInfiniteQuery({
  queryKey: ['explore', category, statuses, searchQuery],
  queryFn: ({ pageParam }) => fetchExploreBatch({
    category,
    statuses,
    searchQuery,
    cursor: pageParam,  // undefined for first page
    limit: 10,
  }),
  initialPageParam: undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,  // null if no more pages
});

// Flatten pages into single array
const projects = data?.pages.flatMap(page => page.projects) ?? [];
const collaborations = data?.pages.flatMap(page => page.collaborations) ?? [];
const partners = data?.pages.flatMap(page => page.partners) ?? [];
```

#### Scroll Detection

**Option A: IntersectionObserver (Recommended)**
```typescript
const loadMoreRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });

  if (loadMoreRef.current) {
    observer.observe(loadMoreRef.current);
  }

  return () => observer.disconnect();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

// In JSX
<div ref={loadMoreRef} style={{ height: 1 }} />
```

**Option B: Scroll Event (Fallback)**
```typescript
const handleScroll = () => {
  const scrollHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY;
  const clientHeight = window.innerHeight;

  if (scrollTop + clientHeight >= scrollHeight - 100) {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }
};

useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [hasNextPage, isFetchingNextPage]);
```

---

### 4. Cursor-based Pagination (Edge Function)

#### Why Cursor-based vs Offset-based?

| Aspect | Offset-based | Cursor-based |
|--------|-------------|--------------|
| **Query** | `LIMIT 10 OFFSET 20` | `WHERE created_at < '...' LIMIT 10` |
| **Performance** | ❌ Slow for large offsets | ✅ Fast with index |
| **Consistency** | ❌ Duplicates if data changes | ✅ No duplicates |
| **Complexity** | ✅ Simple | ⚠️ Moderate |

**Decision**: Use **cursor-based** for better performance and consistency

#### Cursor Design

**Option 1: Timestamp-based (Recommended)**
```typescript
// Cursor format: ISO timestamp
const cursor = '2025-01-28T10:30:00.000Z';

// Query
SELECT * FROM projects
WHERE created_at < '2025-01-28T10:30:00.000Z'
ORDER BY created_at DESC
LIMIT 10;

// Next cursor
const nextCursor = results[results.length - 1]?.created_at;
```

**Option 2: ID-based**
```typescript
// Cursor format: UUID
const cursor = '123e4567-e89b-12d3-a456-426614174000';

// Query (requires composite index on id + created_at)
SELECT * FROM projects
WHERE id < '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC, id DESC
LIMIT 10;
```

**Selected**: **Timestamp-based** (simpler, already have created_at index)

---

### 5. "My Items" Priority with Pagination

#### Challenge
- First page should show user's items first
- Subsequent pages should continue with others' items
- Cursor must track both "mine" and "others" state

#### Solution: Hybrid Approach

**Page 1**:
```sql
-- Fetch user's items (up to limit)
SELECT * FROM projects WHERE created_by = userId ORDER BY created_at DESC LIMIT 10;

-- If count < limit, fetch others to fill
SELECT * FROM projects WHERE created_by != userId ORDER BY created_at DESC LIMIT (10 - count);
```

**Page 2+**:
```sql
-- Only fetch others' items
SELECT * FROM projects
WHERE created_by != userId
  AND created_at < cursor
ORDER BY created_at DESC
LIMIT 10;
```

**Cursor Format**:
```typescript
interface PaginationCursor {
  timestamp: string;      // created_at of last item
  isMyItemsComplete: boolean;  // true if all user's items loaded
}

// Encode as base64 for URL safety
const encodedCursor = btoa(JSON.stringify(cursor));
```

---

## 📋 Implementation Steps

### Step 1: Update Edge Function for Pagination ✅

**File**: `supabase/functions/explore-feed/index.ts`

**Changes**:
1. Add `cursor` parameter to request body
2. Modify queries to use `WHERE created_at < cursor`
3. Return `nextCursor` in response
4. Handle "My Items" priority with cursor

**New Request Interface**:
```typescript
interface RequestBody {
  category?: string;
  statuses: string[];
  searchQuery?: string;
  limit?: number;
  cursor?: string;  // NEW: ISO timestamp
  userId?: string;
}
```

**New Response Interface**:
```typescript
interface ExploreBatchResult {
  projects: Project[];
  collaborations: Collaboration[];
  partners: Partner[];
  nextCursor: string | null;  // NEW: null if no more data
}
```

---

### Step 2: Create Realtime Hook ✅

**File**: `webapp/src/hooks/useExploreRealtime.ts`

**Responsibilities**:
- Subscribe to Supabase Realtime channels
- Listen for INSERT/UPDATE/DELETE events
- Invalidate React Query cache on changes
- Cleanup subscriptions on unmount

**API**:
```typescript
useExploreRealtime({
  category: 'fashion',
  enabled: true,  // Enable/disable subscriptions
  onInvalidate: () => console.log('Cache invalidated'),
});
```

---

### Step 3: Convert to useInfiniteQuery ✅

**File**: `webapp/src/hooks/useExploreFeed.ts`

**Changes**:
1. Replace `useQuery` with `useInfiniteQuery`
2. Add `getNextPageParam` to extract cursor
3. Update return type to include infinite query helpers
4. Keep prefetching logic for categories

**New API**:
```typescript
const {
  data,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  prefetchOtherCategories,
} = useExploreFeed(category, statuses, searchQuery);

// Flatten pages
const projects = data?.pages.flatMap(p => p.projects) ?? [];
```

---

### Step 4: Update Explore.tsx for Infinite Scroll ✅

**File**: `webapp/src/pages/Main/Explore.tsx`

**Changes**:
1. Update to use new `useExploreFeed` API
2. Add IntersectionObserver for scroll detection
3. Add "Load More" button (fallback)
4. Add loading spinner for next page
5. Integrate `useExploreRealtime` hook

**UI Components**:
```tsx
// Loading indicator
{isFetchingNextPage && <CircularProgress />}

// Load more trigger (invisible)
<div ref={loadMoreRef} style={{ height: 1 }} />

// Manual load button (fallback)
{hasNextPage && !isFetchingNextPage && (
  <Button onClick={() => fetchNextPage()}>더 보기</Button>
)}
```

---

### Step 5: Testing ✅

**Test Cases**:

1. **Infinite Scroll**:
   - [ ] Scroll down, next page loads automatically
   - [ ] No duplicate items across pages
   - [ ] "My Items" appear first on page 1
   - [ ] Loading indicator shows while fetching

2. **Realtime Updates**:
   - [ ] Insert new project → appears in feed
   - [ ] Update project status → reflects in UI
   - [ ] Delete project → removed from feed
   - [ ] Category change → item appears/disappears correctly

3. **Integration**:
   - [ ] Realtime update during infinite scroll works
   - [ ] Tab switching maintains scroll position
   - [ ] Search filtering resets scroll
   - [ ] Network error handling

---

## 🛡️ Defensive Programming

**Cursor Safety**:
```typescript
// ✅ GOOD: Handle invalid cursor
const parseCursor = (cursor: string | null | undefined): Date | null => {
  if (!cursor) return null;

  try {
    const date = new Date(cursor);
    if (isNaN(date.getTime())) return null;  // Invalid date
    return date;
  } catch {
    return null;
  }
};
```

**Realtime Event Safety**:
```typescript
// ✅ GOOD: Validate event payload
const handleRealtimeEvent = (event: RealtimePayload) => {
  if (!event?.new && !event?.old) {
    console.warn('[Realtime] Invalid event payload', event);
    return;
  }

  queryClient.invalidateQueries({ queryKey: ['explore'] });
};
```

**Infinite Scroll Safety**:
```typescript
// ✅ GOOD: Prevent multiple simultaneous fetches
const [isFetching, setIsFetching] = useState(false);

const handleFetchNext = async () => {
  if (isFetching || !hasNextPage) return;

  setIsFetching(true);
  try {
    await fetchNextPage();
  } finally {
    setIsFetching(false);
  }
};
```

---

## 📊 Performance Considerations

### Realtime Subscription Limits
- Supabase Free Tier: 200 concurrent connections
- Each user = 3 subscriptions (projects, collaborations, partners)
- Max users: ~60 concurrent

**Mitigation**:
- Unsubscribe when tab not visible (`document.visibilityState`)
- Debounce invalidation (max 1 per second)

### Cache Size Management
```typescript
// Limit infinite query pages to prevent memory issues
const { data } = useInfiniteQuery({
  // ... config
  maxPages: 10,  // Only keep 10 pages in cache (100 items)
});
```

### Network Optimization
```typescript
// Prefetch next page before reaching bottom
const observer = new IntersectionObserver(..., {
  rootMargin: '200px',  // Prefetch 200px before trigger
});
```

---

## 🎯 Success Criteria

- [ ] Infinite scroll loads 10 items per page
- [ ] Realtime updates reflect within 2 seconds
- [ ] No duplicate items in feed
- [ ] "My Items" priority maintained across pages
- [ ] TypeScript compilation passes
- [ ] No console errors or warnings
- [ ] Smooth scrolling performance (60fps)

---

## 📝 Next Steps

After Week 4 completion:
- **Week 5**: Testing, documentation, performance monitoring
- **Production**: Deploy all optimizations together
- **Analytics**: Track metrics (load time, realtime latency, etc.)

---

**Status**: 🚧 Planning Complete - Ready for Implementation
