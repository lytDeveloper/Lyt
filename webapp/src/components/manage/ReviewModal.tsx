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
  useTheme,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Project } from '../../services/projectService';
import type { Collaboration } from '../../services/collaborationService';
import { reviewService, type ReviewData } from '../../services/reviewService';
import { supabase } from '../../lib/supabase';
import DraggableStarRating from '../common/DraggableStarRating';
import { PROJECT_REVIEW_TEMPLATES, MEMBER_REVIEW_TEMPLATES } from '../../constants/reviewTemplates';

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

interface ExistingReviewData {
  revieweeId: string | null;
  rating: number;
  reviewTag: string | null;
  content: string;
}

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  item: Project | Collaboration | null;
  type: 'project' | 'collaboration';
  existingReviews?: ExistingReviewData[]; // 기존 리뷰 데이터 (있으면 수정 모드)
  onSubmit?: () => void;
}

interface ReviewState {
  rating: number; // 0.5 ~ 5.0
  reviewTag: string;
  content: string;
}

// ----------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------

export default function ReviewModal({
  open,
  onClose,
  item,
  type,
  existingReviews = [],
  onSubmit,
}: ReviewModalProps) {
  const theme = useTheme();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 수정 모드 여부
  const isEditMode = existingReviews.length > 0;

  // Project/Collab Review State
  const [mainReview, setMainReview] = useState<ReviewState>({
    rating: 0,
    reviewTag: '',
    content: '',
  });

  // Member Reviews State (Key: Member ID)
  const [memberReviews, setMemberReviews] = useState<Record<string, ReviewState>>({});

  useEffect(() => {
    if (open) {
      // Get current user
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id || null);
      });

      // 기존 리뷰가 있으면 pre-populate
      if (existingReviews.length > 0) {
        // Project/Collab review (revieweeId가 null인 것)
        const mainExisting = existingReviews.find(r => r.revieweeId === null);
        if (mainExisting) {
          setMainReview({
            rating: mainExisting.rating,
            reviewTag: mainExisting.reviewTag || '',
            content: mainExisting.content,
          });
        } else {
          setMainReview({ rating: 0, reviewTag: '', content: '' });
        }

        // Member reviews
        const memberData: Record<string, ReviewState> = {};
        existingReviews
          .filter(r => r.revieweeId !== null)
          .forEach(r => {
            memberData[r.revieweeId!] = {
              rating: r.rating,
              reviewTag: r.reviewTag || '',
              content: r.content,
            };
          });
        setMemberReviews(memberData);
      } else {
        // 새 리뷰 모드 - 초기화
        setMainReview({ rating: 0, reviewTag: '', content: '' });
        setMemberReviews({});
      }
    }
  }, [open, existingReviews]);

  // Helper to get all reviewable members (excluding self)
  const getReviewableMembers = () => {
    if (!item || !item.team || !currentUserId) return [];

    const members: Array<{
      id: string;
      name: string;
      avatar: string;
      role: string;
      isLeader: boolean;
    }> = [];

    // Add Leader
    if (item.team.leaderId && item.team.leaderId !== currentUserId) {
      members.push({
        id: item.team.leaderId,
        name: item.team.leaderName,
        avatar: item.team.leaderAvatar,
        role: type === 'project' ? '마스터' : '리더',
        isLeader: true,
      });
    }

    // Add Partners
    if (item.team.members) {
      item.team.members.forEach((member) => {
        if (member.id !== currentUserId) {
          members.push({
            id: member.id,
            name: member.name,
            avatar: member.profileImageUrl || '',
            role: member.activityField || '팀원',
            isLeader: false,
          });
        }
      });
    }

    return members;
  };

  const reviewableMembers = getReviewableMembers();

  // Handlers
  const handleMainReviewChange = (field: keyof ReviewState, value: any) => {
    setMainReview((prev) => ({ ...prev, [field]: value }));
  };

  const handleMemberReviewChange = (memberId: string, field: keyof ReviewState, value: any) => {
    setMemberReviews((prev) => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || { rating: 0, reviewTag: '', content: '' }),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!currentUserId || !item) return;

    try {
      const reviewsToSubmit: ReviewData[] = [];

      // 1. Main Project/Collab Review
      if (mainReview.rating > 0) {
        reviewsToSubmit.push({
          itemId: item.id,
          itemType: type,
          reviewerId: currentUserId,
          revieweeId: null, // Indicates Project/Collab review
          rating: mainReview.rating,
          reviewTag: mainReview.reviewTag,
          content: mainReview.content,
        });
      }

      // 2. Member Reviews
      Object.keys(memberReviews).forEach((memberId) => {
        const review = memberReviews[memberId];
        if (review.rating > 0) {
          reviewsToSubmit.push({
            itemId: item.id,
            itemType: type,
            reviewerId: currentUserId,
            revieweeId: memberId,
            rating: review.rating,
            reviewTag: review.reviewTag,
            content: review.content,
          });
        }
      });

      console.log('Submitting reviews:', reviewsToSubmit); // Debug log

      await reviewService.submitReviews(reviewsToSubmit);

      onSubmit?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit reviews:', error);
      alert('리뷰 등록 중 오류가 발생했어요.');
    }
  };

  const isValid = () => {
    // Require at least the main project review rating
    return mainReview.rating > 0;
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
            {isEditMode ? '리뷰 수정하기' : '리뷰 작성하기'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* 1. PROJECT / COLLAB REVIEW SECTION */}
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>
              {type === 'project' ? '프로젝트' : '협업'} 리뷰 작성하기
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                만족도
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DraggableStarRating
                  value={mainReview.rating}
                  onChange={(val) => handleMainReviewChange('rating', val)}
                  size="large"
                />
                <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>
                  {mainReview.rating > 0 ? `${mainReview.rating}점` : ''}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                리뷰 작성하기<Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>선택해 주세요</InputLabel>
                <Select
                  value={mainReview.reviewTag}
                  label="선택해 주세요"
                  onChange={(e) => handleMainReviewChange('reviewTag', e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">
                    <em>선택 안 함</em>
                  </MenuItem>
                  {PROJECT_REVIEW_TEMPLATES.map((tpl) => (
                    <MenuItem key={tpl} value={tpl}>
                      {tpl}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                multiline
                rows={3}
                fullWidth
                placeholder={`진행한 ${type === 'project' ? '프로젝트' : '협업'}에 대해 구체적인 리뷰를 작성해 주세요 (선택)`}
                value={mainReview.content}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    handleMainReviewChange('content', e.target.value);
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
                  {mainReview.content.length}/500자
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* 2. MEMBER REVIEWS SECTION */}
          {reviewableMembers.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>
                팀원 리뷰 작성하기
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reviewableMembers.map((member) => {
                  const state = memberReviews[member.id] || { rating: 0, reviewTag: '', content: '' };

                  return (
                    <Box key={member.id} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                      {/* Member Info & Rating */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 0.5 }}>
                          <Avatar
                            src={member.avatar || undefined}
                            alt={member.name}
                            sx={{ width: 36, height: 36 }}
                          />
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                              {member.name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {member.role}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DraggableStarRating
                            value={state.rating}
                            onChange={(val) => handleMemberReviewChange(member.id, 'rating', val)}
                            size="small"
                          />
                          <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500, minWidth: '24px' }}>
                            {state.rating > 0 ? `${state.rating}점` : ''}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Review Form (Only show inputs if rating is interacting or user wants to review) 
                          Actually design shows inputs always visible. Let's keep them visible. 
                      */}

                      <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                        <InputLabel>선택해 주세요</InputLabel>
                        <Select
                          value={state.reviewTag}
                          label="선택해 주세요"
                          onChange={(e) => handleMemberReviewChange(member.id, 'reviewTag', e.target.value)}
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

                      <TextField
                        multiline
                        rows={2}
                        fullWidth
                        placeholder="팀원에 대한 구체적인 리뷰를 작성해 주세요 (선택)"
                        value={state.content}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) {
                            handleMemberReviewChange(member.id, 'content', e.target.value);
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
                          {state.content.length}/500자
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          size="large"
          sx={{
            flex: 1,
            borderRadius: 6,
            borderColor: theme.palette.divider,
            color: 'text.primary',
            py: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          size="large"
          disabled={!isValid()}
          sx={{
            flex: 1,
            borderRadius: 6,
            bgcolor: '#2563EB',
            color: 'white',
            py: 1.2,
            whiteSpace: 'nowrap',
            '&:hover': {
              bgcolor: '#1D4ED8',
            },
            '&.Mui-disabled': {
              bgcolor: '#E0E0E0',
              color: '#9E9E9E'
            }
          }}
        >
          {isEditMode ? '리뷰 수정 완료' : '리뷰 작성 완료'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
