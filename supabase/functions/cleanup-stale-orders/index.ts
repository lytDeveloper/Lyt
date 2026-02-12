import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 30분 이상 된 payment_requested 주문을 expired로 처리
const STALE_THRESHOLD_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 30분 전 시간 계산
    const thresholdTime = new Date(
      Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000
    ).toISOString();

    console.log(`[cleanup-stale-orders] Threshold time: ${thresholdTime}`);

    // payment_requested 상태이고 생성된 지 30분 이상 된 주문을 expired로 업데이트
    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "payment_requested")
      .lt("created_at", thresholdTime)
      .select("id");

    if (error) {
      console.error("[cleanup-stale-orders] Error:", error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const expiredCount = data?.length ?? 0;
    console.log(`[cleanup-stale-orders] Expired ${expiredCount} stale orders`);

    return new Response(
      JSON.stringify({
        success: true,
        expiredCount,
        thresholdMinutes: STALE_THRESHOLD_MINUTES,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("[cleanup-stale-orders] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
