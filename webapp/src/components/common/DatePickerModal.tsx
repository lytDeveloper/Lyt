import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface DatePickerModalProps {
  open: boolean;
  onClose: () => void;
  value: string; // YYYY-MM-DD 형식
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD 형식
  title?: string;
}

export default function DatePickerModal({
  open,
  onClose,
  value,
  onChange,
  minDate,
  title = '날짜 선택',
}: DatePickerModalProps) {
  const theme = useTheme();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [viewMode, setViewMode] = useState<'calendar' | 'year' | 'month'>('calendar');

  // value가 변경되면 내부 상태 업데이트
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedYear(date.getFullYear());
        setSelectedMonth(date.getMonth() + 1);
        setSelectedDay(date.getDate());
      }
    }
  }, [value]);

  // 모달이 열릴 때 현재 값으로 초기화
  useEffect(() => {
    if (open && value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setSelectedYear(date.getFullYear());
        setSelectedMonth(date.getMonth() + 1);
        setSelectedDay(date.getDate());
      }
    }
  }, [open, value]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
  };

  const handleConfirm = () => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    onChange(dateStr);
    onClose();
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
  };

  const isDateDisabled = (year: number, month: number, day: number) => {
    if (!minDate) return false;
    const min = new Date(minDate);
    const current = new Date(year, month - 1, day);
    return current < min;
  };

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date();
    return (
      year === today.getFullYear() &&
      month === today.getMonth() + 1 &&
      day === today.getDate()
    );
  };

  const isSelected = (day: number) => {
    return selectedDay === day;
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ];

  // 년도 목록 생성 (현재 년도 기준 ±50년)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // 달력 그리드 생성
  const calendarDays: (number | null)[] = [];
  // 빈 칸 추가 (첫 번째 날짜 전)
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // 날짜 추가
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxWidth: '340px',
          width: '90%',
          m: 2,
          p: 0,
          backgroundColor: '#fff',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 600,
            fontSize: 18,
            color: '#111827',
          }}
        >
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            padding: '4px',
            color: '#6B7280',
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, '&.MuiDialogContent-root': { paddingTop: 0 } }}>
        {/* Year/Month Selector */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            pb: 1,
          }}
        >
          <IconButton
            onClick={handlePrevMonth}
            sx={{
              padding: '8px',
              color: '#374151',
            }}
          >
            <ArrowBackIosIcon sx={{ fontSize: 16 }} />
          </IconButton>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
            }}
            onClick={() => setViewMode(viewMode === 'calendar' ? 'year' : 'calendar')}
          >
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontWeight: 600,
                fontSize: 18,
                color: '#111827',
              }}
            >
              {selectedYear}년 {selectedMonth}월
            </Typography>
          </Box>

          <IconButton
            onClick={handleNextMonth}
            sx={{
              padding: '8px',
              color: '#374151',
            }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Calendar Grid */}
        {viewMode === 'calendar' && (
          <Box sx={{ p: 2, pt: 1 }}>
            {/* Week Days */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
                mb: 1,
              }}
            >
              {weekDays.map((day) => (
                <Box
                  key={day}
                  sx={{
                    textAlign: 'center',
                    py: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      fontWeight: 500,
                      color: day === '일' ? '#EF4444' : day === '토' ? '#3B82F6' : '#6B7280',
                    }}
                  >
                    {day}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Calendar Days */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
              }}
            >
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <Box key={`empty-${index}`} sx={{ aspectRatio: 1, py: 1.5 }} />;
                }

                const dayDisabled = isDateDisabled(selectedYear, selectedMonth, day);
                const dayIsSelected = isSelected(day);
                const dayIsToday = isToday(selectedYear, selectedMonth, day);

                return (
                  <Button
                    key={day}
                    onClick={() => !dayDisabled && handleDayClick(day)}
                    disabled={dayDisabled}
                    sx={{
                      minWidth: 0,
                      aspectRatio: 1,
                      p: 0,
                      borderRadius: '50%',
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 14,
                      fontWeight: dayIsSelected ? 600 : 400,
                      color: dayDisabled
                        ? '#D1D5DB'
                        : dayIsSelected
                        ? '#FFFFFF'
                        : dayIsToday
                        ? '#2563EB'
                        : '#111827',
                      backgroundColor: dayIsSelected
                        ? '#2563EB'
                        : dayIsToday && !dayIsSelected
                        ? '#EFF6FF'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: dayDisabled
                          ? 'transparent'
                          : dayIsSelected
                          ? '#2563EB'
                          : '#F3F4F6',
                      },
                      '&:disabled': {
                        color: '#D1D5DB',
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    {day}
                  </Button>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Year Selector */}
        {viewMode === 'year' && (
          <Box
            sx={{
              p: 2,
              maxHeight: '300px',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#D1D5DB',
                borderRadius: '2px',
              },
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
              }}
            >
              {years.map((year) => (
                <Button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setViewMode('month');
                  }}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: selectedYear === year ? 600 : 400,
                    color: selectedYear === year ? '#2563EB' : '#111827',
                    backgroundColor: selectedYear === year ? '#EFF6FF' : 'transparent',
                    '&:hover': {
                      backgroundColor: selectedYear === year ? '#EFF6FF' : '#F3F4F6',
                    },
                  }}
                >
                  {year}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Month Selector */}
        {viewMode === 'month' && (
          <Box
            sx={{
              p: 2,
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
              }}
            >
              {monthNames.map((month, index) => (
                <Button
                  key={month}
                  onClick={() => {
                    setSelectedMonth(index + 1);
                    setViewMode('calendar');
                  }}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: selectedMonth === index + 1 ? 600 : 400,
                    color: selectedMonth === index + 1 ? '#2563EB' : '#111827',
                    backgroundColor: selectedMonth === index + 1 ? '#EFF6FF' : 'transparent',
                    '&:hover': {
                      backgroundColor: selectedMonth === index + 1 ? '#EFF6FF' : '#F3F4F6',
                    },
                  }}
                >
                  {month}
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer Buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          p: 2,
          pt: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={handleToday}
          sx={{
            flex: 1,
            py: 1.5,
            borderRadius: 2,
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
            backgroundColor: '#F3F4F6',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#E5E7EB',
            },
          }}
        >
          오늘
        </Button>
        <Button
          onClick={handleConfirm}
          sx={{
            flex: 1,
            py: 1.5,
            borderRadius: 2,
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: '#2563EB',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#1D4ED8',
            },
          }}
        >
          확인
        </Button>
      </Box>
    </Dialog>
  );
}

