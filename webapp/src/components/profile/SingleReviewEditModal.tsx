import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DraggableStarRating from '../common/DraggableStarRating';
import { MEMBER_REVIEW_TEMPLATES } from '../../constants/reviewTemplates';
import { reviewService } from '../../services/reviewService';

interface SingleReviewEditModalProps {
    open: boolean;
    onClose: () => void;
    reviewId: string;
    initialRating: number;
    initialReviewTag: string;
    initialContent: string;
    onSubmit?: () => void;
}

export default function SingleReviewEditModal({
    open,
    onClose,
    reviewId,
    initialRating,
    initialReviewTag,
    initialContent,
    onSubmit,
}: SingleReviewEditModalProps) {
    const [rating, setRating] = useState(initialRating);
    const [reviewTag, setReviewTag] = useState(initialReviewTag);
    const [content, setContent] = useState(initialContent);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when modal opens with new data
    useEffect(() => {
        if (open) {
            setRating(initialRating);
            setReviewTag(initialReviewTag);
            setContent(initialContent);
        }
    }, [open, initialRating, initialReviewTag, initialContent]);

    const handleSubmit = async () => {
        if (rating <= 0) return;

        setIsSubmitting(true);
        try {
            await reviewService.updateSingleReview(reviewId, {
                rating,
                reviewTag: reviewTag || null,
                content,
            });
            onSubmit?.();
            onClose();
        } catch (error) {
            console.error('Failed to update review:', error);
            alert('리뷰 수정 중 오류가 발생했어요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    maxHeight: '90vh',
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
                        리뷰수정
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Rating Section */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                            서비스 만족도
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DraggableStarRating
                                value={rating}
                                onChange={(val) => setRating(val)}
                                size="large"
                            />
                            <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>
                                {rating > 0 ? `${rating}점` : ''}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Review Tag Dropdown */}
                    <FormControl fullWidth size="small">
                        <InputLabel>선택해 주세요</InputLabel>
                        <Select
                            value={reviewTag}
                            label="선택해 주세요"
                            onChange={(e) => setReviewTag(e.target.value)}
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="">
                                <em>선택 안 함</em>
                            </MenuItem>
                            {MEMBER_REVIEW_TEMPLATES.map((tpl) => (
                                <MenuItem key={tpl} value={tpl}>
                                    {tpl}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Content TextField */}
                    <Box>
                        <TextField
                            multiline
                            rows={4}
                            fullWidth
                            placeholder="리뷰 내용을 작성해 주세요"
                            value={content}
                            onChange={(e) => {
                                if (e.target.value.length <= 500) {
                                    setContent(e.target.value);
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                {content.length}/500자
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    size="large"
                    disabled={isSubmitting}
                    sx={{
                        flex: 1,
                        borderRadius: 6,
                        borderColor: '#E5E7EB',
                        color: 'text.primary',
                        py: 1.2,
                    }}
                >
                    취소
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    size="large"
                    disabled={rating <= 0 || isSubmitting}
                    sx={{
                        flex: 1,
                        borderRadius: 6,
                        bgcolor: '#2563EB',
                        color: 'white',
                        py: 1.2,
                        '&:hover': {
                            bgcolor: '#1D4ED8',
                        },
                        '&.Mui-disabled': {
                            bgcolor: '#E0E0E0',
                            color: '#9E9E9E',
                        },
                    }}
                >
                    리뷰 작성 완료
                </Button>
            </DialogActions>
        </Dialog>
    );
}
