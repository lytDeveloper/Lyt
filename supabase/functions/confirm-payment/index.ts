import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface ConfirmPaymentRequest {
  orderId: string;
  paymentKey: string;
  amount: number;
  idempotencyKey: string;
}

interface ConfirmPaymentSuccess {
  success: true;
  orderId: string;
  paymentKey: string;
  status: "confirmed";
  paymentMethod?: string | null;
  approvedAt?: string | null;
  downloadToken?: string | null;
  productId?: string | null;
  raw: Record<string, unknown>;
}

interface ConfirmPaymentFailure {
  success: false;
  orderId?: string;
  paymentKey?: string;
  code?: string;
  message: string;
  raw?: Record<string, unknown>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

function jsonResponse(body: ConfirmPaymentSuccess | ConfirmPaymentFailure, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

async function readRequestBody(req: Request): Promise<ConfirmPaymentRequest> {
  const body = await req.json();
  return body as ConfirmPaymentRequest;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    // 인증을 선택적으로 처리 (게스트 허용)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (authHeader) {
      // 인증 시도 - 실패 시 게스트로 처리 (anon key로 호출되는 경우 포함)
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
      // user가 null이면 게스트로 처리 (401 반환하지 않음)
    }

    const body = await readRequestBody(req);
    const { orderId, paymentKey, amount, idempotencyKey } = body;

    if (!orderId || !paymentKey || !amount || !idempotencyKey) {
      return jsonResponse({ success: false, message: "Invalid request payload" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("toss_order_id", orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ success: false, message: "Order not found" }, 404);
    }

    // 주문 권한 검증 (인증 사용자 OR 게스트)
    if (order.user_id) {
      // 인증 사용자 주문 - userId 일치 확인
      if (order.user_id !== userId) {
        return jsonResponse({ success: false, message: "Forbidden" }, 403);
      }
    }
    // 게스트 주문 - toss_order_id로만 검증 (이미 위에서 확인됨)

    if (order.amount !== amount) {
      return jsonResponse({ success: false, message: "Amount mismatch" }, 400);
    }

    if (order.status === "confirmed" || order.status === "completed") {
      const existing: ConfirmPaymentSuccess = {
        success: true,
        orderId,
        paymentKey: order.payment_key ?? paymentKey,
        status: "confirmed",
        paymentMethod: order.payment_method,
        approvedAt: order.confirmed_at,
        raw: { status: order.status },
      };
      return jsonResponse(existing, 200);
    }

    const { data: existingKey } = await supabase
      .from("payment_idempotency_keys")
      .select("response")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingKey?.response) {
      return jsonResponse(existingKey.response as ConfirmPaymentSuccess, 200);
    }

    const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");
    if (!tossSecretKey) {
      return jsonResponse({ success: false, message: "Missing TOSS_SECRET_KEY" }, 500);
    }

    const basicAuth = btoa(`${tossSecretKey}:`);
    const confirmResponse = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const confirmText = await confirmResponse.text();
    let confirmData: Record<string, unknown> = {};
    if (confirmText) {
      try {
        confirmData = JSON.parse(confirmText);
      } catch (_error) {
        confirmData = { raw: confirmText };
      }
    }

    if (!confirmResponse.ok) {
      await supabase
        .from("orders")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          failure_code: confirmData?.code ?? null,
          failure_message: confirmData?.message ?? "Payment confirmation failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      const failureResponse: ConfirmPaymentFailure = {
        success: false,
        orderId,
        paymentKey,
        code: confirmData?.code,
        message: confirmData?.message ?? "Payment confirmation failed",
        raw: confirmData,
      };

      await supabase
        .from("payment_idempotency_keys")
        .upsert({
          idempotency_key: idempotencyKey,
          order_id: order.id,
          response: failureResponse,
        }, { onConflict: "idempotency_key" });

      return jsonResponse(failureResponse, 400);
    }

    await supabase
      .from("orders")
      .update({
        status: "confirmed",
        payment_key: paymentKey,
        payment_method: confirmData?.method ?? null,
        confirmed_at: confirmData?.approvedAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // 디지털 상품 결제 완료 시 다운로드 토큰 생성
    let downloadToken: string | null = null;

    if (order.order_type === "digital_product" && order.related_id) {
      downloadToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30일 후

      // digital_product_downloads 레코드 생성
      const { error: downloadError } = await supabase
        .from("digital_product_downloads")
        .insert({
          order_id: order.id,
          product_id: order.related_id,
          download_token: downloadToken,
          guest_email: order.guest_email ?? order.user_id, // guest_email 또는 user_id 사용
          guest_name: order.guest_name ?? "User",
          expires_at: expiresAt,
        });

      if (downloadError) {
        console.error("[confirm-payment] Failed to create download token:", downloadError);
        downloadToken = null; // 실패 시 null로 리셋
      } else {
        // 이메일 전송 (비동기 - 실패해도 결제는 성공)
        supabase.functions
          .invoke("send-digital-product-email", {
            body: {
              email: order.guest_email ?? order.user_id,
              name: order.guest_name ?? "User",
              productName: order.order_name,
              downloadToken: downloadToken,
            },
          })
          .catch((emailError) => {
            console.error("[confirm-payment] Failed to send email:", emailError);
          });

        console.log(`[confirm-payment] Download token created: ${downloadToken} for order ${order.id}`);
      }
    }

    const successResponse: ConfirmPaymentSuccess = {
      success: true,
      orderId,
      paymentKey,
      status: "confirmed",
      paymentMethod: confirmData?.method ?? null,
      approvedAt: confirmData?.approvedAt ?? null,
      downloadToken,
      productId: order.related_id ?? null,
      raw: confirmData,
    };

    await supabase
      .from("payment_idempotency_keys")
      .upsert({
        idempotency_key: idempotencyKey,
        order_id: order.id,
        response: successResponse,
      }, { onConflict: "idempotency_key" });

    return jsonResponse(successResponse, 200);
  } catch (error) {
    console.error("[confirm-payment] Error:", error);
    return jsonResponse({ success: false, message: "Internal server error" }, 500);
  }
});
