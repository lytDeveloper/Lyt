import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface DownloadRecord {
  id: string;
  order_id: string;
  product_id: string;
  download_token: string;
  guest_email: string;
  guest_name: string;
  expires_at: string;
  download_count: number;
  last_downloaded_at: string | null;
  orders: {
    id: string;
    status: string;
    order_name: string;
  };
  digital_products: {
    id: string;
    name: string;
    file_path: string;
  };
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
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

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // URL 파라미터에서 토큰 읽기
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return errorResponse("Token parameter is required", 400);
    }

    // Supabase 클라이언트 생성 (service_role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 토큰 검증 (download record 조회)
    const { data: download, error: downloadError } = await supabase
      .from("digital_product_downloads")
      .select(`
        *,
        orders!inner (id, status, order_name),
        digital_products!inner (id, name, file_path)
      `)
      .eq("download_token", token)
      .maybeSingle();

    if (downloadError) {
      console.error("[download-digital-product] Database error:", downloadError);
      return errorResponse("Failed to verify download token", 500);
    }

    if (!download) {
      return errorResponse("Invalid or expired download token", 404);
    }

    const typedDownload = download as unknown as DownloadRecord;

    // 토큰 만료 확인
    const expiresAt = new Date(typedDownload.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      return errorResponse("Download link has expired", 410);
    }

    // 주문 상태 확인
    const orderStatus = typedDownload.orders.status;
    if (orderStatus !== "confirmed" && orderStatus !== "completed") {
      return errorResponse("Payment not completed", 403);
    }

    // Storage에서 파일 가져오기
    const filePath = typedDownload.digital_products.file_path;
    const { data: fileBlob, error: storageError } = await supabase.storage
      .from("digital-products")
      .download(filePath);

    if (storageError) {
      console.error("[download-digital-product] Storage error:", storageError);
      return errorResponse("Failed to retrieve file", 500);
    }

    if (!fileBlob) {
      return errorResponse("File not found", 404);
    }

    // 다운로드 카운트 증가
    await supabase
      .from("digital_product_downloads")
      .update({
        download_count: typedDownload.download_count + 1,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq("id", typedDownload.id);

    // 파일명 생성 (한글 파일명 지원)
    const fileName = `${typedDownload.digital_products.name}.pdf`;
    const encodedFileName = encodeURIComponent(fileName);

    // 파일 스트리밍
    return new Response(fileBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "no-cache",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("[download-digital-product] Unexpected error:", error);
    return errorResponse("Internal server error", 500);
  }
});
