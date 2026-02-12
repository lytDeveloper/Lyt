import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@lyt.io";

interface RequestBody {
  email: string;
  otp: string;
}

Deno.serve(async (req) => {
  // CORS 헤더 설정
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 토큰 검증
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "인증에 실패했습니다." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 요청 본문 파싱
    const { email, otp }: RequestBody = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "이메일과 OTP 코드가 필요합니다." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Resend API를 사용하여 이메일 전송
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY가 설정되지 않았습니다.");
      return new Response(
        JSON.stringify({ error: "이메일 서비스 설정 오류" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Bridge 관리자 2단계 인증 코드",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
              <h2 style="color: #2c3e50; margin-top: 0;">2단계 인증 코드</h2>
              <p>관리자 계정 보안을 위한 2단계 인증 코드입니다.</p>
              <div style="background-color: #ffffff; border: 2px solid #3498db; border-radius: 4px; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #3498db; font-size: 32px; letter-spacing: 4px; margin: 0;">${otp}</h1>
              </div>
              <p style="color: #7f8c8d; font-size: 14px;">이 코드는 5분간 유효합니다.</p>
              <p style="color: #7f8c8d; font-size: 14px;">만약 본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
            </div>
          </body>
          </html>
        `,
        text: `Bridge 관리자 2단계 인증 코드: ${otp}\n\n이 코드는 5분간 유효합니다.`,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("이메일 전송 실패:", errorData);
      return new Response(
        JSON.stringify({ error: "이메일 전송에 실패했습니다." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "이메일이 전송되었습니다." }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("에러:", error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});























