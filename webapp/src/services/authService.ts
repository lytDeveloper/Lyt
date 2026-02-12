import { supabase } from '../lib/supabase';
import { type Session, type User } from '@supabase/supabase-js';

export class AuthService {
  /**
   * Sign in with Google OAuth
   *
   * @param redirectTo - Optional redirect URL after authentication
   */
  static async signInWithGoogle(redirectTo?: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
      console.log('✓ Google 로그인 성공:', data);
      return data;
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      throw error;
    }
  }

  /**
   * Sign in with Apple OAuth
   *
   * @param redirectTo - Optional redirect URL after authentication
   */
  static async signInWithApple(redirectTo?: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      console.log('✓ Apple 로그인 성공:', data);
      return data;
    } catch (error) {
      console.error('Apple 로그인 실패:', error);
      throw error;
    }
  }

  /**
   * Get current session
   *
   * @returns Current session or null
   */
  static async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('세션 확인 오류:', error);
        return null;
      }
      return data.session;
    } catch (error) {
      console.error('세션 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * Get current authenticated user
   *
   * @returns Current user or null
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('사용자 정보 확인 오류:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * Sign out current user
   */
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('✓ 로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   *
   * @returns True if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  /**
   * Refresh the current session
   *
   * @returns Refreshed session
   */
  static async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('세션 갱신 실패:', error);
      throw error;
    }
  }

  /**
   * Listen to auth state changes
   *
   * @param callback - Callback function to execute on auth state change
   * @returns Unsubscribe function
   */
  static onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        callback(event, session);
      }
    );

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Request account deletion
   *
   * @param userId - User ID to delete
   * @param reason - Optional reason for deletion
   * @returns Account deletion request result
   */
  static async requestAccountDeletion(userId: string, reason?: string) {
    try {
      // Insert deletion request into account_deletion_requests table
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: userId,
          reason: reason || null,
          requested_at: new Date().toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✓ 계정 삭제 요청 성공:', data);
      return data;
    } catch (error) {
      console.error('계정 삭제 요청 실패:', error);
      throw error;
    }
  }

  /**
   * Check if user has pending deletion request
   *
   * @param userId - User ID to check
   * @returns True if user has pending deletion request
   */
  static async hasPendingDeletionRequest(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('삭제 요청 확인 실패:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = AuthService;
