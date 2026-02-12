# 메시지 시스템 성능 개선 작업 정리

## 범위
수정된 주요 파일 경로:
- `webapp/src/stores/messageStore.ts` (신규)
- `webapp/src/hooks/useMessageRooms.ts` (신규)
- `webapp/src/hooks/useMessageMutations.ts` (신규)
- `webapp/src/hooks/useMessageRealtime.ts` (신규)
- `webapp/src/pages/messages/MessageList.tsx`
- `webapp/src/pages/messages/ChatRoom.tsx`

---

## 주요 이슈 및 대응

### 1. Zustand 메시지 스토어 생성 (`messageStore.ts`)

#### 구현 내용
- **읽음 상태 관리**: 방별 마지막 읽은 시간을 Map으로 관리
- **새 메시지 수 관리**: 방별 읽지 않은 메시지 수를 Map으로 추적
- **실시간 구독 채널 관리**: Supabase Realtime 채널 인스턴스를 Map으로 저장하여 메모리 누수 방지
- **구독 상태 추적**: Set을 사용하여 중복 구독 방지

#### Zustand 원리 설명
**Zustand**는 경량 전역 상태 관리 라이브러리입니다.

1. **불변성(Immutability) 관리**
   - `set` 함수는 새로운 상태 객체를 반환해야 합니다
   - Zustand는 내부적으로 얕은 비교를 통해 변경을 감지합니다
   - Map과 Set 같은 컬렉션을 사용할 때는 새로운 인스턴스를 생성해야 합니다
   ```typescript
   set((state) => {
     const newMap = new Map(state.lastReadAtMap); // 새 Map 인스턴스 생성
     newMap.set(roomId, timestamp);
     return { lastReadAtMap: newMap }; // 새 객체 반환
   })
   ```

2. **구독자 패턴(Observer Pattern)**
   - 스토어를 구독하는 모든 컴포넌트는 상태 변경 시 자동으로 리렌더링됩니다
   - `useMessageStore()` 훅을 사용하면 해당 컴포넌트가 스토어의 변경사항을 구독합니다
   - 선택적 구독(selective subscription)을 통해 불필요한 리렌더링을 방지할 수 있습니다

3. **중앙 집중식 상태 관리**
   - 여러 컴포넌트에서 동일한 상태를 공유할 때 React Context보다 효율적입니다
   - Provider가 필요 없어 트리 구조에 독립적입니다

#### 핵심 패턴
- **Map 사용 이유**: roomId를 키로 하는 O(1) 조회 성능
- **Set 사용 이유**: 중복 체크와 빠른 추가/제거 연산
- **get() 함수**: 액션 내에서 현재 상태에 접근할 때 사용 (예: 중복 체크)

---

### 2. React Query Hooks 생성 (`useMessageRooms.ts`)

#### 구현 내용
- `useMessageRooms(filter)`: 필터별 메시지 방 목록 조회
- `useMessages(roomId)`: 특정 방의 메시지 목록 조회
- `useMessageRoom(roomId)`: 특정 방 정보 조회

#### React Query 원리 설명

**React Query (TanStack Query)**는 서버 상태 관리 라이브러리입니다.

1. **캐싱 전략**
   ```typescript
   staleTime: 30_000, // 30초 - 이 시간 동안 데이터는 "신선함"
   gcTime: 5 * 60_000, // 5분 - 사용되지 않는 캐시 데이터 보관 시간
   ```
   - **staleTime**: 데이터가 "신선한" 상태로 간주되는 시간. 이 시간 동안은 네트워크 요청 없이 캐시 사용
   - **gcTime (이전 cacheTime)**: 컴포넌트가 언마운트된 후 캐시를 메모리에 보관하는 시간
   - 메시지는 자주 변경되므로 staleTime을 짧게 설정 (30초)

