import { Dialog, Typography, IconButton, Box, Button, Checkbox } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useRef, useState } from 'react';
import type { ServerNotificationRow } from '../hooks/useServerNotifications';

interface Props {
  notices: ServerNotificationRow[];
  onClose: (id?: string) => void;
  onDontShowToday: (id: string) => void;
}

export default function GlobalNoticeModal({ notices, onClose, onDontShowToday }: Props) {
  const open = notices.length > 0;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dontShowToday, setDontShowToday] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const currentNotice = notices[currentIndex] ?? null;

  useEffect(() => {
    if (!open) return;
    setCurrentIndex(0);
    setDontShowToday(false);
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [open, notices.map((n) => n.id).join(',')]);

  useEffect(() => {
    // 슬라이드가 바뀔 때마다 체크박스 초기화
    setDontShowToday(false);
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex >= notices.length && notices.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, notices.length]);

  const handleResolve = () => {
    if (!currentNotice) {
      onClose();
      return;
    }

    if (dontShowToday) {
      // 오늘 하루 그만보기 선택 시, 현재 남아있는 모든 공지를 하루 동안 숨김 처리
      notices.forEach((notice) => onDontShowToday(notice.id));
      return;
    }

    // 단순 닫기(X/확인) 시에도 남은 공지가 다시 나타나지 않도록 모두 스킵
    onClose();
  };

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    const scrollLeft = slider.scrollLeft;
    const width = slider.clientWidth;
    const index = Math.round(scrollLeft / width);
    if (index !== currentIndex) setCurrentIndex(index);
  };

  const handleIndicatorClick = (idx: number) => {
    const slider = sliderRef.current;
    if (!slider) {
      setCurrentIndex(idx);
      return;
    }
    slider.scrollTo({ left: idx * slider.clientWidth, behavior: 'smooth' });
    setCurrentIndex(idx);
  };

  if (!currentNotice) return null;

  return (
    <Dialog
      open={open}
      onClose={handleResolve}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 5,
          p: 2,
          position: 'relative',
          backgroundColor: '#fff',
          maxWidth: '340px',
          mx: 2,
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ position: 'relative', pt: 1, pb: 2, px: 1 }}>
        <IconButton
          aria-label="close"
          onClick={handleResolve}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            color: '#BDBDBD',
            p: 0.5,
            zIndex: 2,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 2, mt: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: '#111' }}>
            공지사항
          </Typography>
          <Typography variant="body2" sx={{ color: '#999', fontSize: '13px', mt: 0.5 }}>
            새로운 소식을 확인하세요
          </Typography>
        </Box>

        <Box
          ref={sliderRef}
          onScroll={handleScroll}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            width: '100%',
            minHeight: '240px',
            maxHeight: '340px',
            mb: 2,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {notices.map((item) => (
            <Box
              key={item.id}
              sx={{
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                width: '100%',
                height: '100%',
                px: 0.5,
              }}
            >
              <Box
                sx={{
                  backgroundColor: '#F8F9FA',
                  borderRadius: 3,
                  p: 2.5,
                  minHeight: '220px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '15px', mb: 1.5, color: '#111' }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#424242', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {item.body}
                </Typography>
                {item.link_url && (
                  <Box sx={{ mt: 1.5 }}>
                    <a href={item.link_url} target="_blank" rel="noreferrer" style={{ color: '#2F54EB', fontWeight: 600 }}>
                      자세히 보기
                    </a>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {notices.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
            {notices.map((_, idx) => (
              <Box
                key={idx}
                onClick={() => handleIndicatorClick(idx)}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: currentIndex === idx ? '#2F54EB' : '#E0E0E0',
                  transition: 'background-color 0.3s',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, pl: 0.5 }}>
          <Checkbox
            checked={dontShowToday}
            onChange={(e) => setDontShowToday(e.target.checked)}
            sx={{
              p: 0,
              mr: 1,
              color: '#E0E0E0',
              '&.Mui-checked': { color: '#BDBDBD' }
            }}
          />
          <Typography
            variant="body2"
            sx={{ color: '#616161', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => setDontShowToday(!dontShowToday)}
          >
            오늘 하루 그만보기
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={handleResolve}
          sx={{
            borderRadius: 6,
            py: 1,
            width: '90%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mx: 'auto',
            backgroundColor: '#2F54EB',
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: 'none',
          }}
        >
          확인
        </Button>
      </Box>
    </Dialog>
  );
}














