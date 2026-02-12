// ============================================================================
// BridgeApp Scheduled Activity Reminders Edge Function
// - 매일 실행되어 마감 임박 및 초대 대기 알림을 user_activities에 기록
// - pg_cron 또는 외부 스케줄러에서 호출
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS 헤더
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivityInsert {
  user_id: string;
  activity_type: string;
  related_entity_type: string;
  related_entity_id: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[scheduled-activity-reminders] Starting scheduled check...");

    // Supabase 클라이언트 생성 (Service Role Key 사용)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const activitiesToInsert: ActivityInsert[] = [];

    // ========================================================================
    // 1. 프로젝트 마감 임박 체크 (24시간 이내)
    // ========================================================================
    const { data: projectsApproaching, error: projectsError } = await supabase
      .from("projects")
      .select("id, title, created_by, deadline")
      .in("status", ["open", "in_progress"])
      .not("deadline", "is", null)
      .gte("deadline", now.toISOString())
      .lte("deadline", in24Hours.toISOString());

    if (projectsError) {
      console.error("[scheduled-activity-reminders] Error fetching projects:", projectsError);
    } else if (projectsApproaching && projectsApproaching.length > 0) {
      console.log(`[scheduled-activity-reminders] Found ${projectsApproaching.length} projects with approaching deadline`);

      for (const project of projectsApproaching) {
        // 오늘 이미 같은 알림을 보냈는지 확인
        const { data: existingActivity } = await supabase
          .from("user_activities")
          .select("id")
          .eq("user_id", project.created_by)
          .eq("activity_type", "workflow_deadline_approaching")
          .eq("related_entity_id", project.id)
          .gte("created_at", now.toISOString().split("T")[0]) // 오늘 날짜만
          .maybeSingle();

        if (!existingActivity) {
          activitiesToInsert.push({
            user_id: project.created_by,
            activity_type: "workflow_deadline_approaching",
            related_entity_type: "project",
            related_entity_id: project.id,
            title: "프로젝트 마감이 임박했습니다",
            description: project.title || "",
            metadata: {
              deadline: project.deadline,
              hours_remaining: Math.floor((new Date(project.deadline).getTime() - now.getTime()) / (1000 * 60 * 60)),
            },
          });
        }
      }
    }

    // ========================================================================
    // 2. 협업 마감 임박 체크 (24시간 이내)
    // ========================================================================
    const { data: collabsApproaching, error: collabsError } = await supabase
      .from("collaborations")
      .select("id, title, created_by, deadline")
      .in("status", ["open", "in_progress"])
      .not("deadline", "is", null)
      .gte("deadline", now.toISOString())
      .lte("deadline", in24Hours.toISOString());

    if (collabsError) {
      console.error("[scheduled-activity-reminders] Error fetching collaborations:", collabsError);
    } else if (collabsApproaching && collabsApproaching.length > 0) {
      console.log(`[scheduled-activity-reminders] Found ${collabsApproaching.length} collaborations with approaching deadline`);

      for (const collab of collabsApproaching) {
        const { data: existingActivity } = await supabase
          .from("user_activities")
          .select("id")
          .eq("user_id", collab.created_by)
          .eq("activity_type", "workflow_deadline_approaching")
          .eq("related_entity_id", collab.id)
          .gte("created_at", now.toISOString().split("T")[0])
          .maybeSingle();

        if (!existingActivity) {
          activitiesToInsert.push({
            user_id: collab.created_by,
            activity_type: "workflow_deadline_approaching",
            related_entity_type: "collaboration",
            related_entity_id: collab.id,
            title: "협업 마감이 임박했습니다",
            description: collab.title || "",
            metadata: {
              deadline: collab.deadline,
              hours_remaining: Math.floor((new Date(collab.deadline).getTime() - now.getTime()) / (1000 * 60 * 60)),
            },
          });
        }
      }
    }

    // ========================================================================
    // 3. 프로젝트 초대 대기 체크 (2일 이상 pending)
    // ========================================================================
    const { data: projectInvitations, error: projectInvError } = await supabase
      .from("project_invitations")
      .select(`
        id,
        invitee_id,
        project_id,
        sent_date,
        projects:project_id (title)
      `)
      .eq("status", "pending")
      .lte("sent_date", twoDaysAgo.toISOString());

    if (projectInvError) {
      console.error("[scheduled-activity-reminders] Error fetching project invitations:", projectInvError);
    } else if (projectInvitations && projectInvitations.length > 0) {
      console.log(`[scheduled-activity-reminders] Found ${projectInvitations.length} pending project invitations`);

      for (const inv of projectInvitations) {
        const { data: existingActivity } = await supabase
          .from("user_activities")
          .select("id")
          .eq("user_id", inv.invitee_id)
          .eq("activity_type", "invitation_pending_reminder")
          .eq("related_entity_id", inv.project_id)
          .gte("created_at", now.toISOString().split("T")[0])
          .maybeSingle();

        if (!existingActivity) {
          const projectTitle = (inv.projects as { title?: string })?.title || "";
          activitiesToInsert.push({
            user_id: inv.invitee_id,
            activity_type: "invitation_pending_reminder",
            related_entity_type: "project",
            related_entity_id: inv.project_id,
            title: "응답 대기 중인 프로젝트 초대가 있습니다",
            description: projectTitle,
            metadata: {
              invitation_id: inv.id,
              sent_date: inv.sent_date,
              days_pending: Math.floor((now.getTime() - new Date(inv.sent_date).getTime()) / (1000 * 60 * 60 * 24)),
            },
          });
        }
      }
    }

    // ========================================================================
    // 4. 협업 초대 대기 체크 (2일 이상 pending)
    // ========================================================================
    const { data: collabInvitations, error: collabInvError } = await supabase
      .from("collaboration_invitations")
      .select(`
        id,
        invitee_id,
        collaboration_id,
        sent_date,
        collaborations:collaboration_id (title)
      `)
      .eq("status", "pending")
      .lte("sent_date", twoDaysAgo.toISOString());

    if (collabInvError) {
      console.error("[scheduled-activity-reminders] Error fetching collaboration invitations:", collabInvError);
    } else if (collabInvitations && collabInvitations.length > 0) {
      console.log(`[scheduled-activity-reminders] Found ${collabInvitations.length} pending collaboration invitations`);

      for (const inv of collabInvitations) {
        const { data: existingActivity } = await supabase
          .from("user_activities")
          .select("id")
          .eq("user_id", inv.invitee_id)
          .eq("activity_type", "invitation_pending_reminder")
          .eq("related_entity_id", inv.collaboration_id)
          .gte("created_at", now.toISOString().split("T")[0])
          .maybeSingle();

        if (!existingActivity) {
          const collabTitle = (inv.collaborations as { title?: string })?.title || "";
          activitiesToInsert.push({
            user_id: inv.invitee_id,
            activity_type: "invitation_pending_reminder",
            related_entity_type: "collaboration",
            related_entity_id: inv.collaboration_id,
            title: "응답 대기 중인 협업 초대가 있습니다",
            description: collabTitle,
            metadata: {
              invitation_id: inv.id,
              sent_date: inv.sent_date,
              days_pending: Math.floor((now.getTime() - new Date(inv.sent_date).getTime()) / (1000 * 60 * 60 * 24)),
            },
          });
        }
      }
    }

    // ========================================================================
    // 5. 활동 기록 일괄 삽입
    // ========================================================================
    if (activitiesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("user_activities")
        .insert(activitiesToInsert);

      if (insertError) {
        console.error("[scheduled-activity-reminders] Error inserting activities:", insertError);
        throw insertError;
      }

      console.log(`[scheduled-activity-reminders] Successfully inserted ${activitiesToInsert.length} activity reminders`);
    } else {
      console.log("[scheduled-activity-reminders] No reminders to insert");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed reminders`,
        inserted: activitiesToInsert.length,
        breakdown: {
          deadline_reminders: activitiesToInsert.filter(a => a.activity_type === "workflow_deadline_approaching").length,
          invitation_reminders: activitiesToInsert.filter(a => a.activity_type === "invitation_pending_reminder").length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[scheduled-activity-reminders] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
