import { supabase } from '../lib/supabase';

export type ServerNotificationAudience = 'all' | 'brand' | 'creator' | 'admin';
export type ServerNotificationType = 'announcement' | 'update' | 'maintenance' | 'version_update';

export interface ServerNotification {
  id: string;
  title: string;
  content: string;
  type: ServerNotificationType;
  audiences: ServerNotificationAudience[];
  priority: number;
  locale?: string | null;
  app_min_version?: string | null;
  app_max_version?: string | null;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

export class ServerNotificationService {
  /**
   * Get all active server notifications (admin announcements)
   *
   * @param audiences - Target audiences to filter by
   * @param locale - Optional locale filter
   * @returns Array of active server notifications
   */
  static async getActiveNotifications(
    audiences: ServerNotificationAudience[] = ['all'],
    locale?: string | null
  ): Promise<ServerNotification[]> {
    try {
      let query = supabase
        .from('active_notifications')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by audiences (if not just 'all')
      if (audiences.length > 0 && !(audiences.length === 1 && audiences[0] === 'all')) {
        query = query.overlaps('audiences', audiences);
      }

      // Filter by locale if provided
      if (locale) {
        query = query.or(`locale.is.null,locale.eq.${locale}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data as ServerNotification[]) || [];
    } catch (error) {
      console.error('서버 공지 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get server notification by ID
   *
   * @param id - Notification ID
   * @returns Server notification data or null
   */
  static async getNotificationById(id: string): Promise<ServerNotification | null> {
    try {
      const { data, error } = await supabase
        .from('server_notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ServerNotification;
    } catch (error) {
      console.error('서버 공지 조회 실패:', error);
      return null;
    }
  }

  /**
   * Create a new server notification (admin only)
   *
   * @param notification - Notification data
   * @returns Created server notification
   */
  static async createNotification(
    notification: Omit<ServerNotification, 'id' | 'created_at'>
  ): Promise<ServerNotification> {
    try {
      const { data, error } = await supabase
        .from('server_notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return data as ServerNotification;
    } catch (error) {
      console.error('서버 공지 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Update a server notification (admin only)
   *
   * @param id - Notification ID
   * @param updates - Notification updates
   * @returns Updated server notification
   */
  static async updateNotification(
    id: string,
    updates: Partial<Omit<ServerNotification, 'id' | 'created_at'>>
  ): Promise<ServerNotification> {
    try {
      const { data, error } = await supabase
        .from('server_notifications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ServerNotification;
    } catch (error) {
      console.error('서버 공지 수정 실패:', error);
      throw error;
    }
  }

  /**
   * Delete a server notification (admin only)
   *
   * @param id - Notification ID
   */
  static async deleteNotification(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('server_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('서버 공지 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * Helper: Set cookie to dismiss notification
   *
   * @param notificationId - Notification ID
   * @param expiryDays - Cookie expiry in days (default 365)
   */
  static dismissNotification(notificationId: string): void {
    const key = `notif_dismissed_${notificationId}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, '1');
    }
  }

  /**
   * Helper: Check if notification is dismissed
   *
   * @param notificationId - Notification ID
   * @returns True if notification is dismissed
   */
  static isNotificationDismissed(notificationId: string): boolean {
    const key = `notif_dismissed_${notificationId}`;
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(key) === '1';
  }

  /**
   * Get announcements for user (announcement, version_update, maintenance types)
   * For the service announcements page
   *
   * @returns Array of server notifications that are announcements
   */
  static async getAnnouncementsForUser(): Promise<ServerNotification[]> {
    try {
      const { data, error } = await supabase
        .from('server_notifications')
        .select('id, title, body, type, audiences, priority, locale, app_min_version, app_max_version, created_at, starts_at, ends_at')
        .in('type', ['announcement', 'version_update', 'maintenance'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map DB fields to interface
      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.body,
        type: row.type,
        audiences: row.audiences,
        priority: row.priority,
        locale: row.locale,
        app_min_version: row.app_min_version,
        app_max_version: row.app_max_version,
        created_at: row.created_at,
        start_date: row.starts_at,
        end_date: row.ends_at,
      }));
    } catch (error) {
      console.error('공지 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * Get announcement by ID for detail view
   *
   * @param id - Notification ID
   * @returns Server notification data or null
   */
  static async getAnnouncementById(id: string): Promise<ServerNotification | null> {
    try {
      const { data, error } = await supabase
        .from('server_notifications')
        .select('id, title, body, type, audiences, priority, locale, app_min_version, app_max_version, created_at, starts_at, ends_at')
        .eq('id', id)
        .in('type', ['announcement', 'version_update', 'maintenance'])
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        content: data.body,
        type: data.type,
        audiences: data.audiences,
        priority: data.priority,
        locale: data.locale,
        app_min_version: data.app_min_version,
        app_max_version: data.app_max_version,
        created_at: data.created_at,
        start_date: data.starts_at,
        end_date: data.ends_at,
      };
    } catch (error) {
      console.error('공지 상세 조회 실패:', error);
      return null;
    }
  }
}

// Export singleton instance
export const serverNotificationService = ServerNotificationService;
