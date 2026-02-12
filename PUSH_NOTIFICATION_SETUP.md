# BridgeApp 푸시 알림 설정 가이드

이 문서는 BridgeApp 푸시 알림 시스템을 완성하기 위한 설정 단계를 안내합니다.

---

## 1. Edge Function 배포

### 1.1 Supabase CLI 로그인

```bash
npx supabase login
```

### 1.2 프로젝트 링크 (최초 1회)

```bash
cd supabase
npx supabase link --project-ref xianrhwkdarupnvaumti
```

### 1.3 Edge Function 배포

#### Dev 환경 배포
```bash
npx supabase functions deploy send-push-notification --project-ref xianrhwkdarupnvaumti
```

#### Prod 환경 배포
```bash
npx supabase functions deploy send-push-notification --project-ref ywaldpxprcusqmfdnlfk
```

### 1.4 배포 확인

```bash
npx supabase functions list
```

`send-push-notification`이 목록에 표시되면 성공입니다.

---

## 2. 알림 그룹화 기능

메시지 알림은 같은 채팅방(related_id)의 알림을 자동으로 그룹화합니다.

### 2.1 iOS 그룹화
- `threadId` 필드를 사용하여 같은 채팅방의 알림을 하나로 묶어 표시
- 채팅방 ID(`related_id`)를 `threadId`로 설정

### 2.2 Android 그룹화
- `collapseKey` 필드를 사용하여 같은 채팅방의 알림을 그룹화
- 채팅방 ID(`related_id`)를 기반으로 `collapseKey` 생성

> **참고**: 이 기능은 메시지 타입(`type === "message"`) 알림에만 적용됩니다.

---

## 3. Database Webhook 설정

Supabase Dashboard에서 Database Webhook을 설정해야 합니다.

### 2.1 Dashboard 접속

1. https://supabase.com/dashboard 로그인
2. `bridge-app` 프로젝트 선택
3. 왼쪽 메뉴에서 **Database** > **Webhooks** 클릭

### 2.2 Webhook 생성

**"Create a new hook"** 클릭 후 다음과 같이 설정:

| 항목 | 값 |
|------|-----|
| **Name** | `push-on-notification-insert` |
| **Table** | `user_notifications` |
| **Events** | `INSERT` 체크 |
| **Type** | `HTTP Request` |
| **HTTP Method** | `POST` |
| **URL** | `https://xianrhwkdarupnvaumti.supabase.co/functions/v1/send-push-notification` |

### 2.3 HTTP Headers 설정

**"Add new header"** 클릭:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role_key) |

> **중요**: Authorization 헤더에는 **service_role_key**를 사용해야 합니다.
> Supabase Dashboard > Settings > API > service_role key 에서 복사하세요.

### 2.4 저장

**"Create webhook"** 클릭하여 저장합니다.

---

## 4. Expo Access Token 설정

Expo Push Service 사용 시 Access Token 설정을 권장합니다 (선택사항이지만 권장).

### 3.1 Expo Access Token 발급

1. https://expo.dev 로그인
2. 우측 상단 프로필 아이콘 > **Account Settings**
3. 왼쪽 메뉴에서 **Access Tokens**
4. **"Create Token"** 클릭
5. Token Name: `BridgeApp Push Service`
6. **"Create"** 클릭 후 토큰 복사 (한 번만 표시됨!)

### 3.2 Supabase Secrets에 등록

```bash
cd supabase
npx supabase secrets set EXPO_ACCESS_TOKEN=<복사한_토큰>
```

### 3.3 확인

```bash
npx supabase secrets list
```

`EXPO_ACCESS_TOKEN`이 목록에 있으면 성공입니다.

---

## 5. iOS APNs 설정 (iOS 푸시용)

iOS 기기에 푸시를 보내려면 Apple Push Notification service (APNs) 설정이 필요합니다.

### 4.1 Apple Developer에서 Push Key 생성

1. https://developer.apple.com 로그인
2. **Certificates, Identifiers & Profiles** 이동
3. 왼쪽 메뉴 **Keys** 클릭
4. **"+"** 버튼 클릭하여 새 Key 생성
5. Key Name: `BridgeApp Push Key`
6. **Apple Push Notifications service (APNs)** 체크
7. **Continue** > **Register**
8. `.p8` 파일 다운로드 (⚠️ 한 번만 다운로드 가능!)
9. **Key ID** 기록 (예: `ABC123DEFG`)
10. **Team ID** 기록 (Account > Membership에서 확인)

