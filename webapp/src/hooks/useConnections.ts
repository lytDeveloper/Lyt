import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { type Partner } from '../services/partnerService';
import { getProfileDisplayMapOptimized } from '../services/profileDisplayService';
import { supabase } from '../lib/supabase';
import { mapPartner } from '../utils/mappers';

export type ConnectionType = 'followers' | 'following' | 'mutual';

export function useConnections(userId: string, type: ConnectionType) {
    const [data, setData] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConnections = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            let ids: string[] = [];
            if (type === 'followers') {
                ids = await socialService.getFollowers(userId);
            } else if (type === 'following') {
                ids = await socialService.getFollowedUsers(userId);
            } else if (type === 'mutual') {
                ids = await socialService.getMutualFollows(userId);
            }

            if (ids.length === 0) {
                setData([]);
                return;
            }

            // 1. Fetch Partner details (Artist, Creative) from partners view
            // Note: partners view does NOT include brands!
            const { data: partnersData, error: partnersError } = await supabase
                .from('partners')
                .select('*')
                .in('id', ids);

            if (partnersError) {
                console.error('Error fetching partner details:', partnersError);
            }

            const partnersMap = new Map<string, any>();
            (partnersData || []).forEach((p: any) => partnersMap.set(p.id, p));

            // 2. Fetch Brand details from profile_brands (NOT in partners view)
            const foundPartnerIds = new Set(partnersMap.keys());
            const potentialBrandIds = ids.filter(id => !foundPartnerIds.has(id));

            let brandsMap = new Map<string, any>();
            if (potentialBrandIds.length > 0) {
                const { data: brandsData, error: brandsError } = await supabase
                    .from('profile_brands')
                    .select('profile_id, brand_name, activity_field, logo_image_url, cover_image_url, tags')
                    .in('profile_id', potentialBrandIds)
                    .eq('is_active', true);

                if (!brandsError && brandsData) {
                    brandsData.forEach((b: any) => brandsMap.set(b.profile_id, b));
                }
            }

            // 3. Get IDs not found in partners view or brands (for fan fallback)
            const foundBrandIds = new Set(brandsMap.keys());
            const missingIds = ids.filter(id => !foundPartnerIds.has(id) && !foundBrandIds.has(id));

            let fansMap = new Map<string, any>();
            if (missingIds.length > 0) {
                const { data: fansData, error: fansError } = await supabase
                    .from('profile_fans')
                    .select('profile_id, interests, specific_interests, profile_image_url')
                    .in('profile_id', missingIds)
                    .eq('is_active', true);

                if (!fansError && fansData) {
                    fansData.forEach((f: any) => fansMap.set(f.profile_id, f));
                }
            }

            // 4. For basic info (nickname) for all IDs
            const displayMap = await getProfileDisplayMapOptimized(ids);

            // 5. Construct Partner objects
            const result: Partner[] = ids.map(id => {
                // Option A: It's a Partner (Artist/Creative) from partners view
                if (partnersMap.has(id)) {
                    const p = partnersMap.get(id);
                    return mapPartner(p);
                }

                // Option B: It's a Brand from profile_brands
                if (brandsMap.has(id)) {
                    const b = brandsMap.get(id);
                    return {
                        id: b.profile_id,
                        name: b.brand_name || '브랜드',
                        activityField: b.activity_field || '',
                        role: 'brand',
                        specializedRoles: [],
                        tags: b.tags || [],
                        bio: '',
                        profileImageUrl: b.logo_image_url || '',
                        coverImageUrl: b.cover_image_url || '',
                        portfolioImages: [],
                        rating: 0,
                        reviewCount: 0,
                        completedProjects: 0,
                        region: '',
                        matchingRate: 0,
                        responseRate: 0,
                        responseTime: '24시간 이내',
                        isOnline: false,
                        isVerified: false,
                        career: '',
                        careerHistory: [],
                        category: b.activity_field || '',
                        display: {
                            displayName: b.brand_name || '브랜드',
                            displayAvatar: b.logo_image_url || '',
                            displayField: b.activity_field || '',
                            displayCategory: 'brand',
                            displaySource: 'brand'
                        }
                    } as Partner;
                }

                // Option C: It's a Fan / User (Not in partners view or brands)
                const display = displayMap.get(id);
                const fan = fansMap.get(id);

                const name = display?.name || '사용자';
                const avatar = display?.avatar || fan?.profile_image_url || '';

                // Custom Fan fields
                // "fan(fan)의 경우는 interests를 이름과 역할배지 아래 activityField 위치에 표시하고"
                // "specific_interests를 카드 최하단 태그로 표시"

                const interests = fan?.interests || [];
                const specificInterests = fan?.specific_interests || [];

                // For fan, map interests to activityField
                const activityField = interests.length > 0 ? interests.join(', ') : '팬';

                // Map specific_interests to tags
                const tags = specificInterests;

                return {
                    id: id,
                    name: name,
                    activityField: activityField, // Shows in activity area
                    role: 'fan',
                    specializedRoles: [],
                    tags: tags, // Shows in bottom area
                    bio: '',
                    profileImageUrl: avatar,
                    coverImageUrl: '',
                    portfolioImages: [],
                    rating: 0,
                    reviewCount: 0,
                    completedProjects: 0,
                    region: '',
                    matchingRate: 0,
                    responseRate: 0,
                    responseTime: '24시간 이내',
                    isOnline: false,
                    isVerified: false,
                    career: '',
                    careerHistory: [],
                    category: 'fan',
                    display: {
                        displayName: name,
                        displayAvatar: avatar,
                        displayField: activityField,
                        displayCategory: 'fan',
                        displaySource: 'profile'
                    }
                } as Partner;

            });

            setData(result);
        } catch (err) {
            console.error(err);
            setError('Failed to load connections');
        } finally {
            setLoading(false);
        }
    }, [userId, type]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    return { data, loading, error, refetch: fetchConnections };
}
