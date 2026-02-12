import { useEffect, useState } from 'react';
import { Box, Container, Typography, Skeleton } from '@mui/material';
import { useProfileStore } from '../../stores/profileStore';
import { reviewService } from '../../services/reviewService';
import Header from '../../components/common/Header';
import ReviewCard, { type ReviewData } from '../../components/profile/ReviewCard';
import { useNavigate } from 'react-router-dom';

export default function ReceivedReviewsPage() {
    const { profileId, type, nonFanProfile } = useProfileStore();

    const profileName = type === 'brand'
        ? nonFanProfile?.record?.brand_name
        : type === 'artist'
            ? nonFanProfile?.record?.artist_name
            : type === 'creative'
                ? nonFanProfile?.record?.nickname
                : nonFanProfile?.record?.nickname || '유저';
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (profileId) {
            setLoading(true);
            reviewService.getReceivedReviews(profileId)
                .then(data => {
                    const formattedReviews: ReviewData[] = data.map(r => ({
                        id: r.id,
                        reviewerName: r.reviewer?.name || 'Unknown',
                        reviewerImage: r.reviewer?.image || null,
                        reviewerRole: r.reviewer?.role || 'Member',
                        rating: r.rating,
                        reviewTag: (r as any).review_tag || undefined,
                        content: r.content,
                        date: new Date(r.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        }).replace(/\. /g, '.').replace(/\.$/, ''),
                        projectName: undefined // Api doesn't seem to return project name yet
                    }));
                    setReviews(formattedReviews);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [profileId]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'white' }}>
                <Header showBackButton onBackClick={() => navigate(-1)} />
            </Box>
            <Container maxWidth="sm" sx={{ py: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
                    내가 받은 리뷰
                </Typography>
                <Typography sx={{ fontWeight: 300, fontSize: 14, color: '#6B7280', mb: 3 }}>
                    {profileName}님, 다른 유저들의 리뷰를 관리해보세요.
                </Typography>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={150} sx={{ borderRadius: 4 }} />)}
                    </Box>
                ) : reviews.length > 0 ? (
                    reviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                    ))
                ) : (
                    <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                        받은 리뷰가 없어요.
                    </Typography>
                )}
            </Container>
        </Box>
    );
}
