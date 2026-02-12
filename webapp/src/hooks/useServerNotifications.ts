import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ServerNotificationType = 'announcement' | 'version_update' | 'maintenance' | 'advertisement';

export interface ServerNotificationRow {
  id: string;
  title: string;
  body: string;
  type: ServerNotificationType;
  audiences: string[];
  locale: string | null;
  app_min_version: string | null;
  app_max_version: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  require_ack: boolean;
  link_url: string | null;
  image_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

function parseVersion(v: string | null | undefined): number[] | null {
  if (!v) return null;
  const parts = v.split('.').map((x) => parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

export function compareSemver(a: string, b: string): number {
  const pa = parseVersion(a) || [0, 0, 0];
  const pb = parseVersion(b) || [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

const DISMISS_PREFIX = 'notif_dismissed_';
const HIDE_TODAY_PREFIX = 'notif_hide_today_';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDismissed(id: string) {
  if (typeof localStorage === 'undefined') return false;
  // Check permanent dismiss
  if (localStorage.getItem(`${DISMISS_PREFIX}${id}`) === '1') return true;
  // Check today dismiss
  const todayVal = localStorage.getItem(`${HIDE_TODAY_PREFIX}${id}`);
  if (todayVal === getTodayString()) return true;
  return false;
}

function rememberDismiss(id: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${DISMISS_PREFIX}${id}`, '1');
}

function rememberHideToday(id: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${HIDE_TODAY_PREFIX}${id}`, getTodayString());
}

export function useServerNotifications(options?: {
  audiences?: string[]; // e.g., ['creator'] | ['brand'] | ['all']
  locale?: string | null;
  currentAppVersion?: string; // e.g., '1.2.3'
  enabled?: boolean; // 프로필 로딩 완료 전 조회 방지용
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ServerNotificationRow[]>([]);

  const audiences = options?.audiences && options.audiences.length > 0 ? options.audiences : ['all'];
  const currentVersion = options?.currentAppVersion || (import.meta.env.VITE_APP_VERSION || '0.0.0');
  const locale = options?.locale || null;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    // enabled가 false면 조회하지 않음 (프로필 로딩 완료 대기)
    if (!enabled) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase.from('active_notifications').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false });
        // audiences overlap
        if (audiences && audiences.length && !(audiences.length === 1 && audiences[0] === 'all')) {
          query = query.overlaps('audiences', audiences);
        }
        if (locale) {
          // null locale means all languages; if row has locale set, filter equal
          query = query.or(`locale.is.null,locale.eq.${locale}`);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (mounted) {
          // 백오피스에서 비활성화된 항목이 이미 로드된 상태에 남아있을 수 있으므로
          // is_active가 false인 항목은 제거
          const filtered = (data as ServerNotificationRow[] || []).filter(item => item.is_active !== false);
          setItems(filtered);
        }
      } catch (e) {
        console.error('서버 공지 조회 실패:', e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    
    // 주기적으로 재조회하여 백오피스에서 비활성화된 항목이 즉시 반영되도록 함
    // (30초마다 재조회 - 너무 자주 하면 부하가 있을 수 있으므로 적절한 간격)
    const intervalId = setInterval(() => {
      if (mounted && enabled) {
        load();
      }
    }, 30000); // 30초
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audiences.join(','), locale, enabled]);

  const activeNotices = useMemo(() => {
    return items.filter((n) => {
      // is_active가 false인 항목은 제외 (백오피스에서 비활성화된 경우)
      if (n.is_active === false) return false;
      
      // localStorage로 다시 보지 않기 확인 (공지별 개별 저장)
      if (isDismissed(n.id)) return false;

      // 광고는 별도 모달로 처리하므로 공지에서는 제외
      if (n.type === 'advertisement') return false;

      // 버전 필터
      if (n.type === 'version_update') {
        if (n.app_min_version && compareSemver(currentVersion, n.app_min_version) >= 0) {
          // 이미 최소버전 이상이면 스킵
          return false;
        }
        if (n.app_max_version && compareSemver(currentVersion, n.app_max_version) > 0) {
          // 최대버전 초과면 스킵
          return false;
        }
      } else {
        // 일반 공지의 경우에도 app_min_version/app_max_version가 설정되어 있으면 준수
        if (n.app_min_version && compareSemver(currentVersion, n.app_min_version) < 0) return false;
        if (n.app_max_version && compareSemver(currentVersion, n.app_max_version) > 0) return false;
      }
      return true;
    });
  }, [items, currentVersion]);

  const nextNotice = useMemo(() => {
    return activeNotices[0] ?? null;
  }, [activeNotices]);

  const activeAds = useMemo(() => {
    // is_active가 false인 항목은 제외 (백오피스에서 비활성화된 경우)
    return items.filter(n => n.type === 'advertisement' && n.is_active !== false);
  }, [items]);

  function dismiss(id: string) {
    rememberDismiss(id);
    // 즉시 메모리에서도 제거
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function hideSinceToday(id: string) {
    rememberHideToday(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  // 이번 세션에서만 숨김(쿠키 저장 없음)
  function hideOnce(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return { loading, items, nextNotice, activeNotices, activeAds, dismiss, hideSinceToday, hideOnce };
}
