/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../lib/supabase';

/**
 * Supabase 연결 상태 및 설정을 확인하는 유틸리티
 */
export async function checkSupabaseConnection() {
  const results = {
    config: {
      url: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
      anonKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0,
    },
    connection: {
      canConnect: false,
      error: null as string | null,
      responseTime: 0,
    },
    auth: {
      hasSession: false,
      sessionValid: false,
      user: null as any,
      error: null as string | null,
    },
  };

  // 1. 연결 테스트 (간단한 쿼리 실행)
  try {
    const startTime = performance.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const endTime = performance.now();

    results.connection.responseTime = Math.round(endTime - startTime);

    if (error) {
      results.connection.error = error.message;
      console.error('❌ Supabase connection failed:', error);
    } else {
      results.connection.canConnect = true;
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    results.connection.error = String(err);
    console.error('❌ Supabase connection error:', err);
  }

  // 2. 인증 상태 확인
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      results.auth.error = sessionError.message;
      console.error('❌ Session check failed:', sessionError);
    } else if (session) {
      results.auth.hasSession = true;
      results.auth.user = {
        id: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at,
      };

      // 토큰 유효성 확인
      const { error: userError } = await supabase.auth.getUser();
      if (!userError) {
        results.auth.sessionValid = true;
        console.log('✅ Session is valid');
      } else {
        results.auth.error = userError.message;
        console.warn('⚠️ Session exists but is invalid:', userError);
      }
    } else {
      console.log('ℹ️ No active session');
    }
  } catch (err) {
    results.auth.error = String(err);
    console.error('❌ Auth check error:', err);
  }

  // 3. 결과 출력
  console.group('📊 Supabase Status Check');
  console.log('🔧 Config:', results.config);
  console.log('🌐 Connection:', results.connection);
  console.log('🔐 Auth:', results.auth);
  console.groupEnd();

  return results;
}

/**
 * 브라우저 콘솔에서 직접 호출 가능하도록 window 객체에 추가
 */
if (typeof window !== 'undefined') {
  (window as any).checkSupabase = checkSupabaseConnection;
}
