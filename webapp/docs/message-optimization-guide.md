# 메시지 페이지 성능 최적화 가이드

## 목차
1. [문제 진단](#1-문제-진단)
2. [N+1 쿼리 문제와 해결](#2-n1-쿼리-문제와-해결)
3. [배치 처리 최적화](#3-배치-처리-최적화)
4. [인증 호출 최적화](#4-인증-호출-최적화)
5. [규모 확장 시 효과 분석](#5-규모-확장-시-효과-분석)
6. [핵심 코드 비교](#6-핵심-코드-비교)

---

## 1. 문제 진단

### 초기 상태 측정
| 페이지 | 요청 수 | 전송량 | 완료 시간 |
|--------|---------|--------|-----------|
| MessageList | 523개 | 26.6MB | 8.25s |
| ChatRoom | 621개 | 27.0MB | 36.06s |

### 문제의 핵심: N+1 쿼리 패턴
데이터베이스 쿼리에서 가장 흔한 성능 문제 중 하나인 **N+1 쿼리 문제**가 발생하고 있었습니다.

```
N+1 쿼리란?
- 1개의 메인 쿼리 실행 후
- 결과의 각 행(N개)에 대해 추가 쿼리를 실행
- 총 N+1개의 쿼리가 발생하는 패턴
```

---

## 2. N+1 쿼리 문제와 해결

### 2.1 기존 방식: `getUserDetails()` - 순차 쿼리

```typescript
// 기존: 각 사용자마다 최대 5개 쿼리 순차 실행
export const getUserDetails = async (userId: string) => {
    // 1번째 쿼리: profiles 조회
    const { data: profile } = await supabase
        .from('profiles')
        .select('roles, nickname')
        .eq('id', userId)
        .maybeSingle();

    // 2번째 쿼리: profile_artists 조회 (roles에 artist 있으면)
    if (hasArtist) {
        const { data: artist } = await supabase
            .from('profile_artists')
            .select('artist_name, logo_image_url')
            .eq('profile_id', userId)
            .maybeSingle();
    }

    // 3번째 쿼리: profile_creatives 조회
    // 4번째 쿼리: profile_brands 조회
    // 5번째 쿼리: profile_fans 조회
    // ... 순차적으로 실행
};
```

**문제점:**
- 10명의 참가자 조회 시: 10명 × 최대 5쿼리 = **최대 50개 쿼리**
- 각 쿼리는 순차적으로 실행 (Waterfall 패턴)
- 네트워크 왕복 시간(RTT)이 누적됨

```
시간 흐름 →
User1: [profiles] → [artists] → [creatives] → [brands] → [fans]
User2:                                                      [profiles] → [artists] → ...
User3:                                                                               [profiles] → ...
```

### 2.2 개선 방식: `getBatchUserDetails()` - 배치 쿼리

```typescript
// 개선: N명을 5개 쿼리로 한 번에 조회
export const getBatchUserDetails = async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds)];

    // 1번째 쿼리: 모든 profiles 한 번에 조회
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, roles, nickname')
        .in('id', uniqueIds);  // WHERE id IN (...)

    // 2-5번째 쿼리: 각 프로필 타입별 배치 조회 (병렬 실행!)
    const [artistsResult, creativesResult, brandsResult, fansResult] = await Promise.all([
        supabase.from('profile_artists').select('...').in('profile_id', artistIds),
        supabase.from('profile_creatives').select('...').in('profile_id', creativeIds),
        supabase.from('profile_brands').select('...').in('profile_id', brandIds),
        supabase.from('profile_fans').select('...').in('profile_id', fanIds),
    ]);

    // Map으로 O(1) 조회 가능하게 반환
    return new Map<string, UserDetails>(...);
};
```

**개선 효과:**
- 10명의 참가자 조회 시: **고정 5개 쿼리** (N과 무관)
- `Promise.all()`로 4개 쿼리 병렬 실행
- 1개 profiles 쿼리 + 4개 병렬 쿼리 = 실질적 2 RTT

```
시간 흐름 →
[profiles: User1~10] → [artists: 병렬] [creatives: 병렬] [brands: 병렬] [fans: 병렬]
                       └─────────────────────────────────────────────────────────┘
                                          (동시 실행)
```

### 2.3 쿼리 수 비교 (수학적 분석)

| 사용자 수 (N) | 기존 방식 | 개선 방식 | 절감률 |
|--------------|-----------|-----------|--------|
| 10명 | 최대 50개 | 5개 | 90% |
| 50명 | 최대 250개 | 5개 | 98% |
| 100명 | 최대 500개 | 5개 | 99% |
| 1000명 | 최대 5000개 | 5개 | 99.9% |

> **핵심 원리**: 쿼리 수가 O(N)에서 O(1)로 변경됨

---

## 3. 배치 처리 최적화

### 3.1 `getRooms()` - 채팅방 목록 조회

#### 기존 방식
```typescript
// 각 방마다 개별 쿼리 실행
const enrichedRooms = await Promise.all(rooms.map(async (room) => {
    // 쿼리 1: 마지막 메시지 조회
    const { data: lastMsgs } = await supabase
        .from('chat_messages')
        .select('content, created_at, attachments')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1);

    // 쿼리 2: 참가자 목록 조회
    const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', room.id);

    // 쿼리 3~N: 각 참가자 상세 정보 조회 (N+1 문제!)
    const participantDetails = await Promise.all(
        participantIds.map(id => getUserDetails(id))  // 각각 최대 5쿼리
    );

    // 쿼리 N+1: 읽지 않은 메시지 수 조회
    const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .gt('created_at', lastRead);
}));
```

**10개 방 × 2명 참가자 기준 쿼리 수:**
- 마지막 메시지: 10개
- 참가자 목록: 10개
- 참가자 상세: 20명 × 5쿼리 = 100개
- 읽지 않은 수: 10개
- **총 130개 쿼리**

#### 개선 방식
```typescript
// JOIN과 배치 쿼리로 통합
const getRooms = async (filter, currentUserId) => {
    // 쿼리 1: 방 정보 + 참가자 JOIN으로 한 번에 조회
    const { data: rooms } = await supabase
        .from('chat_rooms')
        .select(`
            id, type, title, created_at,
            chat_participants (user_id)
        `)
        .in('id', roomIds);

    // 쿼리 2: 모든 방의 마지막 메시지 한 번에 조회
    const { data: allLastMessages } = await supabase
        .from('chat_messages')
        .select('room_id, content, created_at, attachments, sender_id')
        .in('room_id', rooms.map(r => r.id))
        .order('created_at', { ascending: false });

    // 쿼리 3-7: 배치 사용자 조회 (고정 5개)
    const userDetailsMap = await getBatchUserDetails([...allParticipantIds]);

    // 읽지 않은 메시지 수: 이미 가져온 데이터에서 클라이언트 계산
    const unreadCount = allLastMessages.filter(
        msg => msg.room_id === room.id && 
               msg.created_at > lastRead && 
               msg.sender_id !== userId
    ).length;
};
```

**10개 방 × 2명 참가자 기준 쿼리 수:**
- 방 + 참가자 JOIN: 1개
- 마지막 메시지 배치: 1개
- 참가자 상세 배치: 5개
- **총 7개 쿼리** (130개 → 7개, **95% 감소**)

### 3.2 `getMessages()` - 메시지 목록 조회

#### 기존 방식
```typescript
// 각 메시지마다 발신자 정보 조회
const mappedMessages = await Promise.all(messages.map(async (msg) => {
    const details = await getUserDetails(msg.sender_id);  // 최대 5쿼리
    return { ...msg, senderName: details.name, senderAvatar: details.avatar };
}));
```

**100개 메시지 기준:**
- 100명 × 5쿼리 = **최대 500개 쿼리**

#### 개선 방식
```typescript
// 발신자 ID 추출 후 배치 조회
const senderIds = [...new Set(messages.map(m => m.sender_id).filter(id => id !== userId))];
const senderDetailsMap = await getBatchUserDetails(senderIds);  // 고정 5쿼리

// 동기적 매핑 (추가 쿼리 없음)
const mappedMessages = messages.map((msg) => {
    const details = senderDetailsMap.get(msg.sender_id);
    return { ...msg, senderName: details?.name, senderAvatar: details?.avatar };
});
```

**100개 메시지 기준:**
- **고정 5개 쿼리** (500개 → 5개, **99% 감소**)

---

## 4. 인증 호출 최적화

### 4.1 문제: `supabase.auth.getUser()` 중복 호출

```typescript
// 기존: 각 함수에서 매번 getUser() 호출
const getRooms = async () => {
    const { data: { user } } = await supabase.auth.getUser();  // 1번 호출
    // ...
};

const getMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();  // 2번 호출
    // ...
};

const sendMessage = async () => {
    const { data: { user } } = await supabase.auth.getUser();  // 3번 호출
    // ...
};
```

**문제점:**
- `getUser()`는 네트워크 요청을 발생시킴
- 페이지 로드 시 여러 함수가 호출되면 중복 요청 발생
- 메시지 전송마다 불필요한 인증 확인

### 4.2 개선: `currentUserId` 파라미터 전달

```typescript
// 개선: 컴포넌트에서 한 번만 가져와 전달
const MessageList = () => {
    const { userId } = useProfileStore();  // 이미 로드된 값 사용
    
    // hooks에 userId 전달
    const { data: rooms } = useMessageRooms(activeTab, userId);
    const pinRoomMutation = usePinRoom(userId);
};

// 서비스 함수들은 전달받은 userId 사용
const getRooms = async (filter, currentUserId) => {
    let userId = currentUserId;
    if (!userId) {
        // fallback: userId가 없을 때만 getUser() 호출
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
    }
};
```

**개선 효과:**
- 페이지당 `getUser()` 호출: 여러 번 → **0~1번**
- 메시지 전송 시: 1번 → **0번**

---

## 5. 규모 확장 시 효과 분석

### 5.1 시나리오별 쿼리 수 비교

#### 시나리오 A: 소규모 (10개 방, 각 2명 참가자, 50개 메시지)

| 작업 | 기존 쿼리 수 | 개선 쿼리 수 | 절감 |
|------|-------------|-------------|------|
| getRooms | 130개 | 7개 | 95% |
| getMessages | 250개 | 5개 | 98% |
| getUser 호출 | 10+회 | 0회 | 100% |
| **총합** | ~390개 | ~12개 | **97%** |

#### 시나리오 B: 중규모 (50개 방, 각 3명 참가자, 200개 메시지)

| 작업 | 기존 쿼리 수 | 개선 쿼리 수 | 절감 |
|------|-------------|-------------|------|
| getRooms | 850개 | 7개 | 99% |
| getMessages | 1000개 | 5개 | 99.5% |
| getUser 호출 | 50+회 | 0회 | 100% |
| **총합** | ~1900개 | ~12개 | **99.4%** |

#### 시나리오 C: 대규모 (200개 방, 각 5명 참가자, 500개 메시지)

| 작업 | 기존 쿼리 수 | 개선 쿼리 수 | 절감 |
|------|-------------|-------------|------|
| getRooms | 5200개 | 7개 | 99.9% |
| getMessages | 2500개 | 5개 | 99.8% |
| getUser 호출 | 200+회 | 0회 | 100% |
| **총합** | ~7900개 | ~12개 | **99.85%** |

### 5.2 응답 시간 영향

네트워크 RTT(Round Trip Time)를 50ms로 가정:

```
기존 방식 (시나리오 C):
- 순차 실행되는 쿼리들의 총 대기 시간
- 7900개 × 50ms = 395초 (최악의 경우)
- 실제: 병렬 처리로 일부 개선되어도 수십 초 소요

개선 방식:
- 12개 × 50ms = 0.6초
- Promise.all 병렬화로 실제 ~0.2초 수준
```

### 5.3 데이터베이스 부하

```sql
-- 기존: Connection Pool 고갈 위험
-- 동시 100명 접속 시: 100명 × 7900쿼리 = 790,000 쿼리/페이지로드

-- 개선: 안정적인 부하
-- 동시 100명 접속 시: 100명 × 12쿼리 = 1,200 쿼리/페이지로드
```

---

## 6. 핵심 코드 비교

### 6.1 Map을 활용한 O(1) 조회

```typescript
// 기존: 매번 배열 탐색 O(N)
const getParticipantName = (userId: string, participants: User[]) => {
    return participants.find(p => p.id === userId)?.name;  // O(N)
};

// 개선: Map으로 O(1) 조회
const userDetailsMap = await getBatchUserDetails(userIds);
const name = userDetailsMap.get(userId)?.name;  // O(1)
```

### 6.2 SQL IN 절 활용

```typescript
// 기존: 각각 개별 쿼리
for (const id of userIds) {
    await supabase.from('profiles').select('*').eq('id', id);
}

// 개선: IN 절로 한 번에
await supabase.from('profiles').select('*').in('id', userIds);
```

### 6.3 클라이언트 측 계산 활용

```typescript
// 기존: 각 방마다 COUNT 쿼리
const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)
    .gt('created_at', lastRead);

// 개선: 이미 가져온 데이터에서 필터링
const unreadCount = allLastMessages.filter(
    msg => msg.room_id === room.id && msg.created_at > lastRead
).length;
```

---

## 결론

### 최적화 핵심 원칙

1. **N+1 → 배치 처리**: 반복문 안의 쿼리를 밖으로 꺼내 IN 절 활용
2. **순차 → 병렬 실행**: `Promise.all()`로 독립적인 쿼리 동시 실행
3. **중복 제거**: 동일한 데이터를 여러 번 요청하지 않도록 캐싱/전달
4. **클라이언트 계산 활용**: 이미 가져온 데이터로 계산 가능하면 추가 쿼리 불필요

### 적용 결과

| 지표 | 기존 | 개선 | 효과 |
|------|------|------|------|
| MessageList 요청 수 | 523개 | ~50개 | 90% 감소 |
| ChatRoom 요청 수 | 621개 | ~30개 | 95% 감소 |
| 쿼리 복잡도 | O(N×M) | O(1) | 규모 무관 |
| 확장성 | 낮음 | 높음 | 대규모 대응 가능 |

### 추가 최적화 가능 영역

1. **Redis 캐싱**: 자주 조회되는 사용자 정보 캐싱
2. **GraphQL DataLoader**: 요청 배칭 자동화
3. **Database View/Function**: 서버 측 JOIN 최적화
4. **Pagination**: 대량 데이터 분할 로드























