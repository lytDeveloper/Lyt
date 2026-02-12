/**
 * 랜딩페이지 문의 RLS 정책 추가 스크립트
 * 익명 사용자가 랜딩페이지에서 문의를 제출할 수 있도록 허용
 *
 * 사용법:
 *   node scripts/applyLandingInquiryPolicy.js [dev|prod]
 *
 * 예시:
 *   node scripts/applyLandingInquiryPolicy.js dev
 *   node scripts/applyLandingInquiryPolicy.js prod
 */

const { createClient } = require('@supabase/supabase-js');

// 환경별 Supabase 연결 정보
const ENVIRONMENTS = {
  dev: {
    url: 'https://xianrhwkdarupnvaumti.supabase.co',
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYW5yaHdrZGFydXBudmF1bXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0MzUzMSwiZXhwIjoyMDc2ODE5NTMxfQ.qrnf1T_WzHXwbSdgw_0hQH0xb9QrAInf7t6-5KAkLtI'
  },
  prod: {
    url: process.env.PROD_SUPABASE_URL || '',
    serviceRoleKey: process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || ''
  }
};

// RLS 정책 생성 SQL
const CREATE_POLICY_SQL = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'inquiries'
          AND policyname = 'Anon users can insert landing inquiries'
    ) THEN
        CREATE POLICY "Anon users can insert landing inquiries" ON public.inquiries
        FOR INSERT
        TO anon
        WITH CHECK (
            auth.role() = 'anon'
            AND user_id IS NULL
            AND inquiry_type = 'general'
            AND subject = '랜딩페이지 문의'
        );
        RAISE NOTICE '✅ 정책이 생성되었습니다.';
    ELSE
        RAISE NOTICE '⚠️ 정책이 이미 존재합니다.';
    END IF;
END
$$;
`;

async function applyPolicy(env) {
  const config = ENVIRONMENTS[env];

  if (!config || !config.url || !config.serviceRoleKey) {
    console.error(`❌ ${env} 환경의 설정이 없거나 불완전합니다.`);
    if (env === 'prod') {
      console.log('\n📝 prod 환경 설정 방법:');
      console.log('   PROD_SUPABASE_URL=... PROD_SUPABASE_SERVICE_ROLE_KEY=... node scripts/applyLandingInquiryPolicy.js prod');
    }
    return false;
  }

  console.log(`\n🔧 ${env.toUpperCase()} 환경에 RLS 정책 적용 중...`);
  console.log(`   URL: ${config.url}\n`);

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // SQL 실행 (Supabase에서 직접 SQL 실행)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: CREATE_POLICY_SQL
    });

    if (error) {
      // exec_sql RPC가 없는 경우 - Dashboard에서 수동 실행 안내
      if (error.message.includes('function') || error.code === 'PGRST202') {
        console.log('⚠️  exec_sql RPC가 없습니다. Supabase Dashboard에서 직접 실행해주세요.\n');
        console.log('📋 실행할 SQL:');
        console.log('─'.repeat(60));
        console.log(CREATE_POLICY_SQL);
        console.log('─'.repeat(60));
        console.log('\n🔗 Dashboard SQL Editor:');
        console.log(`   ${config.url.replace('.supabase.co', '')}/project/_/sql`);
        return false;
      }
      throw error;
    }

    console.log(`✅ ${env.toUpperCase()} 환경에 정책 적용 완료!`);
    return true;

  } catch (error) {
    console.error(`❌ ${env.toUpperCase()} 환경 적용 실패:`, error.message);
    return false;
  }
}

async function main() {
  const env = process.argv[2];

  console.log('═'.repeat(60));
  console.log('🚀 랜딩페이지 문의 RLS 정책 적용 스크립트');
  console.log('═'.repeat(60));

  if (!env) {
    console.log('\n사용법: node scripts/applyLandingInquiryPolicy.js [dev|prod|all]');
    console.log('\n예시:');
    console.log('  node scripts/applyLandingInquiryPolicy.js dev   # dev 환경만');
    console.log('  node scripts/applyLandingInquiryPolicy.js prod  # prod 환경만');
    console.log('  node scripts/applyLandingInquiryPolicy.js all   # 모든 환경');
    process.exit(1);
  }

  if (env === 'all') {
    await applyPolicy('dev');
    await applyPolicy('prod');
  } else if (ENVIRONMENTS[env]) {
    await applyPolicy(env);
  } else {
    console.error(`❌ 알 수 없는 환경: ${env}`);
    console.log('   지원 환경: dev, prod, all');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📋 적용된 정책 정보:');
  console.log('   이름: Anon users can insert landing inquiries');
  console.log('   대상: 익명 사용자 (anon)');
  console.log('   조건: user_id IS NULL');
  console.log('         inquiry_type = \'general\'');
  console.log('         subject = \'랜딩페이지 문의\'');
  console.log('═'.repeat(60));
}

main();
