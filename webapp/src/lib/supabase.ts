import { createClient } from '@supabase/supabase-js';

// Vite 환경 변수(import.meta.env)를 사용합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
❌ Supabase 환경 변수가 설정되지 않았습니다!

.env 파일을 webapp 디렉토리에 생성하고 다음 변수들을 설정하세요:

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

.env.example 파일을 참고하세요.
  `.trim();
  console.error(errorMessage);
  throw new Error('Supabase URL and Anon Key must be defined in .env file');
}

// 웹(Vite) 버전은 AsyncStorage나 polyfill이 필요 없습니다.
// createClient는 브라우저 환경에서 자동으로 localStorage를 사용합니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // AuthCallback에서 수동으로 처리하여 중복 방지
    // 현재 리다이렉트 결과가 #access_token 형식이므로 implicit 흐름을 명시
    // // pkce 로 추후 넘어가?
    flowType: 'pkce',
  },
  db: {
    schema: 'public',
  },
  // 주의: Storage 업로드 시 전역 Content-Type이 있으면 파일이 application/json으로 저장될 수 있으므로 설정하지 않는다.
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
});

// 게스트 전용 익명 클라이언트 (auth 세션 없이 순수 anon 키만 사용)
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // 세션 저장 비활성화
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
});


