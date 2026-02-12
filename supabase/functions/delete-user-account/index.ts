// ============================================================================
// BridgeApp User Account Deletion Edge Function
// - 사용자 계정 및 관련 데이터 완전 삭제
// - 백오피스 승인 또는 사용자 직접 요청으로 호출
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS 헤더
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteAccountRequest {
  userId: string;
  requestId?: string; // account_deletion_requests 테이블의 ID (선택)
  reason?: string;
}

interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deletedData?: {
    profiles: number;
    projects: number;
    collaborations: number;
    messages: number;
    notifications: number;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // CORS preflight 처리
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 요청 본문 파싱
    const { userId, requestId, reason }: DeleteAccountRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "userId is required",
        } as DeleteAccountResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Supabase 클라이언트 생성 (Service Role 사용)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log(`Starting account deletion for user: ${userId}`);

    // 삭제된 데이터 카운트
    const deletedData = {
      profiles: 0,
      projects: 0,
      collaborations: 0,
      messages: 0,
      notifications: 0,
    };

    // 1. 프로필 관련 데이터 삭제 (CASCADE로 자동 삭제될 수도 있지만 명시적으로 처리)
    try {
      // profile_brands 삭제
      const { count: brandsCount } = await supabaseAdmin
        .from("profile_brands")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      deletedData.profiles += brandsCount || 0;

      // profile_artists 삭제
      const { count: artistsCount } = await supabaseAdmin
        .from("profile_artists")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      deletedData.profiles += artistsCount || 0;

      // profile_creatives 삭제
      const { count: creativesCount } = await supabaseAdmin
        .from("profile_creatives")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      deletedData.profiles += creativesCount || 0;

      // profile_fans 삭제
      const { count: fansCount } = await supabaseAdmin
        .from("profile_fans")
        .delete({ count: "exact" })
        .eq("user_id", userId);
      deletedData.profiles += fansCount || 0;

      console.log(`Deleted profile data: ${deletedData.profiles} records`);
    } catch (error) {
      console.error("Error deleting profile data:", error);
    }

    // 2. 프로젝트 관련 데이터 삭제
    try {
      // 사용자가 생성한 프로젝트 조회
      const { data: userProjects } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("created_by", userId);

      if (userProjects && userProjects.length > 0) {
        const projectIds = userProjects.map((p) => p.id);

        // 프로젝트 멤버 삭제
        await supabaseAdmin
          .from("project_members")
          .delete()
          .in("project_id", projectIds);

        // 프로젝트 지원자 삭제
        await supabaseAdmin
          .from("project_applications")
          .delete()
          .in("project_id", projectIds);

        // 프로젝트 삭제
        const { count: projectsCount } = await supabaseAdmin
          .from("projects")
          .delete({ count: "exact" })
          .in("id", projectIds);

        deletedData.projects = projectsCount || 0;

        // 다른 사람들의 최근 본 항목에서 삭제된 프로젝트 제거
        await supabaseAdmin
          .from("user_recently_viewed")
          .delete()
          .in("item_id", projectIds)
          .eq("item_type", "project");
      }

      // 사용자가 멤버로 참여한 프로젝트에서 제거
      await supabaseAdmin
        .from("project_members")
        .delete()
        .eq("user_id", userId);

      // 사용자가 지원한 프로젝트 삭제
      await supabaseAdmin
        .from("project_applications")
        .delete()
        .eq("applicant_id", userId);

      console.log(`Deleted projects: ${deletedData.projects} records`);
    } catch (error) {
      console.error("Error deleting project data:", error);
    }

    // 3. 협업 관련 데이터 삭제
    try {
      // 사용자가 생성한 협업 조회
      const { data: userCollaborations } = await supabaseAdmin
        .from("collaborations")
        .select("id")
        .eq("created_by", userId);

      if (userCollaborations && userCollaborations.length > 0) {
        const collaborationIds = userCollaborations.map((c) => c.id);

        // 협업 지원자 삭제
        await supabaseAdmin
          .from("collaboration_applications")
          .delete()
          .in("collaboration_id", collaborationIds);

        // 협업 삭제
        const { count: collaborationsCount } = await supabaseAdmin
          .from("collaborations")
          .delete({ count: "exact" })
          .in("id", collaborationIds);

        deletedData.collaborations = collaborationsCount || 0;

        // 다른 사람들의 최근 본 항목에서 삭제된 협업 제거
        await supabaseAdmin
          .from("user_recently_viewed")
          .delete()
          .in("item_id", collaborationIds)
          .eq("item_type", "collaboration");
      }

      // 사용자가 지원한 협업 삭제
      await supabaseAdmin
        .from("collaboration_applications")
        .delete()
        .eq("applicant_id", userId);

      console.log(`Deleted collaborations: ${deletedData.collaborations} records`);
    } catch (error) {
      console.error("Error deleting collaboration data:", error);
    }

    // 4. 메시지 관련 데이터 삭제
    try {
      const { count: messagesCount } = await supabaseAdmin
        .from("messages")
        .delete({ count: "exact" })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      deletedData.messages = messagesCount || 0;
      console.log(`Deleted messages: ${deletedData.messages} records`);
    } catch (error) {
      console.error("Error deleting messages:", error);
    }

    // 5. 알림 관련 데이터 삭제
    try {
      const { count: notificationsCount } = await supabaseAdmin
        .from("user_notifications")
        .delete({ count: "exact" })
        .eq("receiver_id", userId);

      deletedData.notifications = notificationsCount || 0;
      console.log(`Deleted notifications: ${deletedData.notifications} records`);
    } catch (error) {
      console.error("Error deleting notifications:", error);
    }

    // 6. 선호도/관계 테이블 삭제 (양방향)
    try {
      // user_user_preferences (팔로우/좋아요) - 양방향
      await supabaseAdmin
        .from("user_user_preferences")
        .delete()
        .or(`user_id.eq.${userId},target_id.eq.${userId}`);

      // user_partner_preferences (차단/숨김) - 양방향
      await supabaseAdmin
        .from("user_partner_preferences")
        .delete()
        .or(`profile_id.eq.${userId},partner_id.eq.${userId}`);

      // user_project_preferences (프로젝트 숨김)
      await supabaseAdmin
        .from("user_project_preferences")
        .delete()
        .eq("profile_id", userId);

      // user_collaboration_preferences (협업 숨김)
      await supabaseAdmin
        .from("user_collaboration_preferences")
        .delete()
        .eq("profile_id", userId);

      console.log("Deleted user preferences");
    } catch (error) {
      console.error("Error deleting user preferences:", error);
    }

    // 7. 활동/기록 테이블 삭제
    try {
      // user_recently_viewed (최근 본 항목) - 사용자가 본 항목
      await supabaseAdmin
        .from("user_recently_viewed")
        .delete()
        .eq("user_id", userId);

      // user_recently_viewed (파트너로 조회된 기록) - 다른 사람들이 이 사용자를 봤던 기록
      await supabaseAdmin
        .from("user_recently_viewed")
        .delete()
        .eq("item_id", userId)
        .eq("item_type", "partner");

      // search_queries (검색 기록)
      await supabaseAdmin
        .from("search_queries")
        .delete()
        .eq("user_id", userId);

      // user_activities (최근 활동)
      await supabaseAdmin
        .from("user_activities")
        .delete()
        .eq("user_id", userId);

      // user_login_streaks (로그인 스트릭)
      await supabaseAdmin
        .from("user_login_streaks")
        .delete()
        .eq("user_id", userId);

      // profile_views (프로필 조회 기록) - 양방향
      await supabaseAdmin
        .from("profile_views")
        .delete()
        .or(`profile_id.eq.${userId},viewer_id.eq.${userId}`);

      console.log("Deleted activity and history data");
    } catch (error) {
      console.error("Error deleting activity data:", error);
    }

    // 8. 사용자 데이터 테이블 삭제
    try {
      // user_badges (배지)
      await supabaseAdmin
        .from("user_badges")
        .delete()
        .eq("user_id", userId);

      // user_bookmarks (북마크)
      await supabaseAdmin
        .from("user_bookmarks")
        .delete()
        .eq("user_id", userId);

      // user_notification_settings (알림 설정)
      await supabaseAdmin
        .from("user_notification_settings")
        .delete()
        .eq("user_id", userId);

      // user_push_tokens (푸시 토큰)
      await supabaseAdmin
        .from("user_push_tokens")
        .delete()
        .eq("user_id", userId);

      console.log("Deleted user data (badges, bookmarks, settings)");
    } catch (error) {
      console.error("Error deleting user data:", error);
    }

    // 9. 참여/멤버십 테이블 삭제
    try {
      // chat_participants (채팅 참가자)
      await supabaseAdmin
        .from("chat_participants")
        .delete()
        .eq("user_id", userId);

      // collaboration_members (협업 멤버)
      await supabaseAdmin
        .from("collaboration_members")
        .delete()
        .eq("user_id", userId);

      console.log("Deleted participation data");
    } catch (error) {
      console.error("Error deleting participation data:", error);
    }

    // 10. 기타 데이터 삭제
    try {
      // 팔로우/팔로워 관계 삭제
      await supabaseAdmin
        .from("follows")
        .delete()
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

      // 좋아요 삭제
      await supabaseAdmin
        .from("likes")
        .delete()
        .eq("user_id", userId);

      // 댓글 삭제
      await supabaseAdmin
        .from("comments")
        .delete()
        .eq("user_id", userId);

      // 북마크 삭제
      await supabaseAdmin
        .from("bookmarks")
        .delete()
        .eq("user_id", userId);

      // 신고 내역 삭제
      await supabaseAdmin
        .from("reports")
        .delete()
        .eq("reporter_id", userId);

      // 푸시 토큰 삭제
      await supabaseAdmin
        .from("push_tokens")
        .delete()
        .eq("user_id", userId);

      console.log("Deleted additional user data");
    } catch (error) {
      console.error("Error deleting additional data:", error);
    }

    // 11. profiles 테이블 삭제 (메인 프로필)
    try {
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      console.log("Deleted main profile");
    } catch (error) {
      console.error("Error deleting main profile:", error);
    }

    // 12. 계정 삭제 요청 상태 업데이트 (있는 경우)
    if (requestId) {
      try {
        await supabaseAdmin
          .from("account_deletion_requests")
          .update({
            status: "approved",
            processed_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        console.log(`Updated deletion request: ${requestId}`);
      } catch (error) {
        console.error("Error updating deletion request:", error);
      }
    }

    // 13. auth.users에서 사용자 삭제 (마지막 단계)
    try {
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        throw deleteUserError;
      }

      console.log(`Deleted auth user: ${userId}`);
    } catch (error) {
      console.error("Error deleting auth user:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to delete auth user",
          message: error instanceof Error ? error.message : "Unknown error",
        } as DeleteAccountResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        message: "User account deleted successfully",
        deletedData,
      } as DeleteAccountResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting user account:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      } as DeleteAccountResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
