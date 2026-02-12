// ============================================================================
// BridgeApp Push Notification Edge Function
// - Expo Push Service를 통해 FCM/APNs 푸시 알림 발송
// - user_notifications INSERT 시 Database Webhook으로 호출됨
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// 알림 아이콘 이미지 URL
const NOTIFICATION_ICON_URL = Deno.env.get("NOTIFICATION_ICON_URL")
  || "https://auth.lyt-app.io/storage/v1/object/public/assets/defaults/notification-icon-large.png";

// CORS 헤더
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Database Webhook에서 전달되는 페이로드 타입
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: NotificationRecord | null;
  old_record: NotificationRecord | null;
}

interface NotificationRecord {
  id: string;
  receiver_id: string;
  type: string;
  title: string;
  content: string;
  related_id: string | null;
  related_type: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// Expo Push 메시지 타입
interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  // 이미지 URL (iOS용)
  imageUrl?: string;
  // 그룹화 및 플랫폼별 옵션
  ios?: {
    threadId?: string;  // iOS에서 알림 그룹화
  };
  android?: {
    collapseKey?: string;  // Android에서 알림 그룹화
    imageUrl?: string;  // Android 큰 아이콘
    largeIcon?: string; // Android Large Icon (Local Resource)
  };
}

// Expo Push API 응답 타입
interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: "DeviceNotRegistered" | "MessageTooBig" | "MessageRateExceeded" | "InvalidCredentials";
  };
}

/**
 * 방해금지 시간대 체크
 * @param current - 현재 시간 (HH:MM)
 * @param start - 시작 시간 (HH:MM)
 * @param end - 종료 시간 (HH:MM)
 * @returns true if current is in quiet hours
 */
