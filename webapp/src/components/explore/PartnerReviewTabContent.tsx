/**
 * PartnerReviewTabContent
 * 파트너 상세 모달의 리뷰 탭 내용
 * - 최근 완료된 프로젝트/협업과 멤버 리뷰 (최신 2개 먼저, 더보기로 나머지)
 * - 활동 리뷰 (ReviewTemplateCard) Top 3
 */

import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Avatar, Skeleton, useTheme, Button } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import QueryBuilderRoundedIcon from '@mui/icons-material/QueryBuilderRounded';

import ReviewTemplateCard from '../profile/ReviewTemplateCard';
import { reviewService } from '../../services/reviewService';
import { formatDate, formatRelativeTime } from '../../utils/formatters';

interface PartnerReviewTabContentProps {
    partnerId: string;
}

interface ItemData {
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
}

interface ReviewTagData {
    template: string;
    count: number;
}

const INITIAL_DISPLAY_COUNT = 2;

export default function PartnerReviewTabContent({ partnerId }: PartnerReviewTabContentProps) {
    const theme = useTheme();
    const [allItems, setAllItems] = useState<ItemData[]>([]);
    const [topTags, setTopTags] = useState<ReviewTagData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [itemsData, tagsData] = await Promise.all([
                reviewService.getLatestCompletedItemsWithReviews(partnerId, 10),
                reviewService.getTopReviewTagsForUser(partnerId, 3),
            ]);
            setAllItems(itemsData);
            setTopTags(tagsData);
        } catch (error) {
            console.error('Failed to fetch review tab data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [partnerId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <Box sx={{ p: 2 }}>
                <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 1 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 1 }} />
                <Skeleton variant="rounded" height={60} />
            </Box>
        );
    }

    // 표시할 아이템 결정
    const displayItems = showAll ? allItems : allItems.slice(0, INITIAL_DISPLAY_COUNT);
    const hasMoreItems = allItems.length > INITIAL_DISPLAY_COUNT;

    const renderItemCard = (itemData: ItemData) => (
        <Box
            key={itemData.item.id}
            sx={{
                bgcolor: theme.palette.background.paper,
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2,
                boxShadow: '0px 2px 5px 0px rgba(50, 50, 105, 0.15), 0px 1px 1px 0px rgba(0, 0, 0, 0.05)',
            }}
        >
            {/* 커버 이미지 + 프로젝트 정보 */}
            <Box sx={{ display: 'flex', p: 2, gap: 2 }}>
                {/* 커버 이미지 (썸네일) */}
                {itemData.item.coverImageUrl ? (
                    <Box
                        component="img"
                        src={itemData.item.coverImageUrl}
                        alt={itemData.item.title}
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 1.5,
                            objectFit: 'cover',
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 1.5,
                            bgcolor: theme.palette.grey[200],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11 }}>
                            이미지 없음
                        </Typography>
                    </Box>
                )}

                {/* 프로젝트 정보 */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            mb: 0.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {itemData.item.title}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: theme.palette.text.secondary,
                            mb: 0.5,
                        }}
                    >
                        {itemData.item.teamName}
                    </Typography>

                    {/* 평점 및 리뷰 수 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <StarIcon sx={{ fontSize: 14, color: '#FBBF24' }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary }}>
                            {itemData.item.rating ?? '–'}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                            ({itemData.item.reviewCount})
                        </Typography>
                    </Box>

                    {/* 날짜 및 멤버 수 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, }}>
                            <Typography >
                                <CalendarMonthOutlinedIcon sx={{ fontSize: 10, color: theme.palette.icon.default }} />
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>
                                {formatDate(itemData.item.createdAt)}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography >
                                <GroupOutlinedIcon sx={{ fontSize: 10, color: theme.palette.icon.default }} />
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>
                                {itemData.item.memberCount}명
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography >
                                <QueryBuilderRoundedIcon sx={{ fontSize: 10, color: theme.palette.icon.default }} />
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>
                                {formatRelativeTime(itemData.item.createdAt)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* 팀 멤버 label */}
            {itemData.memberReviews.length > 0 && (
                <Typography
                    sx={{
                        px: 2,
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.palette.text.secondary,
                    }}
                >
                    팀
                </Typography>
            )}

            {/* 팀 멤버 리뷰 */}
            <Box sx={{ px: 2, pb: 2 }}>
                {itemData.memberReviews.length > 0 ? (
                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {itemData.memberReviews.map((review) => (
                            <Box
                                key={review.memberId}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center', // 세로 중앙 정렬
                                    gap: 1.5,
                                }}
                            >
                                {/* 멤버 프로필 */}
                                <Avatar
                                    src={review.memberAvatarUrl || undefined}
                                    alt={review.memberName}
                                    sx={{ width: 30, height: 30 }}
                                />

                                {/* 이름 및 역할 */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 60 }}>
                                    <Typography
                                        sx={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: theme.palette.text.primary,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {review.memberName}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: 10,
                                            color: theme.palette.text.secondary,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {review.memberRole}
                                    </Typography>
                                </Box>

                                {/* 리뷰 말풍선 (말풍선 스타일 제거하고 텍스트로 변경) */}
                                <Box
                                    sx={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        ml: 2, // 이름/역할과 간격
                                        flexDirection: 'column',
                                        gap: 0.5,
                                    }}
                                >
                                    {review.reviewTag && (
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: theme.palette.text.secondary, // 회색조
                                                lineHeight: 1.5,
                                                mr: 1,
                                            }}
                                        >
                                            "{review.reviewTag}"
                                        </Typography>
                                    )}
                                    {review.reviewContent && !review.reviewTag && (
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: theme.palette.text.secondary,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            "{review.reviewContent}"
                                        </Typography>
                                    )}
                                    {/* 태그와 내용이 둘 다 있을 경우 어떻게 표시할지? 이미지에는 하나만 나옴. 
                                        현재 데이터 구조상 reviewTag가 우선이거나, 둘 다 표시.
                                        이미지상으로는 큰 따옴표 안에 텍스트가 들어감. 
                                        기존 코드는 둘 다 있으면 둘 다 표시했음.
                                        일단 둘 다 표시하되, 한 줄로 자연스럽게 연결.
                                    */}
                                    {review.reviewContent && review.reviewTag && (
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: theme.palette.text.secondary,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            "{review.reviewContent}"
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography
                        sx={{
                            fontSize: 13,
                            color: theme.palette.text.secondary,
                            textAlign: 'center',
                            py: 2,
                        }}
                    >
                        아직 받은 리뷰가 없어요
                    </Typography>
                )}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ mx: -2 }}>
            {/* 프로젝트·협업 리뷰 섹션 */}
            <Typography
                sx={{
                    px: 2,
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 2,
                }}
            >
                프로젝트·협업 리뷰
            </Typography>

            {allItems.length > 0 ? (
                <>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {displayItems.map(renderItemCard)}
                    </Box>

                    {/* 더보기 / 접기 버튼 */}
                    {hasMoreItems && (
                        <Button
                            onClick={() => setShowAll(!showAll)}
                            endIcon={showAll ? <ArrowDropUpRoundedIcon /> : <ArrowDropDownRoundedIcon />}
                            sx={{
                                mx: 2,
                                width: 'calc(100% - 32px)',
                                py: 1.5,
                                mb: 3,
                                color: theme.palette.text.secondary,
                                fontSize: 12,
                                fontWeight: 500,
                                textTransform: 'none',
                                borderRadius: 2,
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            {showAll ? '접기' : `더 보기 (${allItems.length - INITIAL_DISPLAY_COUNT}개)`}
                        </Button>
                    )}
                </>
            ) : (
                <Box
                    sx={{
                        mx: 2,
                        bgcolor: theme.palette.grey[50],
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        mb: 3,
                    }}
                >
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                        아직 완료된 프로젝트·협업이 없어요
                    </Typography>
                </Box>
            )}

            {/* 활동 리뷰 섹션 */}
            <Typography
                sx={{
                    px: 2,
                    mt: 3,
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 2,
                }}
            >
                활동 리뷰
            </Typography>

            {
                topTags.length > 0 ? (
                    <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {topTags.map((tag, index) => (
                            <ReviewTemplateCard key={index} template={tag.template} count={tag.count} />
                        ))}
                    </Box>
                ) : (
                    <Box
                        sx={{
                            mx: 2,
                            bgcolor: theme.palette.grey[50],
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                        }}
                    >
                        <Typography sx={{ fontSize: 14, color: theme.palette.text.secondary }}>
                            아직 받은 활동 리뷰가 없어요
                        </Typography>
                    </Box>
                )
            }
        </Box >
    );
}
