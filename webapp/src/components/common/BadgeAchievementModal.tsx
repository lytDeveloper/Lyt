import { Dialog, Box, Typography, Button, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useBadgeModalStore } from '../../stores/useBadgeModalStore';
import { getBadgeAsset } from '../../constants/badgeAssets';
import { useAuth } from '../../providers/AuthContext';

export default function BadgeAchievementModal() {
  const theme = useTheme();
  const { profile } = useAuth();
  const { isOpen, currentBadge, closeModal } = useBadgeModalStore();
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [showConfetti, setShowConfetti] = useState(false);

  // 윈도우 크기 감지
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 약관 동의 전이거나 닉네임이 없는 경우 모달 표시 안 함
  const shouldShowModal = !!(isOpen && profile?.terms_agreed_at && profile?.nickname);

  // 모달이 열릴 때 폭죽 효과 시작
  useEffect(() => {
    if (shouldShowModal) {
      setShowConfetti(true);
      // 3초 후 폭죽 효과 종료
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [shouldShowModal]);

  const handleConfirm = () => {
    closeModal();
  };

  // 배지 이미지 가져오기
  const badgeAsset = currentBadge ? getBadgeAsset(currentBadge.badgeId) : null;

  return (
    <>
      {/* 폭죽 효과 - Dialog보다 위에 표시 */}
      {showConfetti && shouldShowModal && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1400, // Dialog의 z-index(1300)보다 높게
            pointerEvents: 'none', // 클릭 이벤트 차단 방지
          }}
        >
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
          />
        </Box>
      )}

      <Dialog
        open={shouldShowModal}
        onClose={handleConfirm}
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            padding: 0,
            margin: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#00000000',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: '100%',
            margin: '0 auto',
          }}
        >
          {/* Glow 원 */}
          {badgeAsset && (
            <Box
              sx={{
                position: 'relative',
                width: 220,
                height: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                my: 1,
                flexDirection: 'column',
                margin: '0 auto',
                gap: 0.5,
              }}
            >
              {/* 제목 */}
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 18,
                  fontWeight: 700,
                  color: theme.palette.primary.contrastText,
                  textAlign: 'center',
                  zIndex: 1,
                }}
              >
                배지 획득 성공!
              </Typography>
              {/* 퍼지는 블러 글로우 */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: -20,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 20% 80%, #6CACE4 0%,  #6CACE4 7%, #6DADE4 13%, #6FAEE5 20%, #72B0E5 27%, #75B3E6 33%, #79B6E7 40%, #7DB9E8 47%, #82BDEA 53%, #86C0EB 60%, #8AC3EC 67%, #8DC6ED 73%, #90C8ED 80%, #92C9EE 87%, #93CAEE 93%, #93CAEE 100%)',
                  // background: 'radial-gradient(circle at 20% 80%, rgba(147,197,253,0.6) 0%, rgba(59,130,246,0.35) 40%, rgba(59,130,246,0.15) 60%, transparent 75%)',
                  filter: 'blur(70px)',
                  zIndex: 0,

                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  inset: -10,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 80% 20%, #6CACE4 0%,  #6CACE4 7%, #6DADE4 13%, #6FAEE5 20%, #72B0E5 27%, #75B3E6 33%, #79B6E7 40%, #7DB9E8 47%, #82BDEA 53%, #86C0EB 60%, #8AC3EC 67%, #8DC6ED 73%, #90C8ED 80%, #92C9EE 87%, #93CAEE 93%, #93CAEE 100%)',
                  filter: 'blur(60px)',
                  zIndex: 0,
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 80% 80%,rgba(37, 99, 235,0.6) 0%,rgba(15, 72, 146, 0.6) 100%)',
                  filter: 'blur(50px)',
                  zIndex: 0,
                  width: 180,
                  height: 180,
                }}
              />

              {/* 배지 아이콘 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  animation: 'rotate 3s linear infinite',
                  '@keyframes rotate': {
                    '0%': {
                      transform: 'rotate(0deg)',
                    },
                    '20%': {
                      transform: 'rotate(10deg)',
                    },
                    '50%': {
                      transform: 'rotate(0deg)',
                    },
                    '70%': {
                      transform: 'rotate(-10deg)',
                    },
                    '100%': {
                      transform: 'rotate(0deg)',
                    },
                  },
                }}
              >
                <img
                  src={badgeAsset}
                  alt={currentBadge?.badgeName}
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: 'contain',
                  }}
                />
              </Box>


              {/* 배지 이름 */}
              {currentBadge && (
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.palette.primary.contrastText,
                    zIndex: 1,
                    textAlign: 'center',
                    mb: 1,
                  }}
                >
                  {currentBadge.badgeName}
                </Typography>
              )}

              {/* 배지 설명 */}
              {currentBadge?.badgeDescription && (
                <Typography
                  sx={{
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 14,
                    fontWeight: 400,
                    color: theme.palette.primary.contrastText,
                    zIndex: 1,
                    textAlign: 'center',
                    lineHeight: 1.5,
                    wordBreak: 'keep-all',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {currentBadge.badgeDescription}
                </Typography>
              )}
            </Box>
          )}

          {/* 확인 버튼 */}
          <Button
            onClick={handleConfirm}
            variant="contained"
            fullWidth
            sx={{
              height: 40,
              width: '50%',
              borderRadius: '22px',
              backgroundColor: theme.palette.primary.main,
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            확인
          </Button>
        </Box>
      </Dialog>
    </>
  );
}
