/**
 * Create Project Step 2
 * 프로젝트 조건 입력 (예산, 기간, 협업자 수)
 */

import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, IconButton, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useCreateProjectStore } from '../../stores/createProjectStore';
import CreateProjectProgressBar from '../../components/project/CreateProjectProgressBar';
import { BUDGET_OPTIONS, DURATION_OPTIONS } from '../../constants/projectConstants';
import Header, { } from '../../components/common/Header';
import PendingApprovalNotice from '../../components/common/PendingApprovalNotice';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import { useBrandApprovalStatus } from '../../hooks/useBrandApprovalStatus';
import { loadDraftProject } from '../../services/projectService';
import { useDebounce, useNavigationBlocker, useBeforeUnload } from '../../utils/draftHelpers';
import SaveDraftDialog from '../../components/common/SaveDraftDialog';
import DatePickerModal from '../../components/common/DatePickerModal';

const formatDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addMonths = (date: Date, months: number) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

export default function CreateProjectStep2() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { approvalStatus, isRestricted } = useBrandApprovalStatus();
  const {
    budget: storedBudget,
    duration: storedDuration,
    capacity: storedCapacity,
    startDate: storedStartDate,
    endDate: storedEndDate,
    draftProjectId,
    setStep2,
  } = useCreateProjectStore();
  // Note: setDraftProjectId removed as it was unused

  const [budget, setBudget] = useState(storedBudget);
  const [duration, setDuration] = useState(storedDuration);
  const [capacity, setCapacity] = useState(storedCapacity || 1);

  const todayRef = useRef(formatDateString(new Date()));

  const defaultStartDate = storedStartDate || todayRef.current;
  const safeStartDate = (() => {
    const parsed = new Date(defaultStartDate);
    return isNaN(parsed.getTime()) ? todayRef.current : defaultStartDate;
  })();

  const defaultEndDate = (() => {
    if (storedEndDate) return storedEndDate;
    const base = new Date(safeStartDate);
    const plusOneMonth = addMonths(base, 1);
    return formatDateString(plusOneMonth);
  })();

  const [startDate, setStartDate] = useState(safeStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [endDateModalOpen, setEndDateModalOpen] = useState(false);

  const currentDraftIdRef = useRef<string | null>(draftProjectId);

  // Draft 프로젝트 ID 동기화
  useEffect(() => {
    if (draftProjectId && draftProjectId !== currentDraftIdRef.current) {
      currentDraftIdRef.current = draftProjectId;
    }
  }, [draftProjectId]);

  // Draft 프로젝트 로드 (날짜 정보)
  useEffect(() => {
    const loadDraft = async () => {
      const draftId = currentDraftIdRef.current;
      if (!draftId || storedStartDate || storedEndDate) {
        // 이미 데이터가 있으면 로드하지 않음
        return;
      }

      try {
        const draftData = await loadDraftProject(draftId);
        if (draftData) {
          if (draftData.scheduled_start_date) {
            const start = new Date(draftData.scheduled_start_date);
            setStartDate(formatDateString(start));
          }
          if (draftData.scheduled_end_date) {
            const end = new Date(draftData.scheduled_end_date);
            setEndDate(formatDateString(end));
          }
        }
      } catch (error) {
        console.error('[CreateProjectStep2] Failed to load draft:', error);
        // 조용히 처리 (에러 표시하지 않음)
      }
    };

    loadDraft();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 스토어에 저장하는 함수
  const saveToStore = () => {
    setStep2(budget, duration, capacity, startDate, endDate);
  };

  // Debounced 자동 저장 (스토어에만 저장)
  const debouncedSave = useDebounce(saveToStore, 500);

  // 입력 변경 시 자동 저장 (스토어에만 저장)
  useEffect(() => {
    if (budget || duration || capacity) {
      debouncedSave();
    }
  }, [budget, duration, capacity, startDate, endDate, debouncedSave]);

  // 저장되지 않은 변경사항이 있는지 확인
  const hasUnsavedChanges = !!(budget || duration || capacity);

  // 페이지 이탈 감지 (React Router)
  const { showDialog, handleConfirm, handleCancel } = useNavigationBlocker(
    hasUnsavedChanges,
    saveToStore
  );

  // 브라우저 탭 닫기/새로고침 감지
  useBeforeUnload(hasUnsavedChanges, saveToStore);

  const handleNext = () => {
    if (!budget || !duration) {
      alert('예산 범위와 프로젝트 기간을 선택해주세요.');
      return;
    }

    // 날짜 유효성 검사
    if (!startDate || !endDate) {
      alert('프로젝트 시작일과 종료일을 선택해주세요.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('올바른 날짜를 입력해주세요.');
      return;
    }

    if (start < startOfToday) {
      alert('시작일은 오늘보다 과거일 수 없어요.');
      return;
    }

    if (end < start) {
      alert('종료일은 시작일보다 빠를 수 없어요.');
      return;
    }

    setStep2(budget, duration, capacity, startDate, endDate);
    navigate('/explore/project/create/step3');
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleIncreaseCapacity = () => {
    setCapacity((prev) => prev + 1);
  };

  const handleDecreaseCapacity = () => {
    if (capacity > 1) {
      setCapacity((prev) => prev - 1);
    }
  };

  const handleStartDateChange = (value: string) => {
    if (!value) return;
    setStartDate(value);
    if (endDate && endDate < value) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    if (!value) return;
    setEndDate(value);
  };

  // 날짜 표시 형식 변환 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
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
          <CreateProjectProgressBar currentStep={2} />
        </Box>

        {/* Form Content */}
        <Box sx={{ padding: '24px 16px', flex: 1, paddingBottom: '10px' }}>
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
            프로젝트 조건
          </Typography>

          {/* 예산 범위 */}
          <Box sx={{ marginBottom: 4 }}>
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
              예산 범위
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {BUDGET_OPTIONS.map((option) => (
                <Button
                  key={option}
                  onClick={() => setBudget(option)}
                  sx={{
                    backgroundColor: budget === option ? '#2563EB' : '#F3F4F6',
                    color: budget === option ? '#FFFFFF' : '#4B5563',
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: 'none',
                    borderRadius: '20px',
                    padding: '13px',
                    height: 40,
                  }}
                >
                  {option}
                </Button>
              ))}
            </Box>
          </Box>

          {/* 프로젝트 기간 */}
          <Box sx={{ marginTop: 2, marginBottom: 4 }}>
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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {DURATION_OPTIONS.map((option) => (
                <Button
                  key={option}
                  onClick={() => setDuration(option)}
                  sx={{
                    backgroundColor: duration === option ? '#2563EB' : '#F3F4F6',
                    color: duration === option ? '#FFFFFF' : '#4B5563',
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: 'none',
                    borderRadius: '20px',
                    padding: '13px',
                    height: 46,
                  }}
                >
                  {option}
                </Button>
              ))}
            </Box>
          </Box>

          {/* 필요한 협업자 수 */}
          <Box sx={{ marginTop: 2, marginBottom: 4 }}>
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
              필요한 협업자 수
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={handleDecreaseCapacity}
                disabled={capacity <= 1}
                sx={{
                  backgroundColor: theme.palette.grey[100],
                  width: 30,
                  height: 30,
                  '&:disabled': {
                    backgroundColor: theme.palette.grey[100],
                    opacity: 0.5,
                  },
                }}
              >
                <RemoveIcon sx={{ fontSize: 18, color: '#4B5563' }} />
              </IconButton>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontWeight: 600,
                  fontSize: 18,
                  lineHeight: '28px',
                  color: '#111827',
                  minWidth: 48,
                  textAlign: 'center',
                }}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  value={capacity}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) setCapacity(val);
                  }}
                  style={{
                    width: 35,
                    textAlign: "center",
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 600,
                    fontSize: 18,
                    lineHeight: '28px',
                    color: '#111827',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                  }}
                  aria-label="필요한 협업자 수"
                />
                명
              </Typography>
              <IconButton
                onClick={handleIncreaseCapacity}
                sx={{
                  backgroundColor: theme.palette.grey[100],
                  width: 30,
                  height: 30,
                }}
              >
                <AddIcon sx={{ fontSize: 18, color: '#4B5563' }} />
              </IconButton>
            </Box>
          </Box>

          {/* 프로젝트 시작일 */}
          <Box sx={{ marginTop: 2, marginBottom: 4 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14, // Increased size slightly
                lineHeight: '24px',
                color: '#374151',
                marginBottom: 0.5,
              }}
            >
              프로젝트 시작일
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 400,
                fontSize: 13,
                color: theme.palette.text.secondary,
                marginBottom: 1.5,
              }}
            >
              프로젝트 시작일을 입력해주세요.
            </Typography>

            <Button
              onClick={() => setStartDateModalOpen(true)}
              sx={{
                width: '100%',
                maxWidth: '260px',
                height: '50px',
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                padding: '0 16px',
                fontFamily: 'Pretendard, sans-serif',
                fontSize: '16px',
                color: '#111827',
                backgroundColor: '#FFFFFF',
                textTransform: 'none',
                justifyContent: 'flex-start',
                '&:hover': {
                  backgroundColor: '#F9FAFB',
                },
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 20, color: '#6B7280', mr: 1 }} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: '16px',
                  color: startDate ? '#111827' : '#9CA3AF',
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                {startDate ? formatDateDisplay(startDate) : '날짜를 선택해주세요'}
              </Typography>
            </Button>
          </Box>

          {/* 프로젝트 종료일 */}
          <Box sx={{ marginTop: 2, marginBottom: 4 }}>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: '24px',
                color: '#374151',
                marginBottom: 0.5,
              }}
            >
              프로젝트 종료일
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 400,
                fontSize: 13,
                color: theme.palette.text.secondary,
                marginBottom: 1.5,
              }}
            >
              프로젝트 종료일을 입력해주세요.
            </Typography>

            <Button
              onClick={() => setEndDateModalOpen(true)}
              sx={{
                width: '100%',
                maxWidth: '260px',
                height: '50px',
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                padding: '0 16px',
                fontFamily: 'Pretendard, sans-serif',
                fontSize: '16px',
                color: '#111827',
                backgroundColor: '#FFFFFF',
                textTransform: 'none',
                justifyContent: 'flex-start',
                '&:hover': {
                  backgroundColor: '#F9FAFB',
                },
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 20, color: '#6B7280', mr: 1 }} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: '16px',
                  color: endDate ? '#111827' : '#9CA3AF',
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                {endDate ? formatDateDisplay(endDate) : '날짜를 선택해주세요'}
              </Typography>
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 이전/다음 버튼 */}
      <Box sx={{ padding: '16px' }}>
        <Box sx={{ display: 'flex', gap: '16px' }}>
          <Button
            onClick={handleBack}
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
            }}
          >
            이전
          </Button>
          <Button
            onClick={handleNext}
            disabled={!budget || !duration}
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
            다음
          </Button>
        </Box>
      </Box>

      {/* 임시 저장 확인 다이얼로그 */}
      <SaveDraftDialog
        open={showDialog}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* 시작일 선택 모달 */}
      <DatePickerModal
        open={startDateModalOpen}
        onClose={() => setStartDateModalOpen(false)}
        value={startDate}
        onChange={(date) => {
          handleStartDateChange(date);
          setStartDateModalOpen(false);
        }}
        minDate={todayRef.current}
        title="프로젝트 시작일 선택"
      />

      {/* 종료일 선택 모달 */}
      <DatePickerModal
        open={endDateModalOpen}
        onClose={() => setEndDateModalOpen(false)}
        value={endDate}
        onChange={(date) => {
          handleEndDateChange(date);
          setEndDateModalOpen(false);
        }}
        minDate={startDate || todayRef.current}
        title="프로젝트 종료일 선택"
      />
    </Box>
  );
}
