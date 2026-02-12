import { supabase } from '../lib/supabase';
import { getProfileDisplayMap } from './profileDisplayService';
import { activityService } from './activityService';

export interface Review {
    id: string;
    project_id: string | null;
    collaboration_id: string | null;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    review_tag: string | null;
    content: string;
    is_verified: boolean;
    is_visible: boolean;
    created_at: string;
    updated_at: string;
    reviewer?: { name: string; image: string | null; role: string; };
    reviewee?: { name: string; image: string | null; role: string; };
    projectName?: string;
}

export interface ReviewData {
    itemId: string; // Project/Collaboration ID
    itemType: 'project' | 'collaboration';
    reviewerId: string;
    revieweeId?: string | null; // Null if it's a project/collaboration review
    rating: number; // 0.5 steps allowed
    reviewTag?: string; // Single selected template phrase
    content: string;
}

export interface ExistingReview {
    id: string;
    revieweeId: string | null;
    rating: number;
    reviewTag: string | null;
    content: string;
}

export const reviewService = {
    /**
     * Get existing reviews for a project/collaboration by the current user
     */
    async getExistingReviews(itemId: string, itemType: 'project' | 'collaboration'): Promise<ExistingReview[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const column = itemType === 'project' ? 'project_id' : 'collaboration_id';

            const { data, error } = await supabase
                .from('reviews')
                .select('id, reviewee_id, rating, review_tag, content')
                .eq(column, itemId)
                .eq('reviewer_id', user.id);

            if (error) {
                console.error('Error fetching existing reviews:', error);
                return [];
            }

            return (data || []).map(row => ({
                id: row.id,
                revieweeId: row.reviewee_id,
                rating: row.rating,
                reviewTag: row.review_tag,
                content: row.content,
            }));
        } catch (error) {
            console.error('getExistingReviews failed:', error);
            return [];
        }
    },

    /**
     * Submit or update multiple reviews in a batch (Project review + Member reviews)
     * Uses upsert to handle both create and update
     * 
     * Note: PostgreSQL unique constraints don't work well with NULL values.
     * For reviewee_id = NULL (project/collab entity reviews), we need special handling.
     */
    async submitReviews(reviews: ReviewData[]) {
        try {
            if (reviews.length === 0) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('로그인이 필요합니다.');

            // 프로젝트 리뷰와 협업 리뷰를 분리
            const projectReviews = reviews.filter(r => r.itemType === 'project');
            const collaborationReviews = reviews.filter(r => r.itemType === 'collaboration');

            // 프로젝트 리뷰 처리
            if (projectReviews.length > 0) {
                for (const review of projectReviews) {
                    // 기존 리뷰 확인 (reviewee_id 포함)
                    let query = supabase
                        .from('reviews')
                        .select('id')
                        .eq('project_id', review.itemId)
                        .eq('reviewer_id', user.id);

                    // reviewee_id가 있으면 eq, 없으면 is null
                    if (review.revieweeId) {
                        query = query.eq('reviewee_id', review.revieweeId);
                    } else {
                        query = query.is('reviewee_id', null);
                    }

                    const { data: existing } = await query.maybeSingle();

                    // content는 빈 문자열도 허용 (제약 조건: length(content) <= 2000)
                    const content = review.content || '';

                    const reviewData = {
                        project_id: review.itemId,
                        collaboration_id: null,
                        reviewer_id: user.id,
                        reviewee_id: review.revieweeId || null,
                        rating: review.rating,
                        content: content,
                        review_tag: review.reviewTag || null,
                        is_visible: true,
                        is_verified: true,
                    };

                    if (existing) {
                        // 업데이트
                        const { error } = await supabase
                            .from('reviews')
                            .update(reviewData)
                            .eq('id', existing.id);
                        if (error) throw error;
                    } else {
                        // 삽입
                        const { error } = await supabase
                            .from('reviews')
                            .insert(reviewData);
                        if (error) throw error;

                        // 새 리뷰 삽입 시 review_received 활동 기록 (멤버 리뷰인 경우만)
                        if (review.revieweeId) {
                            // 프로젝트 제목 조회
                            const { data: projectData } = await supabase
                                .from('projects')
                                .select('title')
                                .eq('id', review.itemId)
                                .single();
                            const projectTitle = projectData?.title || '프로젝트';

                            activityService
                                .createActivityViaRPC({
                                    userId: review.revieweeId,
                                    activityType: 'review_received',
                                    relatedEntityType: 'review',
                                    relatedEntityId: review.itemId,
                                    title: `${projectTitle}에서 새로운 리뷰를 받았어요`,
                                    description: review.reviewTag || '',
                                    metadata: {
                                        reviewer_id: user.id,
                                        rating: review.rating,
                                        review_tag: review.reviewTag,
                                        project_title: projectTitle,
                                    },
                                })
                                .catch((err) =>
                                    console.warn('[reviewService] Failed to record review_received activity:', err)
                                );
                        }
                    }
                }
            }

            // 협업 리뷰 처리
            if (collaborationReviews.length > 0) {
                for (const review of collaborationReviews) {
                    // 기존 리뷰 확인 (reviewee_id 포함)
                    let query = supabase
                        .from('reviews')
                        .select('id')
                        .eq('collaboration_id', review.itemId)
                        .eq('reviewer_id', user.id);

                    // reviewee_id가 있으면 eq, 없으면 is null
                    if (review.revieweeId) {
                        query = query.eq('reviewee_id', review.revieweeId);
                    } else {
                        query = query.is('reviewee_id', null);
                    }

                    const { data: existing } = await query.maybeSingle();

                    // content는 빈 문자열도 허용 (제약 조건: length(content) <= 2000)
                    const content = review.content || '';

                    const reviewData = {
                        project_id: null,
                        collaboration_id: review.itemId,
                        reviewer_id: user.id,
                        reviewee_id: review.revieweeId || null,
                        rating: review.rating,
                        content: content,
                        review_tag: review.reviewTag || null,
                        is_visible: true,
                        is_verified: true,
                    };

                    if (existing) {
                        // 업데이트
                        const { error } = await supabase
                            .from('reviews')
                            .update(reviewData)
                            .eq('id', existing.id);
                        if (error) throw error;
                    } else {
                        // 삽입
                        const { error } = await supabase
                            .from('reviews')
                            .insert(reviewData);
                        if (error) throw error;

                        // 새 리뷰 삽입 시 review_received 활동 기록 (멤버 리뷰인 경우만)
                        if (review.revieweeId) {
                            // 협업 제목 조회
                            const { data: collabData } = await supabase
                                .from('collaborations')
                                .select('title')
                                .eq('id', review.itemId)
                                .single();
                            const collabTitle = collabData?.title || '협업';

                            activityService
                                .createActivityViaRPC({
                                    userId: review.revieweeId,
                                    activityType: 'review_received',
                                    relatedEntityType: 'review',
                                    relatedEntityId: review.itemId,
                                    title: `${collabTitle}에서 새로운 리뷰를 받았어요`,
                                    description: review.reviewTag || '',
                                    metadata: {
                                        reviewer_id: user.id,
                                        rating: review.rating,
                                        review_tag: review.reviewTag,
                                        collaboration_title: collabTitle,
                                    },
                                })
                                .catch((err) =>
                                    console.warn('[reviewService] Failed to record review_received activity:', err)
                                );
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('submitReviews failed:', error);
            throw error;
        }
    },

    /**
     * Check if user has already reviewed this target
     */
    async checkReviewStatus(itemId: string, itemType: 'project' | 'collaboration', reviewerId: string) {
        try {
            const column = itemType === 'project' ? 'project_id' : 'collaboration_id';

            const { data, error } = await supabase
                .from('reviews')
                .select('id')
                .eq(column, itemId)
                .eq('reviewer_id', reviewerId)
                .limit(1);

            if (error) throw error;

            return data && data.length > 0;
        } catch (error) {
            console.error('checkReviewStatus failed:', error);
            return false;
        }
    },

    /**
     * Batch check review status for multiple items (reduces API calls)
     * Returns a map of itemId -> hasReview
     */
    async checkReviewStatusBatch(
        items: Array<{ id: string; type: 'project' | 'collaboration' }>,
        reviewerId: string
    ): Promise<Record<string, boolean>> {
        try {
            if (items.length === 0) return {};

            const projectIds = items.filter(i => i.type === 'project').map(i => i.id);
            const collaborationIds = items.filter(i => i.type === 'collaboration').map(i => i.id);

            const result: Record<string, boolean> = {};

            // 프로젝트 리뷰 상태 배치 확인
            if (projectIds.length > 0) {
                const { data: projectReviews, error: projectError } = await supabase
                    .from('reviews')
                    .select('project_id')
                    .in('project_id', projectIds)
                    .eq('reviewer_id', reviewerId);

                if (!projectError && projectReviews) {
                    projectReviews.forEach(r => {
                        if (r.project_id) {
                            result[r.project_id] = true;
                        }
                    });
                }
            }

            // 협업 리뷰 상태 배치 확인
            if (collaborationIds.length > 0) {
                const { data: collabReviews, error: collabError } = await supabase
                    .from('reviews')
                    .select('collaboration_id')
                    .in('collaboration_id', collaborationIds)
                    .eq('reviewer_id', reviewerId);

                if (!collabError && collabReviews) {
                    collabReviews.forEach(r => {
                        if (r.collaboration_id) {
                            result[r.collaboration_id] = true;
                        }
                    });
                }
            }

            return result;
        } catch (error) {
            console.error('checkReviewStatusBatch failed:', error);
            return {};
        }
    },

    /**
     * Get reviews received by a user (reviewee_id = profileId)
     * 최적화: N+1 문제 해결 - profileDisplayService.getProfileDisplayMap 배치 패턴 사용
     */
    async getReceivedReviews(profileId: string): Promise<Review[]> {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    projects:project_id (title)
                `)
                .eq('reviewee_id', profileId)
                .eq('is_visible', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data || data.length === 0) return [];

            // 배치로 모든 reviewer의 display info 조회
            const reviewerIds = data.map((r: any) => r.reviewer_id);
            const displayMap = await getProfileDisplayMap(reviewerIds);

            // profileType을 한글로 변환하는 헬퍼
            const getLocalizedRole = (profileType?: string): string => {
                switch (profileType) {
                    case 'brand': return '브랜드';
                    case 'artist': return '아티스트';
                    case 'creative': return '크리에이티브';
                    case 'fan': return '팬';
                    default: return 'User';
                }
            };

            const reviewsWithDetails = data.map((review: any) => {
                const displayInfo = displayMap.get(review.reviewer_id);
                // activity_field 우선, 없으면 profileType 한글화
                const role = displayInfo?.activityField || getLocalizedRole(displayInfo?.profileType);

                const reviewerInfo = displayInfo
                    ? {
                        name: displayInfo.name || 'Unknown User',
                        image: displayInfo.avatar || null,
                        role,
                    }
                    : { name: 'Unknown User', image: null, role: 'User' };

                return {
                    ...review,
                    reviewer: reviewerInfo,
                    projectName: review.projects?.title,
                };
            });

            return reviewsWithDetails;
        } catch (error) {
            console.error('Failed to fetch received reviews:', error);
            return [];
        }
    },

    /**
     * Get reviews written by a user (reviewer_id = profileId)
     * 최적화: N+1 문제 해결 - profileDisplayService.getProfileDisplayMap 배치 패턴 사용
     * Note: 프로젝트/협업 자체에 대한 리뷰(reviewee_id가 null)는 제외
     */
    async getWrittenReviews(profileId: string): Promise<Review[]> {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    projects:project_id (title)
                `)
                .eq('reviewer_id', profileId)
                .not('reviewee_id', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data || data.length === 0) return [];

            // 배치로 모든 reviewee의 display info 조회
            const revieweeIds = data.map((r: any) => r.reviewee_id);
            const displayMap = await getProfileDisplayMap(revieweeIds);

            const reviewsWithDetails = data.map((review: any) => {
                const displayInfo = displayMap.get(review.reviewee_id);

                // profileType을 한글로 변환하는 헬퍼
                const getLocalizedRole = (profileType?: string): string => {
                    switch (profileType) {
                        case 'brand': return '브랜드';
                        case 'artist': return '아티스트';
                        case 'creative': return '크리에이티브';
                        case 'fan': return '팬';
                        default: return 'User';
                    }
                };

                // activity_field 우선, 없으면 profileType 한글화
                const role = displayInfo?.activityField || getLocalizedRole(displayInfo?.profileType);

                const revieweeInfo = displayInfo
                    ? {
                        name: displayInfo.name || 'Unknown User',
                        image: displayInfo.avatar || null,
                        role,
                    }
                    : { name: 'Unknown User', image: null, role: 'User' };

                return {
                    ...review,
                    reviewee: revieweeInfo,
                    projectName: review.projects?.title,
                };
            });

            return reviewsWithDetails;
        } catch (error) {
            console.error('Failed to fetch written reviews:', error);
            return [];
        }
    },

    /**
     * Get received review_tag statistics for member reviews
     * 멤버 리뷰에서 받은 review_tag의 개수를 템플릿별로 집계
     * @param profileId - 리뷰 대상 사용자 ID
     * @returns 템플릿 문구 -> 개수 맵
     */
    async getReceivedReviewTagStats(profileId: string): Promise<Map<string, number>> {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('review_tag')
                .eq('reviewee_id', profileId)
                .eq('is_visible', true)
                .not('review_tag', 'is', null);

            if (error) throw error;

            const tagCounts = new Map<string, number>();

            if (data) {
                data.forEach((review: { review_tag: string | null }) => {
                    if (review.review_tag) {
                        const currentCount = tagCounts.get(review.review_tag) || 0;
                        tagCounts.set(review.review_tag, currentCount + 1);
                    }
                });
            }

            return tagCounts;
        } catch (error) {
            console.error('Failed to fetch review tag stats:', error);
            return new Map();
        }
    },

    /**
     * Update a single review by ID
     * @param reviewId - 리뷰 ID
     * @param data - 업데이트할 데이터
     */
    async updateSingleReview(
        reviewId: string,
        data: { rating: number; reviewTag: string | null; content: string }
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('reviews')
                .update({
                    rating: data.rating,
                    review_tag: data.reviewTag,
                    content: data.content,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', reviewId);

            if (error) throw error;
        } catch (error) {
            console.error('Failed to update review:', error);
            throw error;
        }
    },

    /**
     * Delete multiple reviews by IDs
     * @param reviewIds - 삭제할 리뷰 ID 배열
     */
    async deleteReviews(reviewIds: string[]): Promise<void> {
        try {
            if (reviewIds.length === 0) return;

            const { error } = await supabase
                .from('reviews')
                .delete()
                .in('id', reviewIds);

            if (error) throw error;
        } catch (error) {
            console.error('Failed to delete reviews:', error);
            throw error;
        }
    },

    /**
     * Get the latest completed project/collaboration for a user with member reviews
     * For PartnerDetailContent review tab
     * @param userId - 조회 대상 유저 ID
     */
    async getLatestCompletedItemWithReviews(userId: string): Promise<{
        item: {
            id: string;
            type: 'project' | 'collaboration';
            title: string;
            coverImageUrl: string | null;
            teamName: string;
            createdAt: string;
            memberCount: number;
        };
        memberReviews: Array<{
            memberId: string;
            memberName: string;
            memberAvatarUrl: string | null;
            memberRole: string;
            reviewContent: string;
            reviewTag: string | null;
        }>;
    } | null> {
        try {
            // 1. Find latest completed project where user is an active member
            const { data: projectMembership } = await supabase
                .from('project_members')
                .select(`
                    project_id,
                    projects!inner (
                        id, title, cover_image_url, created_at, status,
                        project_members (user_id, is_leader, status)
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('projects.status', 'completed')
                .order('projects(created_at)', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 2. Find latest completed collaboration where user is an active member
            const { data: collabMembership } = await supabase
                .from('collaboration_members')
                .select(`
                    collaboration_id,
                    collaborations!inner (
                        id, title, cover_image_url, created_at, status,
                        collaboration_members (user_id, is_leader, status)
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('collaborations.status', 'completed')
                .order('collaborations(created_at)', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Determine which one is more recent
            const projectData = (projectMembership as any)?.projects;
            const collabData = (collabMembership as any)?.collaborations;

            let selectedItem: any = null;
            let itemType: 'project' | 'collaboration' = 'project';

            if (projectData && collabData) {
                // Compare dates
                if (new Date(projectData.created_at) >= new Date(collabData.created_at)) {
                    selectedItem = projectData;
                    itemType = 'project';
                } else {
                    selectedItem = collabData;
                    itemType = 'collaboration';
                }
            } else if (projectData) {
                selectedItem = projectData;
                itemType = 'project';
            } else if (collabData) {
                selectedItem = collabData;
                itemType = 'collaboration';
            }

            if (!selectedItem) {
                return null;
            }

            // 3. Get reviews for this item where reviewee_id is NOT null (member reviews)
            // and reviewer is NOT the target user (자신 제외)
            const itemIdColumn = itemType === 'project' ? 'project_id' : 'collaboration_id';

            const { data: reviews } = await supabase
                .from('reviews')
                .select('reviewer_id, reviewee_id, content, review_tag')
                .eq(itemIdColumn, selectedItem.id)
                .not('reviewee_id', 'is', null)
                .eq('reviewee_id', userId)
                .eq('is_visible', true);

            // 4. Get member info for each reviewer
            const reviewerIds = (reviews || []).map(r => r.reviewer_id);
            const displayMap = reviewerIds.length > 0
                ? await getProfileDisplayMap(reviewerIds)
                : new Map();

            // 5. Get team leader name (only active members)
            const allMembers = itemType === 'project'
                ? selectedItem.project_members
                : selectedItem.collaboration_members;
            // Filter to only active members
            const members = (allMembers || []).filter((m: any) => m.status === 'active');
            const leader = members.find((m: any) => m.is_leader);
            const leaderInfo = leader ? await getProfileDisplayMap([leader.user_id]) : new Map();
            const teamName = leaderInfo.get(leader?.user_id)?.name || '팀';

            // 6. Build member reviews (only members who left a review)
            const memberReviews = (reviews || [])
                .filter(r => r.reviewer_id !== userId) // 자신 제외
                .map(review => {
                    const profile = displayMap.get(review.reviewer_id);
                    return {
                        memberId: review.reviewer_id,
                        memberName: profile?.name || '알 수 없음',
                        memberAvatarUrl: profile?.avatar || null,
                        memberRole: profile?.activityField || '멤버',
                        reviewContent: review.content,
                        reviewTag: review.review_tag,
                    };
                });

            return {
                item: {
                    id: selectedItem.id,
                    type: itemType,
                    title: selectedItem.title,
                    coverImageUrl: selectedItem.cover_image_url,
                    teamName,
                    createdAt: selectedItem.created_at,
                    memberCount: (members || []).length,
                },
                memberReviews,
            };
        } catch (error) {
            console.error('getLatestCompletedItemWithReviews failed:', error);
            return null;
        }
    },

    /**
     * Get multiple latest completed projects/collaborations for a user with member reviews
     * For PartnerDetailContent review tab - 여러 개 표시용
     * @param userId - 조회 대상 유저 ID
     * @param limit - 반환할 최대 항목 수 (default: 10)
     */
    async getLatestCompletedItemsWithReviews(userId: string, limit: number = 10): Promise<Array<{
        item: {
            id: string;
            type: 'project' | 'collaboration';
            title: string;
            coverImageUrl: string | null;
            teamName: string;
            createdAt: string;
            memberCount: number;
            rating: number | null;
            reviewCount: number;
        };
        memberReviews: Array<{
            memberId: string;
            memberName: string;
            memberAvatarUrl: string | null;
            memberRole: string;
            reviewContent: string;
            reviewTag: string | null;
        }>;
    }>> {
        try {
            // 1. Find completed projects where user is an active member
            const { data: projectMemberships } = await supabase
                .from('project_members')
                .select(`
                    project_id,
                    projects!inner (
                        id, title, cover_image_url, created_at, status,
                        project_members (user_id, is_leader, status)
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('projects.status', 'completed')
                .order('projects(created_at)', { ascending: false })
                .limit(limit);

            // 2. Find completed collaborations where user is an active member
            const { data: collabMemberships } = await supabase
                .from('collaboration_members')
                .select(`
                    collaboration_id,
                    collaborations!inner (
                        id, title, cover_image_url, created_at, status,
                        collaboration_members (user_id, is_leader, status)
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('collaborations.status', 'completed')
                .order('collaborations(created_at)', { ascending: false })
                .limit(limit);

            // 3. Combine and sort by created_at
            const allItems: Array<{ data: any; type: 'project' | 'collaboration'; createdAt: Date }> = [];

            (projectMemberships || []).forEach((pm: any) => {
                if (pm.projects) {
                    allItems.push({
                        data: pm.projects,
                        type: 'project',
                        createdAt: new Date(pm.projects.created_at),
                    });
                }
            });

            (collabMemberships || []).forEach((cm: any) => {
                if (cm.collaborations) {
                    allItems.push({
                        data: cm.collaborations,
                        type: 'collaboration',
                        createdAt: new Date(cm.collaborations.created_at),
                    });
                }
            });

            // Sort by created_at descending and take limit
            allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            const selectedItems = allItems.slice(0, limit);

            if (selectedItems.length === 0) {
                return [];
            }

            const results: Array<{
                item: {
                    id: string;
                    type: 'project' | 'collaboration';
                    title: string;
                    coverImageUrl: string | null;
                    teamName: string;
                    createdAt: string;
                    memberCount: number;
                    rating: number | null;
                    reviewCount: number;
                };
                memberReviews: Array<{
                    memberId: string;
                    memberName: string;
                    memberAvatarUrl: string | null;
                    memberRole: string;
                    reviewContent: string;
                    reviewTag: string | null;
                }>;
            }> = [];

            for (const selectedItem of selectedItems) {
                const itemData = selectedItem.data;
                const itemType = selectedItem.type;

                // 4. Get reviews for this item where reviewee_id = userId (자신에게 온 리뷰)
                const itemIdColumn = itemType === 'project' ? 'project_id' : 'collaboration_id';

                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('reviewer_id, reviewee_id, content, review_tag, rating')
                    .eq(itemIdColumn, itemData.id)
                    .not('reviewee_id', 'is', null)
                    .eq('reviewee_id', userId)
                    .eq('is_visible', true);

                // Calculate average rating and review count
                const validRatings = (reviews || []).filter(r => r.rating !== null).map(r => r.rating);
                const avgRating = validRatings.length > 0
                    ? Math.round((validRatings.reduce((a, b) => a + b, 0) / validRatings.length) * 10) / 10
                    : null;
                const reviewCount = (reviews || []).length;

                // 5. Get member info for each reviewer
                const reviewerIds = (reviews || []).map(r => r.reviewer_id);
                const displayMap = reviewerIds.length > 0
                    ? await getProfileDisplayMap(reviewerIds)
                    : new Map();

                // 6. Get team leader name (only active members)
                const allMembers = itemType === 'project'
                    ? itemData.project_members
                    : itemData.collaboration_members;
                // Filter to only active members
                const members = (allMembers || []).filter((m: any) => m.status === 'active');
                const leader = members.find((m: any) => m.is_leader);
                const leaderInfo = leader ? await getProfileDisplayMap([leader.user_id]) : new Map();
                const teamName = leaderInfo.get(leader?.user_id)?.name || '팀';

                // 7. Build member reviews
                const memberReviews = (reviews || [])
                    .filter(r => r.reviewer_id !== userId) // 자신 제외
                    .map(review => {
                        const profile = displayMap.get(review.reviewer_id);
                        return {
                            memberId: review.reviewer_id,
                            memberName: profile?.name || '알 수 없음',
                            memberAvatarUrl: profile?.avatar || null,
                            memberRole: profile?.activityField || '멤버',
                            reviewContent: review.content,
                            reviewTag: review.review_tag,
                        };
                    });

                results.push({
                    item: {
                        id: itemData.id,
                        type: itemType,
                        title: itemData.title,
                        coverImageUrl: itemData.cover_image_url,
                        teamName,
                        createdAt: itemData.created_at,
                        memberCount: (members || []).length,
                        rating: avgRating,
                        reviewCount,
                    },
                    memberReviews,
                });
            }

            return results;
        } catch (error) {
            console.error('getLatestCompletedItemsWithReviews failed:', error);
            return [];
        }
    },

    /**
     * Get top N review tags for a user (by count)
     * @param userId - 조회 대상 유저 ID
     * @param limit - 반환할 최대 태그 수 (default: 3)
     */
    async getTopReviewTagsForUser(
        userId: string,
        limit: number = 3
    ): Promise<Array<{ template: string; count: number }>> {
        try {
            const tagStats = await this.getReceivedReviewTagStats(userId);

            // Convert Map to array and sort by count descending
            const sortedTags = Array.from(tagStats.entries())
                .map(([template, count]) => ({ template, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return sortedTags;
        } catch (error) {
            console.error('getTopReviewTagsForUser failed:', error);
            return [];
        }
    }
};
