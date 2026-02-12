import { useEffect, useState } from 'react';
import { Box, Container, Typography, Skeleton, Button } from '@mui/material';
import { useProfileStore } from '../../stores/profileStore';
import { reviewService, type Review } from '../../services/reviewService';
import Header from '../../components/common/Header';
import ReviewCard, { type ReviewData } from '../../components/profile/ReviewCard';
import SingleReviewEditModal from '../../components/profile/SingleReviewEditModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface ExtendedReviewData extends ReviewData {
    originalReview: Review;
}

export default function WrittenReviewsPage() {
    const { profileId } = useProfileStore();
    const [reviews, setReviews] = useState<ExtendedReviewData[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Manage mode state
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingReview, setEditingReview] = useState<ExtendedReviewData | null>(null);

    // Delete confirm dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchReviews = async () => {
        if (!profileId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await reviewService.getWrittenReviews(profileId);
            const formattedReviews: ExtendedReviewData[] = data.map(r => ({
                id: r.id,
                reviewerName: r.reviewee?.name || 'Unknown',
                reviewerImage: r.reviewee?.image || null,
                reviewerRole: r.reviewee?.role || 'Member',
                rating: r.rating,
                reviewTag: (r as any).review_tag || undefined,
                content: r.content,
                date: new Date(r.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                }).replace(/\. /g, '.').replace(/\.$/, ''),
                projectName: undefined,
                originalReview: r,
            }));
            setReviews(formattedReviews);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [profileId]);

    // Reset selection when exiting manage mode
    useEffect(() => {
        if (!isManageMode) {
            setSelectedIds(new Set());
        }
    }, [isManageMode]);

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleEditClick = (review: ExtendedReviewData) => {
        setEditingReview(review);
        setEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        // Refresh reviews after edit
        fetchReviews();
    };

    const handleDeleteClick = () => {
        if (selectedIds.size === 0) return;
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            await reviewService.deleteReviews(Array.from(selectedIds));
            // Refresh reviews after delete
            await fetchReviews();
            setIsManageMode(false);
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Delete failed:', error);
            alert('삭제 중 오류가 발생했어요.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'white' }}>
                <Header showBackButton onBackClick={() => navigate(-1)} />
            </Box>
            <Container maxWidth="sm" sx={{ py: 3 }}>
                {/* Header */}
                <Box sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
                        내가 작성한 리뷰
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 300, fontSize: 14, color: '#6B7280' }}>
                            작성한 리뷰를 관리해보세요.
                        </Typography>
                        {reviews.length > 0 && (
                            isManageMode ? (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                    <Button
                                        onClick={handleDeleteClick}
                                        disabled={selectedIds.size === 0}
                                        sx={{
                                            color: selectedIds.size > 0 ? '#EF4444' : '#9CA3AF',
                                            fontWeight: 600,
                                            fontSize: 14,
                                            minWidth: 'auto',
                                            p: 0,
                                        }}
                                    >
                                        삭제
                                    </Button>
                                    <Typography
                                        onClick={() => setIsManageMode(false)}
                                        sx={{
                                            color: '#6B7280',
                                            fontSize: 14,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        취소
                                    </Typography>
                                </Box>
                            ) : (
                                <Typography
                                    onClick={() => setIsManageMode(true)}
                                    sx={{
                                        color: '#3B82F6',
                                        fontWeight: 500,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        '&:hover': {
                                            textDecoration: 'underline',
                                        },
                                    }}
                                >
                                    관리
                                </Typography>
                            )
                        )}
                    </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={150} sx={{ borderRadius: 4 }} />)}
                        </Box>
                    ) : reviews.length > 0 ? (
                        reviews.map(review => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                showEditButton={true}
                                onEdit={() => handleEditClick(review)}
                                isManageMode={isManageMode}
                                isSelected={selectedIds.has(review.id)}
                                onSelect={handleSelect}
                            />
                        ))
                    ) : (
                        <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>
                            작성한 리뷰가 없어요.
                        </Typography>
                    )}
                </Box>
            </Container>

            {/* Edit Modal */}
            {editingReview && (
                <SingleReviewEditModal
                    open={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingReview(null);
                    }}
                    reviewId={editingReview.id}
                    initialRating={editingReview.rating}
                    initialReviewTag={editingReview.reviewTag || ''}
                    initialContent={editingReview.content}
                    onSubmit={handleEditSubmit}
                />
            )}

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => !isDeleting && setDeleteDialogOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="리뷰 삭제"
                message={`선택한 ${selectedIds.size}개의 리뷰를 삭제하시겠습니까?`}
                confirmText="삭제"
                cancelText="취소"
                loading={isDeleting}
                icon={<DeleteOutlineIcon />}
            />
        </Box>
    );
}
