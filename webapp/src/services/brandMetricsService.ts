import { supabase } from '../lib/supabase';

export interface BrandMetrics {
  responseRate: number;
  responseTime: string;
  matchingRate: number;
}

const formatResponseTime = (hours?: number | null): string => {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '24시간 이내';
  if (hours < 1) {
    const minutes = Math.max(Math.round(hours * 60), 1);
    return `${minutes}분 이내`;
  }
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `${days}일 이내`;
  }
  return `${Math.round(hours * 10) / 10}시간 이내`;
};

export const getBrandMetrics = async (brandId: string): Promise<BrandMetrics | null> => {
  if (!brandId) return null;

  const { data, error } = await supabase
    .from('live_brand_metrics')
    .select('response_rate, response_time_hours, matching_rate')
    .eq('brand_id', brandId)
    .maybeSingle();

  if (error) {
    console.error('[brandMetricsService] Error fetching brand metrics:', error);
    return null;
  }

  if (!data) return null;

  return {
    responseRate: typeof data.response_rate === 'number' ? Math.max(0, Math.min(100, data.response_rate)) : 0,
    responseTime: formatResponseTime(data.response_time_hours),
    matchingRate: typeof data.matching_rate === 'number' ? Math.max(0, Math.min(100, data.matching_rate)) : 0,
  };
};

