import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

// 프로필 타입 (필요한 컬럼만)
export interface Profile {
  nickname: string | null;
  roles: string[]; // 활성화된 프로필들의 role 배열 (fan, brand, artist, creative)
  banned_until: string | null;
  terms_agreed_at: string | null;
}

// Context 타입 정의
export type ProfileStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'error';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileStatus: ProfileStatus;
  refetchProfile: () => Promise<void>;
}

// Context 생성 (초기값 null)
export const AuthContext = createContext<AuthContextType | null>(null);

// Context를 사용하기 위한 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


