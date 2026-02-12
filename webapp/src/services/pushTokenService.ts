import { supabase } from '../lib/supabase';

export type PushTokenProvider = 'fcm' | 'apns' | 'expo' | string;
export type PushDeviceType = 'ios' | 'android' | 'web' | string;

export interface UpsertPushTokenInput {
  token: string;
  provider: PushTokenProvider;
  deviceType?: PushDeviceType;
}

/**
 * 현재 로그인된 사용자 기준으로 디바이스 푸시 토큰을 upsert 합니다.
 * - RLS 정책: auth.uid() = user_id
 * - 에러 발생 시에도 throw하지 않고 ok: false 반환 (앱 초기화 블로킹 방지)
 */
export async function upsertMyPushToken(input: UpsertPushTokenInput) {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.warn('[pushTokenService] getUser failed:', userErr.message);
      return { ok: false as const, reason: 'auth_error' as const };
    }
    const user = userData.user;
    if (!user) return { ok: false as const, reason: 'not_signed_in' as const };

    const row = {
      user_id: user.id,
      token: input.token,
      provider: input.provider,
      device_type: input.deviceType ?? null,
    };

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(row, { onConflict: 'user_id,token' });

    if (error) {
      console.warn('[pushTokenService] upsert failed:', error.message);
      return { ok: false as const, reason: 'db_error' as const };
    }
    return { ok: true as const };
  } catch (e) {
    console.warn('[pushTokenService] unexpected error:', e);
    return { ok: false as const, reason: 'unknown_error' as const };
  }
}


