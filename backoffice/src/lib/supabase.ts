import { createClient } from '@supabase/supabase-js';

// Vite 환경 변수(import.meta.env)를 사용합니다.
// VITE_... 접두사는 .env_guide.md에서 정의했습니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in .env file');
}

// 웹(Vite) 버전은 AsyncStorage나 polyfill이 필요 없습니다.
// createClient는 브라우저 환경에서 자동으로 localStorage를 사용합니다.
// Note: Database 타입을 제거하여 유연한 타입 처리를 허용합니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 자동 재시도 설정
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    // 네트워크 요청에 대한 타임아웃 설정
    fetch: (url, options = {}) => {
      // AbortController를 사용하여 타임아웃 구현 (브라우저 호환성)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      })
        .then((response) => {
          clearTimeout(timeoutId);
          return response;
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          // 네트워크 에러를 더 명확하게 처리
          if (error.name === 'AbortError') {
            throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
          }
          throw error;
        });
    },
  },
});

