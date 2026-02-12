import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface SendEmailRequest {
  email: string;
  name: string;
  productName: string;
  downloadToken: string;
}

interface ResendResponse {
  id?: string;
  message?: string;
  statusCode?: number;
  name?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json() as SendEmailRequest;
    const { email, name, productName, downloadToken } = body;

    if (!email || !name || !productName || !downloadToken) {
      return jsonResponse({ success: false, message: "Missing required fields" }, 400);
    }

    // Resend API 키 확인
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-digital-product-email] RESEND_API_KEY not configured");
      return jsonResponse({ success: false, message: "Email service not configured" }, 500);
    }

    // 앱 URL 가져오기
    const appUrl = Deno.env.get("APP_URL") || "https://app.lyt-app.io";
    const downloadUrl = `${appUrl}/download?token=${downloadToken}`;

    // 이메일 HTML 템플릿
    const emailHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>디지털 상품 다운로드</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                구매 완료
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                디지털 상품이 준비되었습니다
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                안녕하세요, <strong>${name}</strong>님!
              </p>

              <p style="margin: 0 0 30px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                <strong style="color: #333333;">${productName}</strong> 구매가 완료되었습니다.<br>
                아래 버튼을 클릭하시면 파일을 다운로드할 수 있습니다.
              </p>

              <!-- Download Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${downloadUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      📥 다운로드하기
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px; font-weight: 600;">
                  📌 안내사항
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>다운로드 링크는 <strong>30일간</strong> 유효합니다.</li>
                  <li>만료 후에는 재다운로드가 불가능하오니 미리 저장해주세요.</li>
                  <li>이메일이나 다운로드 링크 관련 문의는 고객센터로 연락해주세요.</li>
                </ul>
              </div>

              <!-- Direct Link -->
              <p style="margin: 20px 0 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                버튼이 작동하지 않으면 아래 링크를 복사하여 사용하세요:<br>
                <a href="${downloadUrl}" style="color: #667eea; word-break: break-all;">${downloadUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #333333; font-size: 16px; font-weight: 600;">
                Lyt App
              </p>
              <p style="margin: 0; color: #999999; font-size: 13px;">
                브랜드, 아티스트, 크리에이티브, 팬을 연결하는 하이브리드 모바일 앱
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 발신 이메일 (DIGITAL_PRODUCT_FROM_EMAIL 환경변수 또는 Resend 테스트 발신자)
    // lyt-app.io 도메인 인증 후 DIGITAL_PRODUCT_FROM_EMAIL=Lyt App <noreply@lyt-app.io> 로 변경
    const fromEmail = Deno.env.get("DIGITAL_PRODUCT_FROM_EMAIL") || "Lyt App <onboarding@resend.dev>";

    // Resend API로 이메일 전송
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `[Lyt] ${productName} 다운로드 안내`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json() as ResendResponse;

    if (!resendResponse.ok) {
      console.error("[send-digital-product-email] Resend API error:", JSON.stringify(resendData));
      return jsonResponse({
        success: false,
        message: resendData.message ?? "Failed to send email",
        resendError: resendData,
      }, 500);
    }

    // 이메일 전송 성공 시 DB 업데이트
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("digital_product_downloads")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("download_token", downloadToken);

    console.log(`[send-digital-product-email] Email sent successfully to ${email}. Resend ID: ${resendData.id}`);

    return jsonResponse({
      success: true,
      message: "Email sent successfully",
      resendId: resendData.id,
    }, 200);

  } catch (error) {
    console.error("[send-digital-product-email] Unexpected error:", error);
    return jsonResponse({ success: false, message: "Internal server error" }, 500);
  }
});