2. **Query Key 시스템**
   ```typescript
   queryKey: ['messageRooms', filter]
   queryKey: ['messages', roomId]
   ```
   - Query Key는 캐시의 고유 식별자 역할
   - 배열 형태로 계층적 구조를 표현
   - 같은 키를 가진 쿼리는 동일한 캐시를 공유
   - `invalidateQueries`로 관련 쿼리를 한 번에 무효화 가능

3. **자동 재요청 (Refetch)**
   - `refetchOnWindowFocus: false`: 창 포커스 시 자동 재요청 비활성화
   - 메시지는 실시간 구독으로 업데이트되므로 불필요한 재요청 방지
   - 수동 `refetch()` 호출 또는 `invalidateQueries()`로만 갱신

4. **Placeholder Data (이전 데이터 유지)**
   ```typescript
   placeholderData: (previousData) => previousData
   ```
   - 새로운 데이터를 가져오는 동안 이전 데이터를 표시
   - 로딩 상태 없이 부드러운 전환 효과 제공

5. **병렬 및 의존성 관리**
   - `enabled` 옵션으로 조건부 쿼리 실행
   - 여러 쿼리를 병렬로 실행하여 성능 최적화

---

### 3. Mutation Hooks 생성 (`useMessageMutations.ts`)

#### 구현 내용
- `useSendMessage()`: 메시지 전송 (Optimistic Updates 포함)
- `usePinRoom()`, `useUnpinRoom()`: 방 고정/해제
- `useToggleNotification()`: 알림 설정 토글
- `useMarkAsRead()`: 읽음 처리 (Zustand 스토어와 연동)

#### React Query Mutations 원리 설명

**Mutations**는 서버 상태를 변경하는 작업을 처리합니다.

1. **Optimistic Updates (낙관적 업데이트)**
   ```typescript
   onMutate: async ({ roomId, content, attachments }) => {
     // 1. 진행 중인 쿼리 취소 (캐시 충돌 방지)
     await queryClient.cancelQueries({ queryKey: ['messages', roomId] });
     
     // 2. 이전 상태 스냅샷 저장 (롤백용)
     const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', roomId]);
     
     // 3. 낙관적으로 캐시 업데이트
     queryClient.setQueryData(['messages', roomId], (old = []) => [
       ...old,
       optimisticMessage,
     ]);
     
     // 4. 컨텍스트 반환 (에러 시 롤백용)
     return { previousMessages };
   }
   ```
   
   **작동 원리:**
   - 서버 응답을 기다리지 않고 즉시 UI 업데이트
   - 사용자는 즉각적인 피드백을 받음
   - 서버 요청이 실패하면 `onError`에서 롤백
   - 성공하면 실제 서버 응답으로 캐시 갱신

2. **에러 처리 및 롤백**
   ```typescript
   onError: (err, variables, context) => {
     if (context?.previousMessages) {
       queryClient.setQueryData(['messages', variables.roomId], context.previousMessages);
     }
   }
   ```
   - `onMutate`에서 반환한 컨텍스트를 사용하여 이전 상태로 복원
   - 사용자에게 에러 알림 표시 가능

3. **캐시 무효화 (Cache Invalidation)**
   ```typescript
   onSettled: (data, error, variables) => {
     queryClient.invalidateQueries({ queryKey: ['messageRooms'] });
   }
   ```
   - `onSettled`: 성공/실패 관계없이 실행
   - 관련 쿼리를 무효화하여 최신 데이터로 갱신
   - 실제로는 실시간 구독이 먼저 캐시를 업데이트하므로 중복 방지

4. **Debouncing (읽음 처리)**
   - 읽음 처리는 빈번하게 발생할 수 있으므로 배치 처리 고려
   - 현재는 즉시 처리하지만, 필요시 debounce 구현 가능

---

### 4. Realtime 구독 Hook 생성 (`useMessageRealtime.ts`)

