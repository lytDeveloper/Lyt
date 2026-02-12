/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../lib/supabase';
import type { ProjectCategory } from '../types/exploreTypes';

export interface Brand {
    id: string;
    name: string;
    description: string;
    activityField: string;
    coverImageUrl: string;
    logoImageUrl: string;
    targetAudiences: string[];
    collaborationTypes: string[];
    websiteUrl: string;
    snsChannel: string;
    contactInfo: string;
    region: string;
}

export const getAllBrands = async (options?: {
    activity_field?: ProjectCategory | '전체';
    limit?: number;
    from?: number;
    searchQuery?: string;
}): Promise<Brand[]> => {
    try {
        let query = supabase
            .from('profile_brands')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // 카테고리 필터 적용 (전체가 아닌 경우만)
        if (options?.activity_field && options.activity_field !== '전체') {
            query = query.or(
                `activity_field.eq.${options.activity_field},category.eq.${options.activity_field}`
            );
        }

        // 검색어 필터 적용 (브랜드 이름 기준)
        if (options?.searchQuery && options.searchQuery.trim()) {
            query = query.ilike('brand_name', `%${options.searchQuery.trim()}%`);
        }

        // 페이지네이션 적용 (from과 limit)
        if (options?.from !== undefined && options?.limit) {
            query = query.range(options.from, options.from + options.limit - 1);
        } else if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching brands:', error);
            throw error;
        }

        return (data || []).map((brand: any) => ({
            id: brand.profile_id,
            name: brand.brand_name,
            description: brand.description,
            activityField: brand.activity_field,
            coverImageUrl: brand.cover_image_url,
            logoImageUrl: brand.logo_image_url,
            targetAudiences: brand.target_audiences || [],
            collaborationTypes: brand.collaboration_types || [],
            websiteUrl: brand.website_url,
            snsChannel: brand.sns_channel,
            contactInfo: brand.contact_info,
            region: brand.region,
        }));
    } catch (error) {
        console.error('getAllBrands failed:', error);
        throw error;
    }
};

/**
 * Get project count for a brand by counting projects where created_by matches brand's profile_id
 */
