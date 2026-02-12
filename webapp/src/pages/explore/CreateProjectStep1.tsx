/**
 * Create Project Step 1
 * 프로젝트 기본 정보 입력 (제목, 카테고리, 설명)
 */

import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Button, useTheme, InputAdornment } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateProjectStore } from '../../stores/createProjectStore';
import CreateProjectProgressBar from '../../components/project/CreateProjectProgressBar';
import { EXTENDED_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_VALUES } from '../../constants/projectConstants';
import Header from '../../components/common/Header';
import PendingApprovalNotice from '../../components/common/PendingApprovalNotice';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import { loadDraftProject } from '../../services/projectService';
import { useDebounce, useNavigationBlocker, useBeforeUnload } from '../../utils/draftHelpers';
import { toast } from 'react-toastify';
import SaveDraftDialog from '../../components/common/SaveDraftDialog';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { LuPlus } from 'react-icons/lu';

export default function CreateProjectStep1() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    title: storedTitle,
    category: storedCategory,
    description: storedDescription,
    goal: storedGoal,
    coverImage: storedCoverImage,
    draftProjectId,
    requirements: storedRequirements,
    setStep1,
    setDraftProjectId
  } = useCreateProjectStore();
  const { approvalStatus, isRestricted } = useBrandApprovalStatus();

  const [title, setTitle] = useState(storedTitle);
  const [category, setCategory] = useState(storedCategory);
  const [description, setDescription] = useState(storedDescription);
  const [goal, setGoal] = useState(storedGoal);
  const [coverImage, setCoverImage] = useState<File | null>(storedCoverImage || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<string[]>(storedRequirements || []);
  const [requirementInput, setRequirementInput] = useState('');
  const [_isLoadingDraft, setIsLoadingDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentDraftIdRef = useRef<string | null>(draftProjectId || searchParams.get('draftId'));

  // URL에서 draftId 가져오기
  useEffect(() => {
    const draftIdFromUrl = searchParams.get('draftId');
    if (draftIdFromUrl && draftIdFromUrl !== currentDraftIdRef.current) {
      currentDraftIdRef.current = draftIdFromUrl;
      setDraftProjectId(draftIdFromUrl);
    }
  }, [searchParams, setDraftProjectId]);

  // Draft 프로젝트 로드
  useEffect(() => {
    const loadDraft = async () => {
      const draftId = currentDraftIdRef.current;
      if (!draftId) {
        return;
      }

      // 이미 데이터가 있으면 로드하지 않음 (스토어에 저장된 데이터가 있으면)
      if (storedTitle || storedCategory || storedDescription || storedGoal) {
        return;
      }

      setIsLoadingDraft(true);
      try {
        const draftData = await loadDraftProject(draftId);
        if (draftData) {
          // 영어 카테고리 값을 한국어 라벨로 변환
          const categoryLabel = draftData.category
            ? Object.keys(CATEGORY_VALUES).find(key => CATEGORY_VALUES[key] === draftData.category) || ''
            : '';

          setTitle(draftData.title || '');
          setCategory(categoryLabel);
          setDescription(draftData.description || '');
          setGoal(draftData.goal || '');
          const draftRequirements = Array.isArray((draftData as any)?.requirements)
            ? (draftData as any).requirements
            : [];
          setRequirements(draftRequirements);
          // coverImage는 URL이므로 File로 변환 불가능, previewUrl만 설정
          if (draftData.cover_image_url) {
            setPreviewUrl(draftData.cover_image_url);
          }
          // 스토어에도 저장
          setStep1(
            draftData.title || '',
            categoryLabel,
            draftData.description || '',
            draftData.goal || '',
            null, // File은 로드할 수 없음
            draftRequirements
          );
        }
      } catch (error) {
        console.error('[CreateProjectStep1] Failed to load draft:', error);
        toast.error('작성중인 프로젝트를 불러오는데 실패했습니다');
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Store에 저장된 coverImage가 있으면 previewUrl 생성
  useEffect(() => {
    if (storedCoverImage) {
      const url = URL.createObjectURL(storedCoverImage);
      setPreviewUrl(url);

      // cleanup: 이전 URL 정리
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (!previewUrl) {
      // storedCoverImage가 없고 previewUrl도 없으면 null로 설정
      setPreviewUrl(null);
    }
  }, [storedCoverImage]); // eslint-disable-line react-hooks/exhaustive-deps

  // 스토어에 저장하는 함수
  const saveToStore = () => {
    setStep1(title, category, description, goal, coverImage, requirements);
  };

  // Debounced 자동 저장 (스토어에만 저장)
  const debouncedSave = useDebounce(saveToStore, 500);

  // 입력 변경 시 자동 저장 (스토어에만 저장)
  useEffect(() => {
    if (title || category || description || goal || coverImage || requirements.length > 0) {
      debouncedSave();
    }
  }, [title, category, description, goal, coverImage, requirements, debouncedSave]);

  // 저장되지 않은 변경사항이 있는지 확인
  const hasUnsavedChanges = !!(title || category || description || goal || coverImage || requirements.length > 0 || requirementInput);

  // 페이지 이탈 감지 (React Router)
  const { showDialog, handleConfirm, handleCancel } = useNavigationBlocker(
    hasUnsavedChanges,
    saveToStore
  );

  // 브라우저 탭 닫기/새로고침 감지
  useBeforeUnload(hasUnsavedChanges, saveToStore);

  const handleNext = () => {
    if (!title || !category || !description) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    setStep1(title, category, description, goal, coverImage, requirements);
    navigate('/explore/project/create/step2');
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 이전 previewUrl 정리 (메모리 누수 방지)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setCoverImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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

  if (isRestricted) {
    return (
      <>
        <PendingApprovalNotice status={approvalStatus === 'rejected' ? 'rejected' : 'pending'} />
        <BottomNavigationBar />
      </>
    );
  }

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      height: 40,
      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
      '& fieldset': {
        borderColor: theme.palette.mode === 'dark' ? '#374151' : '#e2e8f0',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#2563eb',
        boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.08)',
      },
    },
    '& .MuiOutlinedInput-input': {
      fontSize: '15px',
      color: theme.palette.text.primary,
    },
  };

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
          <CreateProjectProgressBar currentStep={1} />
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
              marginBottom: 2,
            }}
          >
            프로젝트 기본 정보
          </Typography>

          {/* 프로젝트 제목 */}
          <Box sx={{ marginBottom: 2 }}>
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
              프로젝트 제목
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
          <Box sx={{ marginTop: 2, marginBottom: 2 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: '#374151',
                marginBottom: 1,
              }}
            >
              카테고리 선택
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
                return (
                  <Button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                      borderRadius: '20px',
                      color: category === cat ? '#fff' : '#000',
                      backgroundColor: category === cat ? theme.palette.status.blue : theme.palette.background.paper,
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
                        color: category === cat ? '#fff' : '#000',
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* 프로젝트 설명 */}
          <Box sx={{ marginTop: 2 }}>
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
              프로젝트 설명
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
          <Box sx={{ marginTop: 2 }}>
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
          <Box sx={{ marginTop: 2 }}>
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, marginTop: 1.5 }}>
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
                sx={textFieldSx}
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
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, marginTop: 0.5, textAlign: 'right' }}>
              {requirements.length}개 추가됨
            </Typography>
          </Box>


          {/* 프로젝트 커버 이미지 */}
          <Box sx={{ marginTop: 3 }}>
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

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
              style={{ display: 'none' }}
            />

            <Box
              onClick={handleUploadClick}
              sx={{
                width: '100%',
                height: '160px', // Aspect ratio roughly 16:9 for mobile width? Or fixed height.
                border: '2px dashed #E5E7EB',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {previewUrl ? (
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Cover Preview"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <>
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
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 400,
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    PDF, DOC, XLS, PPT, 이미지, 압축파일 등
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 다음 버튼 */}
      <Box sx={{ padding: '16px' }}>
        <Button
          onClick={handleNext}
          disabled={!title || !category || !description}
          fullWidth
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 500,
            fontSize: 14,
            textTransform: 'none',
            borderRadius: '20px',
            padding: '10px',
            '&:disabled': {
              backgroundColor: theme.palette.divider,
              color: theme.palette.text.secondary,
            },
            width: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          다음
        </Button>
      </Box>

      {/* 임시 저장 확인 다이얼로그 */}
      <SaveDraftDialog
        open={showDialog}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}
