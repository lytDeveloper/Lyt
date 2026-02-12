import { supabase } from '../lib/supabase';
import type { Admin } from '../types/database.types';

/**
 * 비밀번호 재설정 이메일 전송
 * 환경 변수 VITE_BACKOFFICE_URL이 설정되어 있으면 해당 URL을 사용하고,
 * 없으면 현재 window.location.origin을 사용합니다.
 */
export async function sendPasswordReset(email: string) {
  // backoffice URL 설정 (환경 변수 또는 현재 origin)
  const backofficeUrl = import.meta.env.VITE_BACKOFFICE_URL || window.location.origin;
  const redirectTo = `${backofficeUrl}/auth/reset`;
  
  console.log('비밀번호 재설정 리다이렉트 URL:', redirectTo);
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}
/**
 * 현재 로그인한 사용자가 관리자인지 확인
 */
export async function checkIsAdmin(): Promise<Admin | null> {
  try {
    // 1. 현재 사용자 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('사용자 가져오기 실패:', userError);
      return null;
    }
    
    if (!user) {
      console.warn('로그인한 사용자가 없습니다.');
      return null;
    }

    // 2. admins 테이블에서 해당 사용자 확인
    // .maybeSingle()을 사용하여 레코드가 없을 때 에러 대신 null 반환
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (adminError) {
      // 상세한 에러 정보 로깅
      console.error('admins 테이블 조회 실패:', {
        code: adminError.code,
        message: adminError.message,
        details: adminError.details,
        hint: adminError.hint,
        userId: user.id,
      });
      
      // PGRST116은 레코드를 찾을 수 없는 경우 (정상적인 경우)
      // 하지만 RLS 정책 때문에 접근이 거부될 수도 있음
      if (adminError.code === 'PGRST116') {
        console.warn(`admins 테이블에 profile_id(${user.id.substring(0, 8)}...)가 등록되어 있지 않습니다.`);
      } else if (adminError.code === 'PGRST301' || adminError.message?.includes('permission') || adminError.message?.includes('RLS')) {
        // RLS 정책 관련 에러
        console.error('RLS 정책으로 인해 admins 테이블에 접근할 수 없습니다. RLS 정책을 확인하세요.');
      }
      return null;
    }

    if (!admin) {
      console.warn(`admins 테이블에 profile_id(${user.id.substring(0, 8)}...)가 등록되어 있지 않습니다.`);
      
      // 디버깅을 위해 실제로 데이터베이스에 해당 profile_id가 있는지 확인 (RLS 없이 직접 확인)
      // 참고: 이 쿼리는 RLS 정책을 우회할 수 없으므로, 디버깅 목적으로만 사용
      const { data: debugData, error: debugError } = await supabase
        .from('admins')
        .select('profile_id, email')
        .eq('profile_id', user.id)
        .limit(1);
      
      if (debugError) {
        console.error('디버깅 쿼리 에러:', debugError);
      } else if (debugData && debugData.length > 0) {
        console.warn('⚠️ 데이터는 존재하지만 RLS 정책으로 인해 접근할 수 없습니다:', debugData);
      }
      
      return null;
    }

    return admin as Admin;
  } catch (error) {
    console.error('관리자 확인 중 오류:', error);
    return null;
  }
}

/**
 * 로그인 (재시도 로직 포함)
 */
export async function signIn(email: string, password: string) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1초
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 네트워크 관련 에러가 아니면 즉시 에러 던지기
        if (!isRetryableError(error)) {
          throw error;
        }
        
        // 네트워크 에러인 경우 재시도
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`로그인 시도 ${attempt}/${maxRetries} 실패, ${retryDelay}ms 후 재시도...`, error.message);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('로그인에 실패했습니다. 사용자 정보를 가져올 수 없습니다.');
      }

      // 잠시 대기 (세션이 완전히 설정되도록)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 관리자 권한 확인
      const admin = await checkIsAdmin();
      if (!admin) {
        // 관리자가 아니면 로그아웃
        await supabase.auth.signOut();
        
        // 디버깅 정보 제공
        console.error('관리자 권한 확인 실패:', {
          userId: data.user.id,
          email: data.user.email,
        });
        
        throw new Error(
          '관리자 권한이 없습니다. ' +
          'admins 테이블에 해당 사용자가 등록되어 있는지 확인하세요. ' +
          `User ID: ${data.user.id.substring(0, 8)}...`
        );
      }

      return { user: data.user, admin };
    } catch (error) {
      // 네트워크 관련 에러인지 확인
      if (isRetryableError(error) && attempt < maxRetries) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`로그인 시도 ${attempt}/${maxRetries} 실패, ${retryDelay * attempt}ms 후 재시도...`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
      
      // 재시도 불가능한 에러이거나 최대 재시도 횟수 초과
      throw error;
    }
  }
  
  // 이론적으로 도달할 수 없는 코드이지만 타입 안전성을 위해
  throw lastError || new Error('로그인에 실패했습니다.');
}

/**
 * 재시도 가능한 에러인지 확인
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  // Error 객체나 에러와 유사한 객체인지 확인
  const errorObj = error as { message?: string; code?: string; name?: string };
  const errorMessage = (errorObj.message || '').toLowerCase();
  const errorCode = (errorObj.code || '').toLowerCase();
  const errorName = (errorObj.name || '').toLowerCase();
  
  // 네트워크 관련 에러들
  const retryablePatterns = [
    'failed to fetch',
    'network error',
    'networkerror',
    'err_name_not_resolved',
    'err_internet_disconnected',
    'err_connection_refused',
    'err_connection_timed_out',
    'err_connection_reset',
    'authretryablefetcherror',
    'timeout',
  ];
  
  return retryablePatterns.some(pattern => 
    errorMessage.includes(pattern) || 
    errorCode.includes(pattern) || 
    errorName.includes(pattern)
  );
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * 세션 확인
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return session;
}

