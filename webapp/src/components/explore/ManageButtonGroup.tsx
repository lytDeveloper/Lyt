import { Box, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BOTTOM_NAV_HEIGHT } from '../navigation/BottomNavigationBar';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
interface ManageButtonGroupProps {
  isOpen: boolean;
  entityType: 'project' | 'collaboration';
  entityId: string | null;
  isRestricted?: boolean;
  onRestricted?: () => void;
  onClose: () => void;
}

export default function ManageButtonGroup({
  isOpen,
  isRestricted = false,
  onRestricted,
  onClose,
}: ManageButtonGroupProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const guard = (callback: () => void) => {
    if (isRestricted) {
      onRestricted?.();
      return;
    }
    callback();
  };

  const handleTeamClick = () => {
    // 통합 관리 페이지의 프로젝트·협업 탭으로 이동
    guard(() => navigate('/manage?tab=projects'));
  };

  const handleInviteClick = () => {
    // 통합 관리 페이지의 초대·지원 탭으로 이동
    guard(() => navigate('/manage?tab=invitations'));
  };

  const handleMessageClick = () => {
    // 통합 관리 페이지의 메시지 탭으로 이동
    guard(() => navigate('/manage?tab=likes'));
  };

  // SettingsIcon의 위치와 크기
  const SETTINGS_ICON_WIDTH = 56;
  const GAP = 16; // SettingsIcon과의 간격 (충분히 띄움)

  // ManageButtonGroup의 right 위치 계산
  const rightPosition = useMemo(() => {
    if (isMobile) {
      // 모바일: SettingsIcon의 right가 16px
      // ManageButtonGroup이 SettingsIcon의 왼쪽에 위치하려면:
      // right = SettingsIcon의 right(16px) + SettingsIcon 너비(56px) + GAP
      const calculated = 16 + SETTINGS_ICON_WIDTH + GAP;
      return `${calculated}px`;
    }
    // 데스크톱: SettingsIcon의 right가 calc((100% - 768px) / 2 + 16px)
    // right = SettingsIcon의 right + SettingsIcon 너비 + GAP
    return `calc((100% - 768px) / 2 + 16px + ${SETTINGS_ICON_WIDTH}px + ${GAP}px)`;
  }, [isMobile]);

  const handleOverlayClick = () => {
    onClose();
  };

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleOverlayClick}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 997,
            // 완전 투명 오버레이 (시각적 변화는 최소화하되, 클릭만 가로채도록)
            backgroundColor: 'transparent',
          }}
        >
          <motion.div
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: `${BOTTOM_NAV_HEIGHT + 90}px`,
              right: rightPosition,
              zIndex: 998,
            }}
            onClick={handleContentClick}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                backgroundColor: '#2563EB',
                borderRadius: '56px',
                padding: '4px 12px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
              }}
            >
              {/* 팀 버튼 */}
              <Tooltip title="팀 관리" arrow placement="top">
                <IconButton
                  onClick={handleTeamClick}
                  sx={{
                    color: '#FFFFFF',
                    width: 48,
                    height: 48,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <PeopleAltOutlinedIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              {/* 초대 버튼 */}
              <Tooltip title="초대 관리" arrow placement="top">
                <IconButton
                  onClick={handleInviteClick}
                  sx={{
                    color: '#FFFFFF',
                    width: 48,
                    height: 48,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              {/*  찜 버튼 */}
              <Tooltip title="찜 관리" arrow placement="top">
                <IconButton
                  onClick={handleMessageClick}
                  sx={{
                    color: '#FFFFFF',
                    width: 48,
                    height: 48,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <FavoriteBorderOutlinedIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}