#### 구현 내용
- `useMessageRealtimeForRoom()`: 개별 방 메시지 실시간 구독
- `useMessageRoomsRealtime()`: 메시지 방 목록 실시간 업데이트
- React Query 캐시 자동 업데이트

#### Supabase Realtime 원리 설명

**Supabase Realtime**은 PostgreSQL 변경사항을 실시간으로 구독할 수 있는 시스템입니다.

1. **PostgreSQL Changes 구독**
   ```typescript
   supabase
     .channel(`room:${roomId}`)
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'chat_messages',
       filter: `room_id=eq.${roomId}`,
     }, callback)
     .subscribe()
   ```
   
   **작동 원리:**
   - **PostgreSQL Logical Replication** 사용
   - 데이터베이스의 Write-Ahead Log (WAL)를 읽어 변경사항 감지
   - Supabase는 이를 WebSocket을 통해 클라이언트에 전달
   - 필터 조건으로 특정 데이터만 구독 가능
   - INSERT, UPDATE, DELETE 이벤트 구독 가능

2. **채널 (Channel) 시스템**
   - 각 구독은 고유한 채널로 관리
   - 채널 이름은 임의로 지정 가능 (예: `room:${roomId}`)
   - 여러 이벤트를 하나의 채널에 바인딩 가능
   - 채널별로 독립적으로 구독/해제 가능

3. **React Query 캐시 업데이트 통합**
   ```typescript
   queryClient.setQueryData<ChatMessage[]>(['messages', roomId], (old = []) => {
     // 중복 체크
     if (old.some((m) => m.id === mapped.id)) return old;
     
     // Optimistic update와 실제 메시지 병합
     if (isMe) {
       // 임시 메시지를 실제 메시지로 교체
       const idx = [...next].reverse().findIndex((m) => m.isMe && m.id.startsWith('temp-'));
       if (idx !== -1) {
         next[realIndex] = mapped;
         return next;
       }
     }
     
     // 새 메시지 추가
     return [...old, mapped];
   });
   ```
   
   **핵심 포인트:**
   - 실시간 이벤트가 도착하면 React Query 캐시를 직접 업데이트
   - 네트워크 요청 없이 즉시 UI 반영
   - Optimistic update와의 충돌 방지 (임시 메시지 교체 로직)

4. **메모리 누수 방지**
   ```typescript
   useEffect(() => {
     // ... 구독 설정
     
     return () => {
       removeSubscriptionChannel(roomId);
       removeSubscribedRoom(roomId);
     };
   }, [roomId, enabled]);
   ```
   - 컴포넌트 언마운트 시 cleanup 함수 실행
   - WebSocket 연결 해제
   - Zustand 스토어에서 채널 참조 제거

5. **중복 구독 방지**
   - Zustand 스토어의 `subscribedRooms` Set으로 추적
   - 이미 구독 중인 방은 건너뜀
   - 여러 컴포넌트에서 동일한 방을 구독해도 한 번만 연결

---

### 5. MessageList.tsx 리팩토링

#### 변경사항
- **Before**: `useState`로 rooms 관리, `useEffect`에서 직접 API 호출
- **After**: `useQuery`로 rooms 조회, 실시간 구독 통합

#### 개선 효과
1. **캐싱으로 인한 빠른 로딩**
   - 이전에 방문한 필터의 데이터는 즉시 표시
   - 네트워크 요청 감소

2. **실시간 자동 업데이트**
   - 새 메시지 수신 시 목록 자동 갱신
   - 읽음 상태, 고정 상태 변경 즉시 반영

3. **Optimistic UI**
   - 고정/해제, 알림 설정 등이 즉시 반영
   - 서버 응답 실패 시 자동 롤백

4. **코드 간소화**
   - 상태 관리 로직이 hooks로 추상화
   - 컴포넌트는 UI 렌더링에만 집중

---

### 6. ChatRoom.tsx 리팩토링

#### 변경사항
- **Before**: 
  - `useState`로 messages와 room 관리
  - `useEffect`에서 직접 실시간 구독 설정
  - 수동으로 Optimistic Updates 구현