function checkQuietHours(current: string, start: string, end: string): boolean {
  // 시간 비교를 위해 숫자로 변환 (HH:MM -> HHMM)
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const currentMin = toMinutes(current);
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);

  // 자정을 넘어가는 경우 (예: 22:00 ~ 08:00)
  if (startMin > endMin) {
    return currentMin >= startMin || currentMin < endMin;
  }

  // 같은 날인 경우 (예: 09:00 ~ 17:00)
  return currentMin >= startMin && currentMin < endMin;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 페이로드 파싱
    const payload: WebhookPayload = await req.json();

    // INSERT 이벤트만 처리
    if (payload.type !== "INSERT" || !payload.record) {
      return new Response(
        JSON.stringify({ message: "Ignored: not an INSERT event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notification = payload.record;
    console.log(`[send-push] Processing notification: ${notification.id}, type: ${notification.type}`);

    // 자신에게 푸시 알림이 가지 않도록 필터링
    // metadata에 sender_id가 있고 receiver_id와 같으면 푸시 안 보냄
    const senderId = notification.metadata && typeof notification.metadata === 'object'
      ? (notification.metadata as Record<string, unknown>).sender_id
      : null;

    if (senderId && senderId === notification.receiver_id) {
      console.log(`[send-push] Skipping self-notification: sender_id (${senderId}) === receiver_id (${notification.receiver_id})`);
      return new Response(
        JSON.stringify({ success: true, message: "Self-notification skipped" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supabase 클라이언트 생성 (Service Role Key 사용)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 수신자의 푸시 토큰 조회
    const { data: tokens, error: tokenError } = await supabase
      .from("user_push_tokens")
      .select("id, token, provider, device_type")
      .eq("user_id", notification.receiver_id);

    if (tokenError) {
      console.error("[send-push] Token query error:", tokenError);
      throw tokenError;
    }

    if (!tokens || tokens.length === 0) {
      console.log(`[send-push] No push tokens found for user: ${notification.receiver_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "No push tokens registered" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-push] Found ${tokens.length} token(s) for user`);

    // ========================================
    // 알림 설정 체크 (푸시 전역 on/off, 방해금지 모드, 타입별 설정)
    // ========================================

    // 1. 푸시 전역 설정 및 방해금지 모드 체크
    const { data: pushSettings } = await supabase
      .from("user_push_settings")
      .select("push_enabled, quiet_mode_enabled, quiet_start_time, quiet_end_time")
      .eq("user_id", notification.receiver_id)
      .maybeSingle();

    // 푸시 전역 off인 경우 발송 안함
    if (pushSettings && pushSettings.push_enabled === false) {
      console.log(`[send-push] Push disabled for user: ${notification.receiver_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "Push disabled by user settings" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 방해금지 모드 체크
    if (pushSettings?.quiet_mode_enabled) {
      const now = new Date();
      // UTC 기준 현재 시간을 한국 시간(KST, UTC+9)으로 변환
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstNow = new Date(now.getTime() + kstOffset);
      const currentTimeStr = kstNow.toISOString().slice(11, 16); // "HH:MM"

      const startTime = pushSettings.quiet_start_time?.slice(0, 5) || "22:00";
      const endTime = pushSettings.quiet_end_time?.slice(0, 5) || "08:00";

      const isInQuietHours = checkQuietHours(currentTimeStr, startTime, endTime);
      if (isInQuietHours) {
        console.log(`[send-push] Quiet mode active for user: ${notification.receiver_id}, current: ${currentTimeStr}`);
        return new Response(
          JSON.stringify({ success: true, message: "Quiet mode active" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. 알림 타입별 설정 체크
    const { data: typeSetting } = await supabase
      .from("user_notification_settings")
      .select("is_enabled")
      .eq("user_id", notification.receiver_id)
      .eq("notification_type", notification.type)
      .maybeSingle();

    // 타입별 설정이 명시적으로 false인 경우에만 차단 (설정 없으면 기본 enabled)
    if (typeSetting && typeSetting.is_enabled === false) {
      console.log(`[send-push] Notification type "${notification.type}" disabled for user: ${notification.receiver_id}`);
      return new Response(
        JSON.stringify({ success: true, message: `Notification type ${notification.type} disabled` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================

    // 딥링크 라우팅 결정
    const route = getRouteForNotification(notification);

    // Expo Push 메시지 생성 (Expo 토큰만 필터링)
    const expoTokens = tokens.filter(
      (t) => t.token.startsWith("ExponentPushToken[") || t.provider === "expo"
    );

    if (expoTokens.length === 0) {
      console.log("[send-push] No Expo push tokens found");
      return new Response(
        JSON.stringify({ success: true, message: "No Expo push tokens" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messages: ExpoPushMessage[] = expoTokens.map((t) => {
      // 메시지 알림인 경우 채팅방 ID를 threadId/collapseKey로 사용하여 그룹화
      const threadId = notification.type === "message" && notification.related_id
        ? notification.related_id
        : undefined;

      const message: ExpoPushMessage = {
        to: t.token,
        title: notification.title,
        body: notification.content,
        data: {
          type: notification.type,
          route: route,
          notification_id: notification.id,
          related_id: notification.related_id,
          related_type: notification.related_type,
          ...((notification.metadata as Record<string, unknown>) || {}),
        },
        sound: "default",
        priority: "high",
        channelId: getChannelIdForType(notification.type),
        // 이미지 URL 추가 (iOS용)
        imageUrl: NOTIFICATION_ICON_URL,
      };

      // 메시지 알림인 경우 그룹화 설정
      if (threadId) {
        message.ios = {
          threadId: threadId,  // iOS: 같은 threadId를 가진 알림은 그룹화됨
        };
        message.android = {
          collapseKey: `message_${threadId}`,  // Android: 같은 collapseKey를 가진 알림은 그룹화됨
          imageUrl: NOTIFICATION_ICON_URL,  // Android Big Picture
          largeIcon: "notification_icon_large", // Android Large Icon (Local Resource)
        };
      } else {
        // 그룹화가 아닌 경우에도 큰 아이콘 추가
        message.android = {
          imageUrl: NOTIFICATION_ICON_URL,  // Android Big Picture
          largeIcon: "notification_icon_large", // Android Large Icon (Local Resource)
        };
      }

      return message;
    });

    // Expo Push API 호출
    const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (expoAccessToken) {
      headers["Authorization"] = `Bearer ${expoAccessToken}`;
    }

    console.log(`[send-push] Sending ${messages.length} push message(s) to Expo`);

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[send-push] Expo API error:", errorText);
      throw new Error(`Expo API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const tickets: ExpoPushTicket[] = result.data || [];

    console.log(`[send-push] Expo response:`, JSON.stringify(tickets));

    // 무효 토큰 처리 (DeviceNotRegistered)
    const invalidTokenIds: string[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        console.log(`[send-push] Token unregistered: ${expoTokens[i].token.substring(0, 30)}...`);
        invalidTokenIds.push(expoTokens[i].id);
      }
    }

    // 무효 토큰 삭제
    if (invalidTokenIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_push_tokens")
        .delete()
        .in("id", invalidTokenIds);

      if (deleteError) {
        console.error("[send-push] Failed to delete invalid tokens:", deleteError);
      } else {
        console.log(`[send-push] Deleted ${invalidTokenIds.length} invalid token(s)`);
      }
    }

    // 성공 응답
    const successCount = tickets.filter((t) => t.status === "ok").length;
    const errorCount = tickets.filter((t) => t.status === "error").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: errorCount,
        invalidTokensRemoved: invalidTokenIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-push] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * 알림 타입에 따른 딥링크 경로 결정
 */
function getRouteForNotification(notification: NotificationRecord): string {
  const { type, related_id, metadata } = notification;

  switch (type) {
    case "message":
      // 메시지 알림: 채팅방으로 이동
      return `/messages/${related_id}`;

    case "proposal":
    case "proposal_accepted":
    case "proposal_rejected":
      // 제안 알림: 프로젝트 관리 페이지로 이동
      return `/manage/project/${related_id}`;

    case "talk_request":
      // 대화 요청: InvitationsTab으로 이동 (받은 요청)
      return "/manage?tab=invitations&mode=received";
    case "talk_request_accepted":
    case "talk_request_rejected":
      // 대화 요청 응답: InvitationsTab으로 이동 (보낸 요청)
      return "/manage?tab=invitations&mode=sent";

    case "invitation":
      // 초대 알림: InvitationsTab으로 이동 (받은 요청)
      return "/manage?tab=invitations&mode=received";
    case "invitation_accepted":
    case "invitation_rejected":
      // 초대 응답 알림: InvitationsTab으로 이동 (보낸 요청)
      return "/manage?tab=invitations&mode=sent";

    case "application":
      // 지원 알림: InvitationsTab으로 이동 (받은 요청)
      return "/manage?tab=invitations&mode=received";
    case "application_accepted":
    case "application_rejected":
      // 지원 응답 알림: InvitationsTab으로 이동 (보낸 요청)
      return "/manage?tab=invitations&mode=sent";

    case "withdrawal":
      // 철회 알림: 관련 페이지로 이동
      return related_id ? `/manage/project/${related_id}` : "/manage/projects";

    case "follow":
      // 팔로우 알림: 팔로워의 프로필로 이동
      const followerId = (metadata as Record<string, unknown>)?.sender_id || related_id;
      return `/explore/partner/${followerId}`;

    case "like":
      // 좋아요 알림: 해당 콘텐츠로 이동
      const contentType = (metadata as Record<string, unknown>)?.content_type;
      if (contentType === "magazine") {
        return `/magazine/${related_id}`;
      } else if (contentType === "community") {
        return `/lounge/${related_id}`;
      }
      return `/notifications`;

    case "question":
    case "answer":
      // Q&A 알림: 해당 콘텐츠로 이동
      return `/lounge/${related_id}`;

    case "deadline":
      // 마감 알림: 프로젝트로 이동
      return `/manage/project/${related_id}`;

    case "status_change":
      // 상태 변경 알림
      return `/manage/projects`;

    case "partnership_inquiry":
      // 파트너십 문의
      return `/partnership`;

    case "member_left":
    case "member_removed":
      // 멤버 퇴장/강제 퇴장: 해당 프로젝트/협업 상세 페이지 팀 탭으로
      const entityType = (metadata as Record<string, unknown>)?.related_type;
      const entityId = related_id
        || (metadata as Record<string, unknown>)?.project_id
        || (metadata as Record<string, unknown>)?.collaboration_id;

      if (entityType === "project" && entityId) {
        return `/explore/project/${entityId}?tab=team`;
      } else if (entityType === "collaboration" && entityId) {
        return `/explore/collaboration/${entityId}?tab=members`;
      }
      return "/notifications";

    default:
      // 기본: 알림 목록
      return "/notifications";
  }
}

/**
 * 알림 타입에 따른 Android 알림 채널 ID
 */
function getChannelIdForType(type: string): string {
  switch (type) {
    case "message":
      return "messages";
    case "proposal":
    case "invitation":
    case "application":
      return "collaborations";
    case "follow":
    case "like":
      return "social";
    case "deadline":
      return "reminders";
    case "member_left":
    case "member_removed":
      return "collaborations";
    default:
      return "default";
  }
}
