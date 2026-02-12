/**
 * ProjectEditModal
 * 프로젝트 수정 모달 컴포넌트
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Modal,
  useTheme,
  Checkbox,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import { LightningLoader } from '../common';
import { updateProject, type Project, type CreateProjectInput } from '../../services/projectService';
import { EXTENDED_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_VALUES, BUDGET_OPTIONS, DURATION_OPTIONS } from '../../constants/projectConstants';
import { getSkillsByCategory } from '../../constants/skillTags';
import { toast } from 'react-toastify';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import type { ProjectCategory } from '../../types/exploreTypes';

interface ProjectEditModalProps {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess?: () => void;
}

export default function ProjectEditModal({ open, onClose, project, onSuccess }: ProjectEditModalProps) {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExistingImage, setKeepExistingImage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const skillOptions = useMemo(
    () => (category ? getSkillsByCategory(category) : []),
    [category]
  );

  // Initialize form with project data
  useEffect(() => {
    if (project && open) {
      setTitle(project.title || '');
      // Convert category from DB value to Korean label
      const categoryLabel = project.category
        ? Object.keys(CATEGORY_VALUES).find(key => CATEGORY_VALUES[key] === project.category) || ''
        : '';
      setCategory(categoryLabel);
      setDescription(project.description || '');
      setGoal(project.goal || '');
      setRequirements(project.requirements || []);
      setBudget(project.budget || '');
      setDuration(project.deadline ? '기간 없이' : ''); // TODO: Convert deadline to duration
      setCapacity(project.capacity || 1);
      setSkills(project.skills || []);
      setPreviewUrl(project.coverImage || null);
      setKeepExistingImage(!!project.coverImage);
      setCoverImage(null);
    }
  }, [project, open]);

  // 카테고리 변경 시 현재 선택 스킬을 유효한 옵션으로 제한
  useEffect(() => {
    if (category) {
      setSkills((prev) => prev.filter((skill) => skillOptions.includes(skill)));
    }
  }, [category, skillOptions]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setCoverImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setKeepExistingImage(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveCover = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCoverImage(null);
    setPreviewUrl(null);
    setKeepExistingImage(false);
  };

  const handleAddRequirement = () => {
    const value = requirementInput.trim();
    if (!value) return;
    setRequirements((prev) => [...prev, value]);
    setRequirementInput('');
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRequirementKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddRequirement();
    }
  };

  const handleToggleSkill = (skill: string) => {
    setSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      } else {
        return [...prev, skill];
      }
    });
  };

  const handleSubmit = async () => {
    if (!project || !title || !category || !description) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const resolvedCategory = category
        ? (CATEGORY_VALUES[category] ?? (category as ProjectCategory))
        : (category as ProjectCategory);

      // Check if budget has changed
      const originalBudget = project.budget;
      const budgetChanged = budget !== originalBudget;

      const projectInput: CreateProjectInput = {
        title,
        category: resolvedCategory,
        description,
        goal: goal || undefined,
        requirements: requirements.length > 0 ? requirements : undefined,
        budget: budget || undefined,
        duration: duration || undefined,
        capacity: capacity || undefined,
        skills: skills.length > 0 ? skills : undefined,
        cover_image_file: keepExistingImage ? null : (coverImage || undefined),
        cover_image_url: keepExistingImage && project.coverImage ? project.coverImage : undefined,
      };

      await updateProject(project.id, projectInput);

      // Send notification to team members if budget changed
      if (budgetChanged) {
        try {
          const { projectService } = await import('../../services/projectService');
          const { userNotificationService } = await import('../../services/userNotificationService');
          const { messageService } = await import('../../services/messageService');
          const { supabase } = await import('../../lib/supabase');

          // 현재 로그인 사용자 ID 가져오기 (수정한 본인에게는 알림 미발송)
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const currentUserId = currentUser?.id;

          // 팀 멤버 ID 조회 (createdBy 제외)
          let teamMemberIds = await projectService.getProjectTeamMemberIds(
            project.id,
            project.createdBy
          );

          // 현재 사용자도 명시적으로 제외 (수정한 본인에게는 알림 미발송)
          if (currentUserId) {
            teamMemberIds = teamMemberIds.filter(id => id !== currentUserId);
          }

          // 1. 팀 멤버에게 알림 전송
          if (teamMemberIds.length > 0) {
            const notifications = teamMemberIds.map(memberId => ({
              receiver_id: memberId,
              type: 'project_update' as const,
              title: '프로젝트 예산 변경',
              content: `"${title}" 프로젝트의 예산이 변경되었어요.\n${originalBudget || '미정'} → ${budget || '미정'}`,
              related_id: project.id,
              related_type: 'project' as const,
              metadata: {
                projectId: project.id,
                projectTitle: title,
                previousBudget: originalBudget,
                newBudget: budget,
              },
            }));

            await userNotificationService.createBulkNotifications(notifications);
          }

          // 2. 프로젝트 채팅방에 시스템 메시지 전송
          const chatRoomId = await messageService.getRoomByProjectId(project.id);
          if (chatRoomId) {
            const systemMessage = `${title}의 예산 범위가 ${budget || '미정'}으로 수정되었어요.`;
            await messageService.sendMessage(chatRoomId, systemMessage, [], undefined, 'system');
          }
        } catch (notificationError) {
          // Non-blocking: notification failure should not fail the update
          console.error('[ProjectEditModal] Failed to send budget change notifications:', notificationError);
        }
      }

      toast.success('프로젝트가 수정되었어요.');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('[ProjectEditModal] Failed to update project:', error);
      toast.error(error.message || '프로젝트 수정에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (previewUrl && coverImage) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '768px',
          maxHeight: '90vh',
          backgroundColor: theme.palette.background.paper,
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <IconButton onClick={handleClose} size="small">
            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 22, color: theme.palette.icon.default }} />
          </IconButton>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 18,
              color: theme.palette.text.primary,
            }}
          >
            프로젝트 수정
          </Typography>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !category || !description}
            sx={{
              minWidth: 'auto',
              padding: '6px 16px',
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 500,
              fontSize: 14,
              textTransform: 'none',
              color: theme.palette.primary.main,
              '&:disabled': {
                color: theme.palette.text.disabled,
              },
            }}
          >
            {isSubmitting ? <LightningLoader size={16} /> : '저장'}
          </Button>
        </Box>

        {/* Scrollable Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 16px',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          {/* 커버 이미지 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              프로젝트 커버 이미지
            </Typography>

            {previewUrl && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={keepExistingImage}
                    onChange={(e) => setKeepExistingImage(e.target.checked)}
                    size="small"
                  />
                }
                label="기존 이미지 유지"
                sx={{
                  marginBottom: 1,
                  '& .MuiFormControlLabel-label': {
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                  },
                }}
              />
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {previewUrl ? (
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Cover Preview"
                  sx={{
                    width: '100%',
                    height: '160px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                  }}
                />
                <IconButton
                  onClick={handleRemoveCover}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                  size="small"
                >
                  <CloseRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ) : (
              <Box
                onClick={handleUploadClick}
                sx={{
                  width: '100%',
                  height: '160px',
                  border: '2px dashed #E5E7EB',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <CloudUploadOutlinedIcon sx={{ fontSize: 30, color: theme.palette.icon.inner, marginBottom: '12px' }} />
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 500,
                    fontSize: 14,
                    color: '#374151',
                    marginBottom: 0.5,
                  }}
                >
                  이미지 16:9 비율 권장
                </Typography>
              </Box>
            )}
          </Box>

          {/* 프로젝트 제목 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              프로젝트 제목 *
            </Typography>
            <TextField
              fullWidth
              placeholder="예: K-POP 아티스트와 패션 브랜드 협업"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                },
              }}
            />
          </Box>

          {/* 카테고리 선택 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              카테고리 선택 *
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '26px 12px',
              }}
            >
              {EXTENDED_CATEGORIES.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat];
                const catLabel = CATEGORY_LABELS[cat];
                return (
                  <Button
                    key={cat}
                    onClick={() => setCategory(catLabel)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                      borderRadius: '20px',
                      color: category === catLabel ? '#fff' : '#000',
                      backgroundColor: category === catLabel ? theme.palette.status.blue : theme.palette.background.paper,
                      width: 72,
                      height: 72,
                      minWidth: 'auto',
                    }}
                  >
                    <Box sx={{ marginBottom: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {IconComponent && <IconComponent sx={{ fontSize: 26 }} />}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 500,
                        fontSize: 12,
                        color: category === catLabel ? '#fff' : '#000',
                      }}
                    >
                      {catLabel}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* 프로젝트 설명 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              프로젝트 설명 *
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="프로젝트에 대해 자세히 설명해 주세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                },
              }}
            />
          </Box>

          {/* 프로젝트 목표 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              프로젝트 목표
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="프로젝트의 목표를 입력해 주세요"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                },
              }}
            />
          </Box>

          {/* 참여 요건 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              참여 요건
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, marginBottom: 1.5 }}>
              {requirements.length === 0 ? (
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 400,
                    fontSize: 13,
                    color: theme.palette.text.secondary,
                  }}
                >
                  조건을 추가해주세요.
                </Typography>
              ) : (
                requirements.map((req, idx) => (
                  <Box key={`${req}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 18, color: theme.palette.text.disabled, lineHeight: '20px' }}>•</Typography>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, lineHeight: 1.5, flex: 1 }}>
                      {req}
                    </Typography>
                    <Button size="small" variant="text" onClick={() => handleRemoveRequirement(idx)} sx={{ minWidth: 40, color: theme.palette.text.secondary }}>
                      삭제
                    </Button>
                  </Box>
                ))
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TextField
                fullWidth
                placeholder="내용을 추가해 주세요"
                value={requirementInput}
                onChange={(e) => setRequirementInput(e.target.value.slice(0, 100))}
                onKeyDown={handleRequirementKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AddRoundedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    height: 40,
                    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddRequirement}
                disabled={!requirementInput.trim()}
                sx={{ height: 30, borderRadius: 10 }}
              >
                입력
              </Button>
            </Box>
          </Box>

          {/* 예산 범위 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              예산 범위
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {BUDGET_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  onClick={() => setBudget(budget === option ? '' : option)}
                  sx={{
                    backgroundColor: budget === option ? theme.palette.primary.main : theme.palette.grey[100],
                    color: budget === option ? '#fff' : '#000',
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                    '&:hover': {
                      backgroundColor: budget === option ? theme.palette.primary.dark : theme.palette.grey[200],
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* 기간 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              프로젝트 기간
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {DURATION_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  onClick={() => setDuration(duration === option ? '' : option)}
                  sx={{
                    backgroundColor: duration === option ? theme.palette.primary.main : theme.palette.grey[100],
                    color: duration === option ? '#fff' : '#000',
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                    '&:hover': {
                      backgroundColor: duration === option ? theme.palette.primary.dark : theme.palette.grey[200],
                    },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* 모집 인원 */}
          <Box sx={{ marginBottom: 6 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              모집 인원
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => setCapacity(Math.max(1, capacity - 1))}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '22px',
                  width: 30,
                  height: 30,
                }}
              >
                <RemoveOutlinedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />
              </IconButton>
              <Typography sx={{ fontFamily: 'Pretendard, sans-serif', fontSize: 16, fontWeight: 500, minWidth: '40px', textAlign: 'center' }}>
                {capacity}명
              </Typography>
              <IconButton
                onClick={() => setCapacity(capacity + 1)}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '22px',
                  width: 30,
                  height: 30,
                }}
              >
                <AddRoundedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />
              </IconButton>
            </Box>
          </Box>

          {/* 필요 스킬 */}
          {category && (
            <Box sx={{ marginBottom: 6 }}>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 500,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#374151',
                  marginBottom: 1,
                }}
              >
                필요 스킬
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {skillOptions.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onClick={() => handleToggleSkill(skill)}
                    sx={{
                      backgroundColor: skills.includes(skill) ? theme.palette.primary.main : theme.palette.grey[100],
                      color: skills.includes(skill) ? '#fff' : '#000',
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 13,
                      '&:hover': {
                        backgroundColor: skills.includes(skill) ? theme.palette.primary.dark : theme.palette.grey[200],
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
}