- **After**:
  - `useQuery`로 messages와 room 조회
  - `useMutation`으로 메시지 전송 관리
  - 실시간 구독은 hook으로 분리

#### 개선 효과
1. **Optimistic Updates 개선**
   - React Query의 `onMutate`로 일관된 처리
   - 에러 시 자동 롤백
   - 임시 메시지가 실제 메시지로 자동 교체

2. **실시간 동기화**
   - 실시간 구독이 React Query 캐시를 직접 업데이트
   - 여러 탭에서 동일한 방을 열어도 동기화됨

3. **메모리 관리**
   - 컴포넌트 언마운트 시 자동 cleanup
   - 구독 해제로 메모리 누수 방지

---

## 기술 스택 통합 원리

### React Query + Zustand 조합

1. **역할 분리**
   - **React Query**: 서버 상태 (messages, rooms) - 캐싱, 동기화, 백그라운드 업데이트
   - **Zustand**: 클라이언트 상태 (구독 관리, 읽음 상태) - 전역 UI 상태

2. **상호 작용**
   ```typescript
   // Zustand에서 읽음 상태 업데이트
   const { setLastReadAt, resetUnreadCount } = useMessageStore();
   
   // React Query에서 읽음 처리 후 Zustand 동기화
   onMutate: async (roomId) => {
     setLastReadAt(roomId, now);
     resetUnreadCount(roomId);
   }
   ```

### React Query + Supabase Realtime 조합

1. **이중 업데이트 전략**
   - **Optimistic Updates**: 사용자 액션에 즉시 반응
   - **Realtime Updates**: 서버 변경사항을 자동 동기화

2. **충돌 해결**
   - Optimistic update로 추가된 임시 메시지 (`temp-*` ID)
   - Realtime 이벤트로 실제 메시지가 도착하면 교체
   - 중복 메시지 방지 (ID 기반 체크)

3. **캐시 일관성**
   - Realtime 이벤트가 캐시를 직접 업데이트
   - `invalidateQueries`로 관련 쿼리 갱신
   - 서버와 클라이언트 상태 동기화 보장

---

## 테스트 및 검증

### 로컬 테스트 환경
- 로컬 Supabase 연결 확인
- 실시간 구독 동작 확인
- Optimistic Updates 동작 확인

### 검증 포인트
1. **캐싱 동작**: 같은 방 목록을 다시 열 때 네트워크 요청 없는지 확인
2. **실시간 업데이트**: 다른 탭/디바이스에서 메시지 전송 시 즉시 반영되는지 확인
3. **Optimistic Updates**: 메시지 전송 시 즉시 화면에 표시되는지 확인
4. **에러 처리**: 네트워크 오류 시 롤백되는지 확인
5. **메모리 누수**: 컴포넌트 언마운트 시 구독이 정리되는지 확인

---

## TODO Next

1. **에러 처리 개선**
   - 메시지 전송 실패 시 재시도 UI 추가
   - 에러 상태 표시 개선

2. **성능 최적화**
   - 메시지 페이징 (무한 스크롤)
   - 이미지 지연 로딩

3. **실시간 동기화 개선**
   - 읽음 상태 실시간 동기화
   - 온라인 상태 표시

4. **테스트 코드 작성**
   - Unit tests for hooks
   - Integration tests for realtime subscriptions

---

### 참고 파일 경로
- `webapp/src/stores/messageStore.ts`
- `webapp/src/hooks/useMessageRooms.ts`
- `webapp/src/hooks/useMessageMutations.ts`
- `webapp/src/hooks/useMessageRealtime.ts`
- `webapp/src/pages/messages/MessageList.tsx`
- `webapp/src/pages/messages/ChatRoom.tsx`
- `webapp/src/services/messageService.ts`
- `webapp/src/lib/queryClient.ts`

---

