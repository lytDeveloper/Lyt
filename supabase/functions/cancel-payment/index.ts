import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface CancelPaymentRequest {
  orderId: string;
  cancelReason: string;
}

interface CancelPaymentSuccess {
  success: true;
  message: string;
  cancelledAt: string;
  raw: Record<string, unknown>;
}

interface CancelPaymentFailure {
  success: false;
  message: string;
  code?: string;
  raw?: Record<string, unknown>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOSS_CANCEL_URL = "https://api.tosspayments.com/v1/payments";

function jsonResponse(body: CancelPaymentSuccess | CancelPaymentFailure, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, message: "Authorization header required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ success: false, message: "Unauthorized" }, 401);
    }

    const body = await req.json() as CancelPaymentRequest;
    const { orderId, cancelReason } = body;

    if (!orderId || !cancelReason) {
      return jsonResponse({ success: false, message: "Invalid request payload" }, 400);
    }

    // Get order by UUID (orderId)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ success: false, message: "Order not found" }, 404);
    }

    // Verify ownership
    if (order.user_id !== user.id) {
      return jsonResponse({ success: false, message: "Forbidden" }, 403);
    }

    // Check if order is confirmed (only confirmed payments can be cancelled)
    if (order.status !== "confirmed") {
      return jsonResponse({
        success: false,
        message: `Cannot cancel order with status: ${order.status}. Only confirmed orders can be cancelled.`
      }, 400);
    }

    // Check if payment_key exists
    if (!order.payment_key) {
      return jsonResponse({
        success: false,
        message: "Payment key not found. Cannot cancel payment."
      }, 400);
    }

    // Call Toss Payments Cancel API
    const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");
    if (!tossSecretKey) {
      return jsonResponse({ success: false, message: "Missing TOSS_SECRET_KEY" }, 500);
    }

    const basicAuth = btoa(`${tossSecretKey}:`);
    const cancelUrl = `${TOSS_CANCEL_URL}/${order.payment_key}/cancel`;

    console.log(`[cancel-payment] Calling Toss API: ${cancelUrl}`);

    const cancelResponse = await fetch(cancelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancelReason }),
    });

    const cancelText = await cancelResponse.text();
    let cancelData: Record<string, unknown> = {};
    if (cancelText) {
      try {
        cancelData = JSON.parse(cancelText);
      } catch (_error) {
        cancelData = { raw: cancelText };
      }
    }

    if (!cancelResponse.ok) {
      console.error(`[cancel-payment] Toss API error:`, cancelData);

      // Update order status to failed (optional - keep as confirmed but log failure)
      await supabase
        .from("orders")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      const failureResponse: CancelPaymentFailure = {
        success: false,
        message: cancelData?.message as string ?? "Payment cancellation failed",
        code: cancelData?.code as string,
        raw: cancelData,
      };

      return jsonResponse(failureResponse, 400);
    }

    // Update order status to cancelled
    const now = new Date().toISOString();
    await supabase
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: now,
      })
      .eq("id", order.id);

    console.log(`[cancel-payment] Successfully cancelled payment for order ${order.id}`);

    const successResponse: CancelPaymentSuccess = {
      success: true,
      message: "Payment cancelled successfully",
      cancelledAt: cancelData?.cancels?.[0]?.canceledAt as string ?? now,
      raw: cancelData,
    };

    return jsonResponse(successResponse, 200);
  } catch (error) {
    console.error("[cancel-payment] Error:", error);
    return jsonResponse({ success: false, message: "Internal server error" }, 500);
  }
});