### 4.2 Expo에 Push Key 업로드

```bash
cd expo-shell
npx eas credentials
```

1. **iOS** 선택
2. **Push Notifications: Set up Push Key** 선택
3. **Upload existing Push Key** 선택
4. `.p8` 파일 경로 입력
5. Key ID 입력
6. Team ID 입력

### 4.3 확인

```bash
npx eas credentials --platform ios
```

**Push Key: Configured** 라고 표시되면 성공입니다.

---

## 6. 테스트

### 5.1 토큰 등록 확인

앱을 실기기에서 실행한 후 Supabase에서 토큰이 등록되었는지 확인:

```sql
-- SQL Editor에서 실행
SELECT * FROM user_push_tokens ORDER BY created_at DESC LIMIT 10;
```

### 5.2 푸시 발송 테스트

알림을 직접 INSERT하여 푸시가 발송되는지 테스트:

```sql
-- 본인의 user_id로 교체하세요
INSERT INTO user_notifications (
  receiver_id,
  type,
  title,
  content,
  related_id,
  related_type
) VALUES (
  'f43adc4f-62fb-45c7-aada-c121b3f5c15a',  -- profiles 테이블에서 본인 id 확인
  'message',
  '테스트 알림',
  '푸시 알림이 정상적으로 작동합니다!',
  NULL,
  NULL
);
```

### 5.3 Edge Function 로그 확인

```bash
npx supabase functions logs send-push-notification --tail
```

로그에서 `[send-push]` 메시지를 확인할 수 있습니다.

---

## 7. 트러블슈팅

### 푸시가 오지 않는 경우

1. **토큰 확인**: `user_push_tokens` 테이블에 본인의 토큰이 있는지 확인
2. **Edge Function 로그**: 에러 메시지 확인
3. **Webhook 확인**: Database > Webhooks에서 최근 실행 기록 확인
4. **실기기 필수**: iOS 시뮬레이터에서는 푸시가 작동하지 않음

### DeviceNotRegistered 에러

- 앱이 삭제되었거나 푸시 권한이 거부된 경우
- Edge Function이 자동으로 해당 토큰을 삭제함

### InvalidCredentials 에러

- Expo Access Token이 잘못되었거나 만료됨
- `supabase secrets set`으로 토큰 재설정

### MessageTooBig 에러

- 푸시 페이로드가 4KB를 초과함
- content 필드 길이 줄이기

---

## 8. Android 알림 채널 (선택사항)

Android에서 알림 카테고리별로 다른 설정(소리, 진동 등)을 적용하려면 알림 채널을 설정해야 합니다.

### 7.1 expo-shell/App.tsx에 채널 설정 추가

```typescript
import * as Notifications from 'expo-notifications';

// 앱 시작 시 채널 생성
async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: '메시지',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('collaborations', {
      name: '협업',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('social', {
      name: '소셜',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: '리마인더',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: '일반',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}
```

---

## 체크리스트

- [ ] Edge Function 배포 완료
- [ ] Database Webhook 설정 완료
- [ ] Expo Access Token 설정 완료 (권장)
- [ ] iOS APNs Push Key 업로드 완료
- [ ] Android 실기기 테스트 완료
- [ ] iOS 실기기 테스트 완료

---

## 주요 기능

### 알림 그룹화
- **메시지 알림**: 같은 채팅방의 여러 메시지가 하나의 그룹으로 묶여 표시됩니다
- **iOS**: `threadId`를 사용하여 알림 그룹화
- **Android**: `collapseKey`를 사용하여 알림 그룹화
- 웹앱의 `NotificationModal`에서도 동일하게 채팅방별로 집계되어 표시됩니다

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `supabase/functions/send-push-notification/index.ts` | 푸시 발송 Edge Function (그룹화 기능 포함) |
| `supabase/migrations/20251211_user_push_tokens.sql` | 토큰 테이블 스키마 |
| `expo-shell/App.tsx` | 토큰 등록 및 알림 핸들러 |
| `webapp/src/components/native/NativeBridgeListener.tsx` | 웹앱 푸시 브릿지 |
| `webapp/src/components/common/NotificationModal.tsx` | 알림 모달 (메시지 집계 기능) |
| `notifications_refactoring.sql` | 알림 생성 트리거 |
