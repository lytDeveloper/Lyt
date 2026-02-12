/**
 * Create Project Step 3
 * 필요한 스킬 선택 및 프로젝트 요약 + 생성
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Chip, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCreateProjectStore } from '../../stores/createProjectStore';
import CreateProjectProgressBar from '../../components/project/CreateProjectProgressBar';
import ActionResultModal from '../../components/common/ActionResultModal';
import { createProject, updateProject } from '../../services/projectService';
import Header, { } from '../../components/common/Header';
import { toast } from 'react-toastify';
import type { ProjectCategory } from '../../types/exploreTypes';
import PendingApprovalNotice from '../../components/common/PendingApprovalNotice';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import { useDebounce, useNavigationBlocker, useBeforeUnload } from '../../utils/draftHelpers';
import SaveDraftDialog from '../../components/common/SaveDraftDialog';
import { CATEGORY_LABELS, CATEGORY_VALUES } from '../../constants/projectConstants';
import { getSkillsByCategory } from '../../constants/skillTags';
import ActivityFieldKeywordPicker from '../../components/onboarding/ActivityFieldKeywordPicker';

export default function CreateProjectStep3() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { approvalStatus, isRestricted } = useBrandApprovalStatus();
  const {
    title,
    category,
    description,
    goal,
    requirements,
    coverImage,
    budget,
    duration,
    capacity,
    startDate,
    endDate,
    skills: storedSkills,
    draftProjectId,
    setStep3,
    reset,
  } = useCreateProjectStore();
  // Note: setDraftProjectId removed as it was unused

  const [skills, setSkills] = useState<string[]>(storedSkills);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const currentDraftIdRef = useRef<string | null>(draftProjectId);
  const skillOptions = useMemo(
    () => (category ? getSkillsByCategory(category) : []),
    [category]
  );
  
  // 표시할 키워드: 처음 9개 또는 전체
  const displayedSkills = useMemo(
    () => (showAllSkills ? skillOptions : skillOptions.slice(0, 9)),
    [skillOptions, showAllSkills]
  );
  const hasMoreSkills = skillOptions.length > 9;

  // Draft 프로젝트 ID 동기화
  useEffect(() => {
    if (draftProjectId && draftProjectId !== currentDraftIdRef.current) {
      currentDraftIdRef.current = draftProjectId;
    }
  }, [draftProjectId]);

  // 스토어에 저장하는 함수
  const saveToStore = () => {
    setStep3(skills);
  };

  // Debounced 자동 저장 (스토어에만 저장)
  const debouncedSave = useDebounce(saveToStore, 500);

  // 스킬 변경 시 자동 저장 (스토어에만 저장)
  useEffect(() => {
    if (skills.length > 0) {
      debouncedSave();
    }
  }, [skills, debouncedSave]);

  // 카테고리 변경 시 현재 선택 스킬을 유효한 옵션으로 제한 및 showAllSkills 초기화
  useEffect(() => {
    setSkills((prev) => prev.filter((skill) => skillOptions.includes(skill)));
    setShowAllSkills(false);
  }, [skillOptions]);

  // 저장되지 않은 변경사항이 있는지 확인
  const hasUnsavedChanges = skills.length > 0;

  // 페이지 이탈 감지 (React Router)
  const { showDialog, handleConfirm, handleCancel } = useNavigationBlocker(
    hasUnsavedChanges,
    saveToStore
  );

  // 브라우저 탭 닫기/새로고침 감지
  useBeforeUnload(hasUnsavedChanges, saveToStore);

  // 필수 입력 항목 검증
  const isFormValid = title && category && description && budget && duration && skills.length > 0;

  const handleToggleSkill = (skill: string) => {
    setSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      } else {
        return [...prev, skill];
      }
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCreateProject = async () => {
    try {
      setIsCreating(true);
      setStep3(skills);

      const resolvedCategory = category
        ? (CATEGORY_VALUES[category] ?? (category as ProjectCategory))
        : (category as ProjectCategory);

      const projectInput = {
        title,
        category: resolvedCategory,
        description,
        goal,
        requirements,
        cover_image_file: coverImage || undefined,
        budget,
        duration,
        capacity,
        skills,
        tags: skills,
        scheduled_start_date: startDate,
        scheduled_end_date: endDate,
      };

      const draftId = currentDraftIdRef.current;

      if (draftId) {
        // 기존 draft 업데이트 (status를 'open'으로 변경)
        await updateProject(draftId, projectInput);
      } else {
        // 새 프로젝트 생성
        await createProject(projectInput);
      }

      setShowSuccessModal(true);
      currentDraftIdRef.current = null;
      setSkills([]); // 생성 후 로컬 상태도 초기화해 다음 생성 시 선택이 남지 않도록
      reset(); // 스토어 초기화
    } catch (error) {
      console.error('[CreateProjectStep3] Error creating project:', error);
      toast.error(error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  if (isRestricted) {
    return (
      <>
        <PendingApprovalNotice status={approvalStatus === 'rejected' ? 'rejected' : 'pending'} />
        <BottomNavigationBar />
      </>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '768px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <Header showBackButton={true} onBackClick={handleBack} />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 상단 네비게이션 */}
        <Box
          sx={{
            padding: '24px 16px 16px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 2 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 700,
                fontSize: 20,
                color: '#111827',
              }}
            >
              새 프로젝트 만들기
            </Typography>
          </Box>

          {/* Progress Bar */}
          <CreateProjectProgressBar currentStep={3} />
        </Box>

        {/* Form Content */}
        <Box sx={{ padding: '24px 16px', flex: 1 }}>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 18,
              lineHeight: '28px',
              color: '#111827',
              marginBottom: 0.5,
            }}
          >
            키워드 선정 
          </Typography>

          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: '20px',
              color: '#4B5563',
              marginBottom: 3,
            }}
          >
            프로젝트를 나타낼 키워드를 선택해주세요 (복수 선택 가능)
          </Typography>

          {/* 스킬 선택 */}
          {category ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: 2,
                }}
              >
                {displayedSkills.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onClick={() => handleToggleSkill(skill)}
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 500,
                      fontSize: 12,
                      backgroundColor: skills.includes(skill) ? theme.palette.status.blue : theme.palette.grey[100],
                      color: skills.includes(skill) ? '#fff' : '#000',
                      borderRadius: '20px',
                      height: 36,
                      width: '30%',
                      cursor: 'pointer',
                      '&:focus': {
                        backgroundColor: skills.includes(skill) ? theme.palette.status.blue : theme.palette.grey[100],
                      },
                      '&.MuiChip-clickable:hover': {
                        backgroundColor: skills.includes(skill) ? theme.palette.status.blue : theme.palette.grey[100],
                      },
                    }}
                  />
                ))}
              </Box>

              {/* 더 보기 버튼 */}
              {!showAllSkills && hasMoreSkills && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Button
                    onClick={() => setShowAllSkills(true)}
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 500,
                      fontSize: 13,
                      color: theme.palette.text.secondary,
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    더 보기
                  </Button>
                </Box>
              )}

              {/* 더 보기 클릭 후: 직접 입력 영역 표시 */}
              {showAllSkills && (
                <ActivityFieldKeywordPicker
                  activityField={category}
                  maxSelection={0}
                  showSuggestions={false}
                  showRefresh={false}
                  alwaysShowManualInput={true}
                  showSelectedChips={false}
                  externalSelectedKeywords={skills}
                  onKeywordAdd={(keyword) => {
                    if (!skills.includes(keyword)) {
                      setSkills((prev) => [...prev, keyword]);
                    }
                  }}
                  onKeywordRemove={(keyword) => {
                    setSkills((prev) => prev.filter((s) => s !== keyword));
                  }}
                />
              )}

              {/* 선택된 키워드 표시 */}
              {skills.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', mt: 2, mb: 1 }}>
                  {skills.map((skill) => (
                    <Chip
                      key={skill}
                      label={skill}
                      onDelete={() => handleToggleSkill(skill)}
                      sx={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 500,
                        fontSize: 12,
                        backgroundColor: theme.palette.status.blue,
                        color: '#fff',
                        borderRadius: '20px',
                        height: 36,
                      }}
                    />
                  ))}
                </Box>
              )}
            </>
          ) : (
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: '#4B5563',
                marginBottom: 3,
              }}
            >
              카테고리를 먼저 선택해주세요.
            </Typography>
          )}

          {/* 프로젝트 요약 */}
          <Box
            sx={{
              backgroundColor: '#EFF6FF',
              borderRadius: '12px',
              padding: '16px',
              marginTop: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 600,
                fontSize: 14,
                lineHeight: '21px',
                color: '#111827',
                marginBottom: 1,
              }}
            >
              프로젝트 요약
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  제목:
                </Box>{' '}
                {title || '미입력'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  카테고리:
                </Box>{' '}
                {(() => {
                  const englishCategory = CATEGORY_VALUES[category] ?? (category as ProjectCategory | undefined);
                  if (!englishCategory) return '미선택';
                  return CATEGORY_LABELS[englishCategory as ProjectCategory] ?? category ?? '미선택';
                })()}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  목표:
                </Box>{' '}
                {goal || '미입력'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  요건:
                </Box>{' '}
                {requirements && requirements.length > 0 ? requirements.join(', ') : '미입력'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  예산:
                </Box>{' '}
                {budget || '미선택'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  기간:
                </Box>{' '}
                {duration || '미선택'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  협업자:
                </Box>{' '}
                {capacity}명
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#4B5563',
                }}
              >
                <Box component="span" sx={{ fontWeight: 500 }}>
                  스킬:
                </Box>{' '}
                {skills.length > 0 ? skills.join(', ') : '미선택'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 이전/프로젝트 생성 버튼 */}
      <Box sx={{ padding: '16px', borderTop: '1px solid #F3F4F6' }}>
        <Box sx={{ display: 'flex', gap: '16px' }}>
          <Button
            onClick={handleBack}
            disabled={isCreating}
            sx={{
              flex: 1,
              backgroundColor: theme.palette.grey[100],
              color: '#4B5563',
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              borderRadius: '20px',
              padding: '10px',
              '&:disabled': {
                backgroundColor: theme.palette.grey[100],
                opacity: 0.5,
              },
            }}
          >
            이전
          </Button>
          <Button
            onClick={handleCreateProject}
            disabled={isCreating || !isFormValid}
            sx={{
              flex: 1,
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              borderRadius: '20px',
              padding: '10px',
              '&:disabled': {
                backgroundColor: '#E5E7EB',
                color: theme.palette.text.secondary,
              },
            }}
          >
            {isCreating ? '생성 중...' : '프로젝트 생성'}
          </Button>
        </Box>
      </Box>

      {/* 완료 모달 */}
      <ActionResultModal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/explore?tab=projects', { state: { refresh: true } });
        }}
        title="프로젝트 생성 완료"
        description="프로젝트 준비 완료, 라잇 ON!"
        confirmLabel="확인"
        variant="success"
      />

      {/* 임시 저장 확인 다이얼로그 */}
      <SaveDraftDialog
        open={showDialog}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}