export const getBrandProjectCount = async (brandProfileId: string): Promise<number> => {
    try {
        const { count, error } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', brandProfileId);

        if (error) {
            console.error('Error fetching project count:', error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('getBrandProjectCount failed:', error);
        return 0;
    }
};

/**
 * Get project counts for multiple brands (batch)
 */
export const getBrandProjectCounts = async (brandProfileIds: string[]): Promise<Record<string, number>> => {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('created_by')
            .in('created_by', brandProfileIds);

        if (error) {
            console.error('Error fetching project counts:', error);
            return {};
        }

        // Count projects per brand
        const counts: Record<string, number> = {};
        brandProfileIds.forEach(id => counts[id] = 0);

        (data || []).forEach((row: { created_by: string }) => {
            if (row.created_by && counts[row.created_by] !== undefined) {
                counts[row.created_by] = (counts[row.created_by] || 0) + 1;
            }
        });

        return counts;
    } catch (error) {
        console.error('getBrandProjectCounts failed:', error);
        return {};
    }
};

/**
 * Get average rating for a brand (from reviews where reviewee_id = brandProfileId)
 * Same logic as getPartnerStats - simple reviewee_id query
 */
export const getBrandRating = async (brandProfileId: string): Promise<number | null> => {
    try {
        // Query reviews where the brand is the reviewee (same as getPartnerStats)
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', brandProfileId)
            .eq('is_visible', true);

        if (reviewsError) {
            console.error('Error fetching reviews:', reviewsError);
            return null;
        }

        if (!reviews || reviews.length === 0) {
            return null; // No reviews = no rating
        }

        // Calculate average rating
        const validRatings = reviews.filter(r => typeof r.rating === 'number');
        if (validRatings.length === 0) {
            return null;
        }

        const totalRating = validRatings.reduce((sum, review) => sum + (review.rating || 0), 0);
        const averageRating = totalRating / validRatings.length;

        // Round to 1 decimal place
        return Math.round(averageRating * 10) / 10;
    } catch (error) {
        console.error('getBrandRating failed:', error);
        return null;
    }
};

/**
 * Get average ratings for multiple brands (batch)
 */
export const getBrandRatings = async (brandProfileIds: string[]): Promise<Record<string, number | null>> => {
    try {
        // 1. Get all projects created by these brands
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id, created_by')
            .in('created_by', brandProfileIds);

        if (projectsError) {
            console.error('Error fetching brand projects:', projectsError);
            return {};
        }

        if (!projects || projects.length === 0) {
            const result: Record<string, number | null> = {};
            brandProfileIds.forEach(id => result[id] = null);
            return result;
        }

        const projectIds = projects.map(p => p.id);
        const projectToBrandMap: Record<string, string> = {};
        projects.forEach(p => {
            projectToBrandMap[p.id] = p.created_by;
        });

        // 2. Get all reviews for these projects
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('project_id, rating, reviewee_id')
            .in('project_id', projectIds)
            .in('reviewee_id', brandProfileIds)
            .not('rating', 'is', null);

        if (reviewsError) {
            console.error('Error fetching reviews:', reviewsError);
            const result: Record<string, number | null> = {};
            brandProfileIds.forEach(id => result[id] = null);
            return result;
        }

        // 3. Group reviews by brand and calculate averages
        const brandRatings: Record<string, number[]> = {};
        brandProfileIds.forEach(id => brandRatings[id] = []);

        (reviews || []).forEach((review) => {
            const brandId = review.reviewee_id;
            if (brandId && brandRatings[brandId] !== undefined) {
                brandRatings[brandId].push(review.rating || 0);
            }
        });

        // 4. Calculate averages
        const result: Record<string, number | null> = {};
        brandProfileIds.forEach(id => {
            const ratings = brandRatings[id];
            if (ratings && ratings.length > 0) {
                const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
                result[id] = Math.round(avg * 10) / 10;
            } else {
                result[id] = null;
            }
        });

        return result;
    } catch (error) {
        console.error('getBrandRatings failed:', error);
        const result: Record<string, number | null> = {};
        brandProfileIds.forEach(id => result[id] = null);
        return result;
    }
};

/**
 * Get average response time for a brand (partnership inquiries + project applications)
 * 파트너십 문의 + 프로젝트 지원 응답 시간 평균 계산 (시간 단위)
 */
export const getBrandResponseTime = async (brandProfileId: string): Promise<number | null> => {
    try {
        const responseTimes: number[] = [];

        // 1. Partnership inquiries response times
        const { data: inquiries, error: inquiriesError } = await supabase
            .from('partnership_inquiries')
            .select('received_date, response_date')
            .eq('receiver_id', brandProfileId)
            .not('response_date', 'is', null);

        if (!inquiriesError && inquiries) {
            inquiries.forEach((inquiry: any) => {
                if (inquiry.received_date && inquiry.response_date) {
                    const received = new Date(inquiry.received_date).getTime();
                    const responded = new Date(inquiry.response_date).getTime();
                    const hours = (responded - received) / (1000 * 60 * 60);
                    if (hours > 0) {
                        responseTimes.push(hours);
                    }
                }
            });
        }

        // 2. Project applications response times
        // Get projects created by this brand
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id')
            .eq('created_by', brandProfileId);

        if (!projectsError && projects && projects.length > 0) {
            const projectIds = projects.map(p => p.id);

            const { data: applications, error: applicationsError } = await supabase
                .from('project_applications')
                .select('applied_date, response_date')
                .in('project_id', projectIds)
                .not('response_date', 'is', null);

            if (!applicationsError && applications) {
                applications.forEach((app: any) => {
                    if (app.applied_date && app.response_date) {
                        const applied = new Date(app.applied_date).getTime();
                        const responded = new Date(app.response_date).getTime();
                        const hours = (responded - applied) / (1000 * 60 * 60);
                        if (hours > 0) {
                            responseTimes.push(hours);
                        }
                    }
                });
            }
        }

        if (responseTimes.length === 0) {
            return null; // No responses = no average
        }

        // Calculate average response time in hours
        const avgHours = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

        // Round to 1 decimal place
        return Math.round(avgHours * 10) / 10;
    } catch (error) {
        console.error('getBrandResponseTime failed:', error);
        return null;
    }
};

/**
 * Get average response times for multiple brands (batch)
 */
export const getBrandResponseTimes = async (brandProfileIds: string[]): Promise<Record<string, number | null>> => {
    try {
        const result: Record<string, number | null> = {};
        brandProfileIds.forEach(id => result[id] = null);

        // 1. Partnership inquiries response times
        const { data: inquiries, error: inquiriesError } = await supabase
            .from('partnership_inquiries')
            .select('receiver_id, received_date, response_date')
            .in('receiver_id', brandProfileIds)
            .not('response_date', 'is', null);

        const brandResponseTimes: Record<string, number[]> = {};
        brandProfileIds.forEach(id => brandResponseTimes[id] = []);

        if (!inquiriesError && inquiries) {
            inquiries.forEach((inquiry: any) => {
                const brandId = inquiry.receiver_id;
                if (brandId && inquiry.received_date && inquiry.response_date) {
                    const received = new Date(inquiry.received_date).getTime();
                    const responded = new Date(inquiry.response_date).getTime();
                    const hours = (responded - received) / (1000 * 60 * 60);
                    if (hours > 0 && brandResponseTimes[brandId]) {
                        brandResponseTimes[brandId].push(hours);
                    }
                }
            });
        }

        // 2. Project applications response times
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id, created_by')
            .in('created_by', brandProfileIds);

        if (!projectsError && projects && projects.length > 0) {
            const projectIds = projects.map(p => p.id);
            const projectToBrandMap: Record<string, string> = {};
            projects.forEach(p => {
                projectToBrandMap[p.id] = p.created_by;
            });

            const { data: applications, error: applicationsError } = await supabase
                .from('project_applications')
                .select('project_id, applied_date, response_date')
                .in('project_id', projectIds)
                .not('response_date', 'is', null);

            if (!applicationsError && applications) {
                applications.forEach((app: any) => {
                    const brandId = projectToBrandMap[app.project_id];
                    if (brandId && app.applied_date && app.response_date) {
                        const applied = new Date(app.applied_date).getTime();
                        const responded = new Date(app.response_date).getTime();
                        const hours = (responded - applied) / (1000 * 60 * 60);
                        if (hours > 0 && brandResponseTimes[brandId]) {
                            brandResponseTimes[brandId].push(hours);
                        }
                    }
                });
            }
        }

        // Calculate averages
        brandProfileIds.forEach(id => {
            const times = brandResponseTimes[id];
            if (times && times.length > 0) {
                const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
                result[id] = Math.round(avg * 10) / 10;
            }
        });

        return result;
    } catch (error) {
        console.error('getBrandResponseTimes failed:', error);
        const result: Record<string, number | null> = {};
        brandProfileIds.forEach(id => result[id] = null);
        return result;
    }
};

/**
 * Get a single brand by profile_id
 */
export const getBrandById = async (brandProfileId: string): Promise<Brand | null> => {
    try {
        const { data, error } = await supabase
            .from('profile_brands')
            .select('*')
            .eq('profile_id', brandProfileId)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Error fetching brand:', error);
            return null;
        }

        if (!data) {
            return null;
        }

        return {
            id: data.profile_id,
            name: data.brand_name,
            description: data.description || '',
            activityField: data.activity_field,
            coverImageUrl: data.cover_image_url || '',
            logoImageUrl: data.logo_image_url || '',
            targetAudiences: data.target_audiences || [],
            collaborationTypes: data.collaboration_types || [],
            websiteUrl: data.website_url || '',
            snsChannel: data.sns_channel || '',
            contactInfo: data.contact_info || '',
            region: data.region || '',
        };
    } catch (error) {
        console.error('getBrandById failed:', error);
        return null;
    }
};

