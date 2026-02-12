/**
 * CollaborationEditModal
 * 협업 수정 모달 컴포넌트
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
import { LuPlus, LuMonitor, LuMapPin, LuRefreshCcw } from 'react-icons/lu';
import { updateCollaboration, type Collaboration, type CreateCollaborationInput } from '../../services/collaborationService';
import { EXTENDED_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_VALUES, COLLABORATION_DURATION_OPTIONS, WORK_TYPE_OPTIONS, WORK_TYPE_VALUES } from '../../constants/projectConstants';
import { getSkillsByCategory } from '../../constants/skillTags';
import { toast } from 'react-toastify';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { ProjectCategory } from '../../types/exploreTypes';

interface CollaborationEditModalProps {
  open: boolean;
  onClose: () => void;
  collaboration: Collaboration | null;
  onSuccess?: () => void;
}

export default function CollaborationEditModal({ open, onClose, collaboration, onSuccess }: CollaborationEditModalProps) {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [duration, setDuration] = useState('');
  const [workType, setWorkType] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [skills, setSkills] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExistingImage, setKeepExistingImage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const skillOptions = useMemo(
    () => (category ? getSkillsByCategory(category) : []),
    [category]
  );

  // Initialize form with collaboration data
  useEffect(() => {
    if (collaboration && open) {
      setTitle(collaboration.title || '');
      // Convert category from DB value to Korean label
      const categoryLabel = collaboration.category
        ? Object.keys(CATEGORY_VALUES).find(key => CATEGORY_VALUES[key] === collaboration.category) || ''
        : '';
      setCategory(categoryLabel);
      setDescription(collaboration.description || '');
      setGoal(collaboration.goal || '');
      setRequirements(Array.isArray(collaboration.requirements) ? collaboration.requirements : []);
      setBenefits(Array.isArray(collaboration.benefits) ? collaboration.benefits : []);
      setDuration(collaboration.duration || '');
      // Convert work type from DB value to Korean label
      // Note: workType is not in Collaboration type, but exists in DB as work_type
      const workTypeDbValue = (collaboration as any).workType || (collaboration as any).work_type;
      const workTypeLabel = workTypeDbValue
        ? Object.entries(WORK_TYPE_VALUES).find(([_, value]) => value === workTypeDbValue)?.[0] || ''
        : '';
      setWorkType(workTypeLabel);
      setCapacity(collaboration.capacity || 5);
      setSkills(collaboration.skills || []);
      setPreviewUrl(collaboration.coverImageUrl || null);
      setKeepExistingImage(!!collaboration.coverImageUrl);
      setCoverImage(null);
    }
  }, [collaboration, open]);

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

  const handleAddBenefit = () => {
    const value = benefitInput.trim();
    if (!value) return;
    setBenefits((prev) => [...prev, value]);
    setBenefitInput('');
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBenefitKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddBenefit();
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
    if (!collaboration || !title || !category || !description) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const resolvedCategory = category
        ? (CATEGORY_VALUES[category] ?? (category as ProjectCategory))
        : (category as ProjectCategory);

      // Create input - coverFile is optional for updates (updateCollaboration handles this)
      const collaborationInput = {
        title,
        category: resolvedCategory,
        description,
        goal: goal || undefined,
        skills: skills.length > 0 ? skills : [],
        requirements: requirements.length > 0 ? requirements : [],
        benefits: benefits.length > 0 ? benefits : [],
        capacity: capacity || 5,
        duration: duration || '',
        workType: workType || '',
        tags: skills, // Use skills as tags
        coverFile: keepExistingImage ? undefined : (coverImage || undefined),
      } as CreateCollaborationInput;

      await updateCollaboration(collaboration.id, collaborationInput);
      toast.success('협업이 수정되었어요.');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('[CollaborationEditModal] Failed to update collaboration:', error);
      toast.error(error.message || '협업 수정에 실패했어요.');
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

  const workTypeIconMap: Record<string, React.ReactNode> = {
    온라인: <LuMonitor size={18} />,
    오프라인: <LuMapPin size={18} />,
    '온오프라인 병행': <LuRefreshCcw size={18} />,
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
            <ArrowBackIosNewRoundedIcon />
          </IconButton>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 18,
              color: theme.palette.text.primary,
            }}
          >
            협업 수정
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
          <Box sx={{ marginBottom: 3 }}>
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
              협업 커버 이미지
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
                  <CloseRoundedIcon sx={{ fontSize: 18, color: theme.palette.primary.contrastText }} />
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

          {/* 협업 제목 */}
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
              협업 제목 *
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
                      backgroundColor: category === catLabel ? theme.palette.status.blue : theme.palette.grey[100],
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

          {/* 협업 설명 */}
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
              협업 설명 *
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="협업에 대해 자세히 설명해주세요..."
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

          {/* 협업 목표 */}
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
              협업 목표
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="협업의 목표를 입력해주세요..."
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
                      <LuPlus size={18} color={theme.palette.icon.default} />
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

          {/* 참여 혜택 */}
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
              참여 혜택
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, marginBottom: 1.5 }}>
              {benefits.length === 0 ? (
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 400,
                    fontSize: 13,
                    color: theme.palette.text.secondary,
                  }}
                >
                  혜택을 추가해주세요.
                </Typography>
              ) : (
                benefits.map((benefit, idx) => (
                  <Box key={`${benefit}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 18, color: theme.palette.text.disabled, lineHeight: '20px' }}>•</Typography>
                    <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, lineHeight: 1.5, flex: 1 }}>
                      {benefit}
                    </Typography>
                    <Button size="small" variant="text" onClick={() => handleRemoveBenefit(idx)} sx={{ minWidth: 40, color: theme.palette.text.secondary }}>
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
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value.slice(0, 100))}
                onKeyDown={handleBenefitKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LuPlus size={18} color={theme.palette.icon.default} />
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
                onClick={handleAddBenefit}
                disabled={!benefitInput.trim()}
                sx={{ height: 30, borderRadius: 10 }}
              >
                입력
              </Button>
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
              예상 기간
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {COLLABORATION_DURATION_OPTIONS.map((option) => (
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

          {/* 작업 방식 */}
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
              진행 방식
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {WORK_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  icon={workTypeIconMap[option] as any}
                  onClick={() => setWorkType(workType === option ? '' : option)}
                  sx={{
                    backgroundColor: workType === option ? theme.palette.primary.main : theme.palette.grey[100],
                    color: workType === option ? '#fff' : '#000',
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 13,
                    flex: 1,
                    '& .MuiChip-icon': {
                      color: workType === option ? '#fff' : '#000',
                    },
                    '&:hover': {
                      backgroundColor: workType === option ? theme.palette.primary.main : theme.palette.grey[200],
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
                <LuPlus size={18} />
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

