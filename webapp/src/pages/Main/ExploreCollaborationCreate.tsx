import { useState, useEffect, useRef, useMemo, type ReactNode, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Chip,
  Button,
  useTheme,
  InputAdornment,
} from '@mui/material';
import {
  LuPlus,
  LuMinus,
  LuMonitor,
  LuMapPin,
  LuRefreshCcw,
} from 'react-icons/lu';
import {
  createCollaboration,
  updateCollaboration,
  loadDraftCollaboration,
  type CreateCollaborationInput
} from '../../services/collaborationService';
import {
  CATEGORY_VALUES,
  COLLABORATION_DURATION_OPTIONS,
  WORK_TYPE_OPTIONS,
  EXTENDED_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from '../../constants/projectConstants';
import { getSkillsByCategory } from '../../constants/skillTags';
import ActionResultModal from '../../components/common/ActionResultModal';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import Header from '../../components/common/Header';
import { useDebounce, useNavigationBlocker, useBeforeUnload } from '../../utils/draftHelpers';
import SaveDraftDialog from '../../components/common/SaveDraftDialog';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { LocationGrid, LocationButton } from '../onboarding/brand/Step5_BusinessInfo.styles';
import ActivityFieldKeywordPicker from '../../components/onboarding/ActivityFieldKeywordPicker';

// 지역 옵션
const REGION_OPTIONS = [
  '전체',
  '서울',
  '경기',
  '인천',
  '광주',
  '부산',
  '대구',
  '대전',
  '세종',
  '강원',
  '울산',
  '충북',
  '충남',
  '전북',
  '전남',
  '경남',
  '경북',
  '제주',
];


const COLLABORATION_DRAFT_STORAGE_KEY = 'collaboration_draft';
export default function ExploreCollaborationCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();

  // Form state
  const [title, setTitle] = useState('');
  //const [briefDescription, setBriefDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [category, setCategory] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [capacity, setCapacity] = useState(5);
  const [duration, setDuration] = useState('');
  const [workType, setWorkType] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Draft state
  const currentDraftIdRef = useRef<string | null>(searchParams.get('draftId'));

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAllSkills, setShowAllSkills] = useState(false);
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

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview('');
  };

  const handleSkillToggle = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddRequirement = () => {
    const value = requirementInput.trim();
    if (!value) return;
    setRequirements(prev => [...prev, value]);
    setRequirementInput('');
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBenefit = () => {
    const value = benefitInput.trim();
    if (!value) return;
    setBenefits(prev => [...prev, value]);
    setBenefitInput('');
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(prev => prev.filter((_, i) => i !== index));
  };

  const handleRequirementKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRequirement();
    }
  };

  const handleBenefitKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBenefit();
    }
  };

  const resetFormState = () => {
    setTitle('');
    setGoal('');
    setCategory('');
    setSelectedSkills([]);
    setCapacity(5);
    setDuration('');
    setWorkType('');
    setRequirements([]);
    setBenefits([]);
    setRequirementInput('');
    setBenefitInput('');
    setCoverFile(null);
    setCoverPreview('');
    setDescription('');
    setSelectedRegion(null);
    currentDraftIdRef.current = null;
    localStorage.removeItem(COLLABORATION_DRAFT_STORAGE_KEY);
  };

  // URL에서 draftId 가져오기
  useEffect(() => {
    const draftIdFromUrl = searchParams.get('draftId');
    if (draftIdFromUrl && draftIdFromUrl !== currentDraftIdRef.current) {
      currentDraftIdRef.current = draftIdFromUrl;
    }
  }, [searchParams]);

  // Draft 협업 로드 (DB 또는 localStorage)
  useEffect(() => {
    const loadDraft = async () => {
      const draftId = currentDraftIdRef.current;

      // 이미 데이터가 있으면 로드하지 않음
      if (title || category) {
        return;
      }

      // DB에서 로드 (draftId가 있는 경우)
      if (draftId) {
        try {
          const draftData = await loadDraftCollaboration(draftId);
          if (draftData) {
            setTitle(draftData.title || '');
            //setBriefDescription(draftData.briefDescription || '');
            setGoal(draftData.goal || '');
            setCategory(draftData.category || '');
            setSelectedSkills(draftData.skills || []);
            setCapacity(draftData.capacity || 5);
            setDuration(draftData.duration || '');
            setWorkType(draftData.workType || '');
            setRequirements(Array.isArray(draftData.requirements) ? draftData.requirements : []);
            setBenefits(Array.isArray(draftData.benefits) ? draftData.benefits : []);
            setRequirementInput('');
            setBenefitInput('');
            setSelectedRegion(draftData.region || null);
            // coverFile은 URL이므로 File로 변환 불가능, 나중에 처리
            if (draftData.id) {
              // cover_image_url을 preview로 설정하려면 별도 처리 필요
            }
            return; // DB에서 로드했으면 localStorage는 로드하지 않음
          }
        } catch (error) {
          console.error('[ExploreCollaborationCreate] Failed to load draft from DB:', error);
        }
      }

      // localStorage에서 로드 (DB 로드 실패 또는 draftId가 없는 경우)
      try {
        const stored = localStorage.getItem(COLLABORATION_DRAFT_STORAGE_KEY);
        if (stored) {
          const draftData = JSON.parse(stored);
          setTitle(draftData.title || '');
          //setBriefDescription(draftData.briefDescription || '');
          setGoal(draftData.goal || '');
          setCategory(draftData.category || '');
          setSelectedSkills(draftData.selectedSkills || []);
          setCapacity(draftData.capacity || 5);
          setDuration(draftData.duration || '');
          setWorkType(draftData.workType || '');
          setRequirements(Array.isArray(draftData.requirements)
            ? draftData.requirements
            : typeof draftData.requirements === 'string'
              ? draftData.requirements.split('\n').filter((r: string) => r.trim())
              : []);
          setBenefits(Array.isArray(draftData.benefits)
            ? draftData.benefits
            : typeof draftData.benefits === 'string'
              ? draftData.benefits.split('\n').filter((b: string) => b.trim())
              : []);
          setRequirementInput(draftData.requirementInput || '');
          setBenefitInput(draftData.benefitInput || '');
          setCoverPreview(draftData.coverPreview || '');
          setSelectedRegion(draftData.selectedRegion || null);
        }
      } catch (error) {
        console.error('[ExploreCollaborationCreate] Failed to load draft from localStorage:', error);
      }
    };

    loadDraft();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // localStorage에 저장하는 함수
  const saveToStorage = () => {
    const draftData = {
      title,
      //briefDescription,
      description,
      goal,
      category,
      selectedSkills,
      capacity,
      duration,
      workType,
      requirements,
      benefits,
      requirementInput,
      benefitInput,
      // coverFile은 File 객체이므로 저장할 수 없음 (preview만 저장)
      coverPreview,
      selectedRegion,
    };
    try {
      localStorage.setItem(COLLABORATION_DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.error('[ExploreCollaborationCreate] Failed to save to localStorage:', error);
    }
  };

  // Debounced 자동 저장 (localStorage에만 저장)
  const debouncedSave = useDebounce(saveToStorage, 500);

  // 입력 변경 시 자동 저장 (localStorage에만 저장)
  useEffect(() => {
    if (title || //briefDescription || 
      goal || category || selectedSkills.length > 0 || duration || workType || requirements.length > 0 || benefits.length > 0 || requirementInput || benefitInput || selectedRegion) {
      debouncedSave();
    }
  }, [title, //briefDescription, 
    goal, category, selectedSkills, capacity, duration, workType, requirements, benefits, requirementInput, benefitInput, selectedRegion, debouncedSave]);

  // 저장되지 않은 변경사항이 있는지 확인
  const hasUnsavedChanges = !!(title || //briefDescription || 
    goal || category || selectedSkills.length > 0 || duration || workType || requirements.length > 0 || benefits.length > 0 || requirementInput || benefitInput || coverFile || selectedRegion);

  // 카테고리 변경 시 선택 스킬을 유효 옵션으로 정리 및 showAllSkills 초기화
  useEffect(() => {
    setSelectedSkills((prev) => prev.filter((s) => skillOptions.includes(s)));
    setShowAllSkills(false);
  }, [skillOptions]);

  // 페이지 이탈 감지 (React Router)
  const { showDialog, handleConfirm, handleCancel } = useNavigationBlocker(
    hasUnsavedChanges,
    saveToStorage
  );

  // 브라우저 탭 닫기/새로고침 감지
  useBeforeUnload(hasUnsavedChanges, saveToStorage);

  const sectionCardSx = {
    mb: 4,
    // 상단 타이틀 영역보다 살짝 더 안쪽으로 들어오도록 양옆 패딩 추가
    px: { xs: 1.5, sm: 2 },
  };

  const labellarge = {
    fontSize: '18px',
    fontWeight: 600,
    color: theme.palette.text.primary,
  };
  const labellargeSub = {
    fontSize: '14px',
    fontWeight: 400,
    color: theme.palette.text.secondary,
    mb: 2,
  };
  const labelMedium = {
    fontSize: '14px',
    fontWeight: 500,
    color: theme.palette.text.primary,
    mb: 1, mt: 1
  };

  const countTextSx = {
    fontSize: '12px',
    fontWeight: 400,
    color: theme.palette.text.secondary,
    textAlign: 'right' as const,
    mt: 0.5,
  };

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,

      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
      '& fieldset': {
        borderColor: theme.palette.mode === 'dark' ? '#374151' : '#e2e8f0',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#2563eb',
        boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
      },
    },
    '& .MuiOutlinedInput-input': {
      fontSize: '15px',
      color: theme.palette.text.primary,

    },
  };

  const textFieldSs = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      height: 40,

      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
      '& fieldset': {
        borderColor: theme.palette.mode === 'dark' ? '#374151' : '#e2e8f0',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#2563eb',
        boxShadow: '0px 3px 5px rgba(0,0,0,0.04)',
      },
    },
    '& .MuiOutlinedInput-input': {
      fontSize: '15px',
      color: theme.palette.text.primary,

    },
  };

  const getChipStyles = (isActive: boolean, tone: 'neutral' | 'primary' = 'neutral') => {
    const isDark = theme.palette.mode === 'dark';
    const palette = tone === 'neutral'
      ? {
        border: 'none',
        bg: isActive ? theme.palette.primary.main : (isDark ? '#2d3748' : theme.palette.grey[100]),
        color: isActive ? theme.palette.primary.contrastText : (isDark ? '#cbd5e1' : theme.palette.text.primary),
      }
      : {
        border: 'none',
        bg: isActive ? theme.palette.primary.main : (isDark ? '#1a202c' : theme.palette.grey[100]),
        color: isActive ? theme.palette.primary.contrastText : (isDark ? '#cbd5e1' : theme.palette.text.primary),
      };

    return {
      borderRadius: '999px',
      bgcolor: palette.bg,
      border: `1px solid ${palette.border}`,
      color: palette.color,
      fontWeight: 500,
      height: 36,
      fontSize: '12px',
      width: '30%',
      textAlign: 'center',
      '&:focus': {
        bgcolor: palette.bg,
      },
      '&.MuiChip-clickable:hover': {
        bgcolor: palette.bg,
      },
    };
  };

  const workTypeIconMap: Record<string, ReactNode> = {
    온라인: <LuMonitor size={18} />,
    오프라인: <LuMapPin size={18} />,
    '온오프라인 병행': <LuRefreshCcw size={18} />,
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      alert('제목을 입력해주세요');
      return;
    }
    // if (!briefDescription.trim()) {
    //   alert('상세 설명을 입력해주세요');
    //   return;
    // }
    if (!category) {
      alert('카테고리를 선택해주세요');
      return;
    }
    if (selectedSkills.length === 0) {
      alert('필요 스킬을 최소 1개 선택해주세요');
      return;
    }
    if (!duration) {
      alert('예상 기간을 선택해주세요');
      return;
    }
    if (!workType) {
      alert('진행 방식을 선택해주세요');
      return;
    }
    if (!coverFile) {
      alert('커버 이미지를 업로드해주세요');
      return;
    }

    // coverFile이 없으면 생성 불가 (draft가 아닌 경우)
    if (!coverFile && !currentDraftIdRef.current) {
      alert('커버 이미지를 업로드해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateCollaborationInput = {
        title: title.trim(),
        description: description.trim(),
        goal: goal.trim(),
        category: CATEGORY_VALUES[category],
        skills: selectedSkills,
        requirements,
        benefits,
        capacity,
        duration,
        workType,
        tags: selectedSkills,
        coverFile: coverFile!,
        region: selectedRegion === '전체' ? 'all' : selectedRegion,
      };

      const draftId = currentDraftIdRef.current;
      if (draftId) {
        // 기존 draft 업데이트 (status를 'open'으로 변경)
        // coverFile이 없으면 기존 이미지 유지
        if (!coverFile) {
          // coverFile 없이 업데이트하려면 별도 처리 필요
          // 일단 coverFile이 필수이므로 에러 처리
          throw new Error('커버 이미지는 필수입니다');
        }
        await updateCollaboration(draftId, input);
      } else {
        // 새 협업 생성
        await createCollaboration(input);
      }
      setShowSuccessModal(true);
      // 성공 시 localStorage에서 draft 데이터 삭제
      resetFormState();
    } catch (error) {
      console.error('협업 생성 실패:', error);
      setErrorMessage(error instanceof Error ? error.message : '협업 생성에 실패했습니다');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    title.trim() &&
    //briefDescription.trim() &&
    description.trim() &&
    category &&
    selectedSkills.length > 0 &&
    duration &&
    workType &&
    coverFile;

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        // Header와 동일한 톤으로 배경 통일
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Header */}
      <Header showBackButton onBackClick={() => navigate(-1)} />

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          // 별도 회색 배경 대신 페이지 전체를 하나의 흰 배경 톤으로 유지
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Box
          sx={{
            maxWidth: 640,
            mx: 'auto',
            width: '100%',
            p: { xs: 3, sm: 4 },
            // 하단 네비게이션에 가려지지 않도록 충분한 여백 확보
            pb: 14,
          }}
        >
          <Typography sx={{ fontSize: '20px', fontWeight: 700, mb: 0.5, color: theme.palette.text.primary }}>
            협업 생성하기
          </Typography>
          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, mb: 3 }}>
            새로운 협업을 시작해보세요
          </Typography>

          {/* 기본 정보 */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={labellarge}>
              기본 정보
            </Typography>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>
                제목 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                placeholder="협업 제목을 입력해 주세요"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                sx={textFieldSx}
              />
              <Typography sx={countTextSx}>{title.length}/50</Typography>
            </Box>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>
                상세 설명 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="협업에 대한 자세한 설명을 작성해 주세요"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                sx={textFieldSx}
              />
              <Typography sx={countTextSx}>{description.length}/500</Typography>
            </Box>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>협업 목표</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="협업의 목표를 입력해 주세요"
                value={goal}
                onChange={(e) => setGoal(e.target.value.slice(0, 300))}
                sx={textFieldSx}
              />
              <Typography sx={countTextSx}>{goal.length}/300</Typography>
            </Box>
          </Box>

          {/* 협업 타입 (기존 디자인 유지) 보류...*/}
          {/* <Box sx={sectionCardSx}>
            <Typography sx={labelMedium}>
              협업 타입 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 6, mt: 3 }}>
              {Object.entries(COLLABORATION_TYPE_VALUES).map(([label, value]) => (
                <Button
                  key={value}
                  variant={collaboType === label ? 'contained' : 'outlined'}
                  onClick={() => setCollaboType(label)}
                  sx={{
                    flex: 1,
                    height: 100,
                    flexDirection: 'column',
                    gap: 1,
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: collaboType === label ? theme.palette.primary.main : theme.palette.grey[100],
                    color: collaboType === label ? '#fff' : theme.palette.icon.default,
                  }}
                >
                  {value === 'long_term' && <HourglassFullOutlinedIcon sx={{ fontSize: 28 }} />}
                  {value === 'short_term' && <HourglassBottomOutlinedIcon sx={{ fontSize: 28 }} />}
                  {value === 'project_based' && <AllInclusiveOutlinedIcon sx={{ fontSize: 28 }} />}
                  <Typography sx={{ fontSize: '14px' }}>{label}</Typography>
                </Button>
              ))}
            </Box>
          </Box> */}

          {/* 카테고리 */}
          <Box sx={sectionCardSx}>
            <Typography sx={labelMedium}>
              카테고리 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '26px 12px',
                mt: 3,
                mb: 6,
              }}
            >
              {EXTENDED_CATEGORIES.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat];
                const categoryLabel = CATEGORY_LABELS[cat];
                return (
                  <Button
                    key={cat}
                    onClick={() => setCategory(categoryLabel)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                      borderRadius: '20px',
                      color: category === categoryLabel ? '#fff' : '#000',
                      backgroundColor: category === categoryLabel ? theme.palette.status.blue : theme.palette.background.paper,
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
                        color: category === categoryLabel ? '#fff' : '#000',
                      }}
                    >
                      {categoryLabel}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* 키워드 선정 */}
          <Box sx={sectionCardSx}>
            <Typography sx={labelMedium}>
              키워드 선정 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
            </Typography>
            {category ? (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3, mb: 2 }}>
                  {displayedSkills.map((skill) => (
                    <Chip
                      key={skill}
                      label={skill}
                      onClick={() => handleSkillToggle(skill)}
                      sx={getChipStyles(selectedSkills.includes(skill), 'primary')}
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
                    externalSelectedKeywords={selectedSkills}
                    onKeywordAdd={(keyword) => {
                      if (!selectedSkills.includes(keyword)) {
                        setSelectedSkills((prev) => [...prev, keyword]);
                      }
                    }}
                    onKeywordRemove={(keyword) => {
                      setSelectedSkills((prev) => prev.filter((s) => s !== keyword));
                    }}
                  />
                )}

                {/* 선택된 키워드 표시 */}
                {selectedSkills.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, mb: 4 }}>
                    {selectedSkills.map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        onDelete={() => handleSkillToggle(skill)}
                        sx={{
                          borderRadius: '999px',
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          fontWeight: 500,
                          height: 36,
                          fontSize: '12px',
                        }}
                      />
                    ))}
                  </Box>
                )}
              </>
            ) : (
              <Typography sx={{ fontSize: '14px', color: theme.palette.text.secondary, mt: 0, mb: 6 }}>
                카테고리를 먼저 선택해 주세요.
              </Typography>
            )}
          </Box>

          {/* 설정 */}
          <Box>
            <Typography sx={labellarge}>
              설정
            </Typography>
            <Typography sx={labellargeSub}>
              모집 인원과 진행 방식 정보를 입력해 주세요.
            </Typography>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>
                모집 인원
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6, mt: 3, }}>
                <IconButton
                  onClick={() => setCapacity(Math.max(1, capacity - 1))}
                  sx={{
                    // border: `1px solid ${theme.palette.mode === 'dark' ? '#4b5563' : '#e2e8f0'}`,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    color: theme.palette.text.primary,
                    bgcolor: theme.palette.grey[50],
                  }}
                >
                  <LuMinus />
                </IconButton>
                <Typography sx={{ fontSize: '20px', fontWeight: 700, minWidth: 70, textAlign: 'center', color: theme.palette.text.primary }}>
                  {capacity}명
                </Typography>
                <IconButton
                  onClick={() => setCapacity(Math.min(100, capacity + 1))}
                  sx={{
                    // border: `1px solid ${theme.palette.mode === 'dark' ? '#4b5563' : '#e2e8f0'}`,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    color: theme.palette.text.primary,
                    bgcolor: theme.palette.grey[50],
                  }}
                >
                  <LuPlus />
                </IconButton>
              </Box>
            </Box>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>
                예상 기간 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 6, mt: 3, }}>
                {COLLABORATION_DURATION_OPTIONS.map((dur) => (
                  <Chip
                    key={dur}
                    label={dur}
                    onClick={() => setDuration(dur)}
                    sx={getChipStyles(duration === dur, 'neutral')}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>
                진행 방식 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 6, mt: 3, }}>
                {WORK_TYPE_OPTIONS.map((type) => {
                  const isActive = workType === type;
                  return (
                    <Button
                      key={type}
                      onClick={() => setWorkType(type)}
                      variant={isActive ? 'contained' : 'outlined'}
                      startIcon={workTypeIconMap[type]}
                      sx={{
                        justifyContent: 'flex-start',
                        borderRadius: 15,
                        // borderColor: isActive ? '#2563eb' : (theme.palette.mode === 'dark' ? '#4b5563' : '#e2e8f0'),
                        border: 'none',
                        bgcolor: isActive ? '#2563eb' : (theme.palette.mode === 'dark' ? '#1a202c' : theme.palette.grey[100]),
                        color: isActive ? '#fff' : theme.palette.text.primary,
                        height: 52,
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {type}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* 활동 지역 */}
          <Box sx={sectionCardSx}>
            <Typography sx={labelMedium}>활동 지역</Typography>
            <LocationGrid sx={{ mt: 2, mb: 4 }}>
              {REGION_OPTIONS.map((region) => (
                <LocationButton
                  key={region}
                  selected={selectedRegion === region}
                  onClick={() => setSelectedRegion(region)}
                >
                  {region}
                </LocationButton>
              ))}
            </LocationGrid>
          </Box>

          {/* 추가 정보 */}
          <Box>
            <Typography sx={labellarge}>
              추가 정보
            </Typography>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>참여 요건</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1 }}>
                {requirements.length === 0 ? (
                  <Typography sx={{ fontSize: '14px', color: theme.palette.text.secondary }}>
                    조건을 추가해 주세요.
                  </Typography>
                ) : (
                  requirements.map((req, idx) => (
                    <Box key={`${req}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '18px', color: theme.palette.text.disabled, lineHeight: '20px' }}>•</Typography>
                      <Typography sx={{ fontSize: '14px', color: theme.palette.text.primary, lineHeight: 1.5, flex: 1 }}>
                        {req}
                      </Typography>
                      <Button size="small" variant="text" onClick={() => handleRemoveRequirement(idx)} sx={{ minWidth: 40, color: theme.palette.text.secondary }}>
                        삭제
                      </Button>
                    </Box>
                  ))
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
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
                  sx={textFieldSs}
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
              <Typography sx={countTextSx}>{requirements.length}개 추가됨</Typography>
            </Box>

            <Box sx={sectionCardSx}>
              <Typography sx={labelMedium}>혜택</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 1 }}>
                {benefits.length === 0 ? (
                  <Typography sx={{ fontSize: '14px', color: theme.palette.text.secondary }}>
                    혜택을 추가해 주세요.
                  </Typography>
                ) : (
                  benefits.map((benefit, idx) => (
                    <Box key={`${benefit}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '18px', color: theme.palette.text.disabled, lineHeight: '20px' }}>•</Typography>
                      <Typography sx={{ fontSize: '14px', color: theme.palette.text.primary, lineHeight: 1.5, flex: 1 }}>
                        {benefit}
                      </Typography>
                      <Button size="small" variant="text" onClick={() => handleRemoveBenefit(idx)} sx={{ minWidth: 40, color: theme.palette.text.secondary }}>
                        삭제
                      </Button>
                    </Box>
                  ))
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
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
                  sx={textFieldSs}
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
              <Typography sx={countTextSx}>{benefits.length}개 추가됨</Typography>
            </Box>
          </Box>

          {/* 커버 이미지 (기존 디자인 유지) */}
          <Typography sx={labellarge}>
            커버 이미지 <Typography component="span" sx={{ color: '#ef4444' }}>*</Typography>
          </Typography>
          <Typography sx={labellargeSub}>
            이미지 16:9 비율 권장
          </Typography>

          {coverPreview ? (
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Box
                component="img"
                src={coverPreview}
                alt="Cover preview"
                sx={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.mode === 'dark' ? '#4b5563' : '#ddd'}`,
                }}
              />
              <IconButton
                onClick={handleRemoveCover}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 24,
                  height: 24,
                  padding: 0,
                  bgcolor: theme.palette.transparent.white,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${theme.palette.transparent.white}`,
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 20, color: theme.palette.icon.default }} />
              </IconButton>
            </Box>
          ) : (
            <Button
              component="label"
              variant="outlined"
              fullWidth
              sx={{
                height: 200,
                border: `2px dashed ${theme.palette.mode === 'dark' ? '#4b5563' : '#ddd'}`,
                borderRadius: 2,
                flexDirection: 'column',
                gap: 2,
                mb: 3,
                color: theme.palette.text.secondary,
              }}
            >
              <CloudUploadOutlinedIcon sx={{ fontSize: 30, color: theme.palette.icon.inner }} />
              <Typography sx={{ fontSize: '14px', color: theme.palette.text.secondary }}>
                PDF, DOC, XLS, PPT, 이미지, 압축파일 등
              </Typography>
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleCoverFileChange}
              />
            </Button>
          )}

          {/* Footer Button - 스크롤 영역 안으로 이동 */}
          <Box
            sx={{
              mt: 4,
              // 하단 네비게이션과 겹치지 않도록 충분한 여백 확보
              mb: '70px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              sx={{
                height: 40,
                fontSize: '15px',
                fontWeight: 500,
                borderRadius: 16,
                width: '70%',
              }}
            >
              {isSubmitting ? '생성 중...' : '생성하기'}
            </Button>
            <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, textAlign: 'center', mt: 1 }}>
              생성된 협업은 탐색 페이지에서 확인할 수 있습니다
            </Typography>
          </Box>
        </Box>
      </Box>
      <BottomNavigationBar />
      {/* Success Modal */}
      <ActionResultModal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/explore?tab=collaborations', { state: { refresh: true } });
        }}
        title="협업 생성 완료"
        description="협업 준비 완료, 라잇 ON!"
        confirmLabel="확인"
        variant="success"
      />

      {/* Error Modal */}
      <ActionResultModal
        open={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="협업 생성 실패"
        description={errorMessage}
        confirmLabel="확인"
        variant="warning"
      />

      {/* 임시 저장 확인 다이얼로그 */}
      <SaveDraftDialog
        open={showDialog}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box >
  );
}