export interface BrandStats {
    rating: number | null;
    reviewCount: number;
    responseRate: number | null;
    responseTime: string | null;
    completedProjects: number;
}

/**
 * Get aggregate stats for a single brand
 * Similar to getPartnerStats but for brands
 * @param brandProfileId - Brand's profile_id
 */
export const getBrandStats = async (brandProfileId: string): Promise<BrandStats> => {
    try {
        // Fetch all stats in parallel
        const [rating, projectCount, responseTimeHours] = await Promise.all([
            getBrandRating(brandProfileId),
            getBrandProjectCount(brandProfileId),
            getBrandResponseTime(brandProfileId),
        ]);

        // Get review count for this brand (reviews where reviewee_id = brandProfileId)
        const { count: reviewCount } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('reviewee_id', brandProfileId)
            .eq('is_visible', true);

        // Format response time
        const formatResponseTime = (hours: number | null): string | null => {
            if (hours === null || hours === undefined || Number.isNaN(hours)) return null;
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

        return {
            rating,
            reviewCount: reviewCount || 0,
            responseRate: null, // Brands don't have response rate like partners
            responseTime: formatResponseTime(responseTimeHours),
            completedProjects: projectCount,
        };
    } catch (error) {
        console.error('getBrandStats failed:', error);
        return {
            rating: null,
            reviewCount: 0,
            responseRate: null,
            responseTime: null,
            completedProjects: 0,
        };
    }
};

export const brandService = {
    getAllBrands,
    getBrandById,
    getBrandProjectCount,
    getBrandProjectCounts,
    getBrandRating,
    getBrandRatings,
    getBrandResponseTime,
    getBrandResponseTimes,
    getBrandStats,
};
