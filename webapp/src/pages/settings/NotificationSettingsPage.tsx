import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';

import ActionResultModal from '../../components/common/ActionResultModal';
import { useAuth } from '../../providers/AuthContext';
import { UserNotificationService } from '../../services/userNotificationService';

type ToggleKey =
  | 'projectInvite'
  | 'projectUpdate'
  | 'projectDeadline'
  | 'projectComplete'
  | 'newMessage'
  | 'mention'
  | 'groupMessage'
  | 'security'
  | 'marketing'
  | 'push'
  | 'email';

type Toggles = Record<ToggleKey, boolean>;

// UI 토글 키 -> DB notification_type 매핑
const TOGGLE_TO_TYPE_MAP: Record<ToggleKey, string> = {
  projectInvite: 'invitation',
  projectUpdate: 'project_update',
  projectDeadline: 'deadline',
  projectComplete: 'project_complete',
  newMessage: 'message',
  mention: 'mention',
  groupMessage: 'group_message',
  security: 'security',
  marketing: 'marketing',
  push: 'push', // 별도 user_push_settings
  email: 'email', // 준비 중
};

// 알림 타입별 토글 (push, email 제외)
const TYPE_TOGGLE_KEYS: ToggleKey[] = [
  'projectInvite', 'projectUpdate', 'projectDeadline', 'projectComplete',
  'newMessage', 'mention', 'groupMessage', 'security', 'marketing'
];

const NotificationSwitch = styled(Switch)(({ theme }) => ({
  width: 46,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 4,
    transitionDuration: '200ms',
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.primary.main,
        opacity: 1,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    width: 18,
    height: 18,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.grey[200],
    opacity: 1,
  },
}));

function SectionTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1.5 }}>
      <Box sx={{ color: theme.palette.icon.default, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{ fontSize: 14, fontWeight: 800, color: theme.palette.text.primary }}>
        {title}
      </Typography>
    </Box>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <Box sx={{ px: 2, py: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.palette.text.primary }}>
          {title}
        </Typography>
        {description ? (
          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mt: 0.2 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      <NotificationSwitch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        color="primary"
        disabled={disabled}
      />
    </Box>
  );
}

export default function NotificationSettingsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  // 페이지 초기 진입시 스크롤을 최상단으로 설정
  useEffect(() => {
    // 즉시 실행
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 렌더링 후 추가 실행 (RAF 사용)
    const rafId = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    });

    // 콘텐츠 로드 후 최종 실행
    const timer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, []); // 마운트 시에만 실행

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toggles, setToggles] = useState<Toggles>({
    projectInvite: true,
    projectUpdate: true,
    projectDeadline: true,
    projectComplete: true,
    newMessage: true,
    mention: true,
    groupMessage: true,
    security: true,
    marketing: true,
    push: true,
    email: false, // 준비 중
  });

  const [quietMode, setQuietMode] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState(true);

  // 설정 로드
  useEffect(() => {
    if (!user?.id) return;

    const loadSettings = async () => {
      try {
        const { typeSettings, pushSettings } = await UserNotificationService.getAllNotificationSettings(user.id);

        // DB 설정을 UI 토글에 매핑
        setToggles((prev) => {
          const next = { ...prev };
          (Object.entries(TOGGLE_TO_TYPE_MAP) as [ToggleKey, string][]).forEach(([key, type]) => {
            if (type in typeSettings) {
              next[key] = typeSettings[type];
            }
          });
          // push는 별도 테이블
          next.push = pushSettings.pushEnabled;
          next.email = false; // 이메일은 항상 비활성화
          return next;
        });

        setQuietMode(pushSettings.quietModeEnabled);
        setQuietStart(pushSettings.quietStartTime.slice(0, 5));
        setQuietEnd(pushSettings.quietEndTime.slice(0, 5));
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  const allTargets = useMemo(
    () => TYPE_TOGGLE_KEYS,
    []
  );

  useEffect(() => {
    const nextAll = allTargets.every((k) => Boolean(toggles[k]));
    setAllNotifications(nextAll);
  }, [allTargets, toggles]);

  const setToggle = (key: ToggleKey, value: boolean) => {
    setToggles((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleAll = (checked: boolean) => {
    setAllNotifications(checked);
    setToggles((prev) => {
      const next: Toggles = { ...prev };
      allTargets.forEach((k) => {
        next[k] = checked;
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      // 타입별 설정 객체 생성
      const typeSettings: Record<string, boolean> = {};
      TYPE_TOGGLE_KEYS.forEach((key) => {
        const dbType = TOGGLE_TO_TYPE_MAP[key];
        typeSettings[dbType] = toggles[key];
      });

      // 푸시/방해금지 설정
      const pushSettingsUpdate = {
        pushEnabled: toggles.push,
        quietModeEnabled: quietMode,
        quietStartTime: quietStart,
        quietEndTime: quietEnd,
      };

      await UserNotificationService.updateAllNotificationSettings(
        user.id,
        typeSettings,
        pushSettingsUpdate
      );

      setSaveModalOpen(true);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      // TODO: Show error message to user
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        backgroundColor: '#fff',
        minHeight: '100vh',
        maxWidth: '768px',
        margin: '0 auto',
        overflow: 'auto',
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: theme.palette.transparent.white,
          backdropFilter: 'blur(3px) saturate(180%)',
          WebkitBackdropFilter: 'blur(3px) saturate(180%)',
          paddingTop: 0,
        }}
      >
        <Box sx={{ px: 1.5, py: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate(-1)} size="small" aria-label="뒤로가기">
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ flex: 1, fontSize: 16, fontWeight: 800, color: theme.palette.text.primary }}>
            알림 설정
          </Typography>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || loading}
            sx={{
              borderRadius: 999,
              px: 1,
              py: 0.5,
              minWidth: 50,
              fontWeight: 500,
              boxShadow: 'none',
              textTransform: 'none',
            }}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : '저장'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 2 }}>
        {/* All notifications */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: `1px solid ${theme.palette.grey[100]}`,
            p: 2,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <NotificationsNoneIcon sx={{ color: theme.palette.icon.default }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: theme.palette.text.primary }}>
                  전체 알림
                </Typography>
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                  모든 알림을 한번에 관리
                </Typography>
              </Box>
            </Box>
            <NotificationSwitch
              checked={allNotifications}
              onChange={(e) => handleToggleAll(e.target.checked)}
            />
          </Box>
        </Paper>

        {/* Project/Collaboration notifications */}
        <SectionTitle icon={<FolderOutlinedIcon fontSize="small" />} title="프로젝트/협업 알림" />
        <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.grey[100]}`, mb: 3 }}>
          <SettingRow
            title="프로젝트/협업 초대"
            description="새로운 프로젝트/협업 초대를 받았을 때"
            checked={toggles.projectInvite}
            onChange={(v) => setToggle('projectInvite', v)}
          />
          <Divider />
          <SettingRow
            title="프로젝트 업데이트"
            description="참여 중인 프로젝트에 새로운 업데이트가 있을 때"
            checked={toggles.projectUpdate}
            onChange={(v) => setToggle('projectUpdate', v)}
          />
          <Divider />
          <SettingRow
            title="마감일 알림"
            description="프로젝트 마감일이 다가올 때"
            checked={toggles.projectDeadline}
            onChange={(v) => setToggle('projectDeadline', v)}
          />
          <Divider />
          <SettingRow
            title="프로젝트/협업 완료"
            description="프로젝트/협업이 완료되었을 때"
            checked={toggles.projectComplete}
            onChange={(v) => setToggle('projectComplete', v)}
          />
        </Paper>

        {/* Message notifications */}
        <SectionTitle icon={<ChatBubbleOutlineIcon fontSize="small" />} title="메시지 알림" />
        <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.grey[100]}`, mb: 2 }}>
          <SettingRow
            title="새 메시지"
            description="새로운 메시지를 받았을 때"
            checked={toggles.newMessage}
            onChange={(v) => setToggle('newMessage', v)}
          />
          <Divider />
          <SettingRow
            title="멘션 알림"
            description="메시지에서 나를 언급했을 때"
            checked={toggles.mention}
            onChange={(v) => setToggle('mention', v)}
          />
          <Divider />
          <SettingRow
            title="그룹 메시지"
            description="그룹 채팅에 새 메시지가 있을 때"
            checked={toggles.groupMessage}
            onChange={(v) => setToggle('groupMessage', v)}
          />
        </Paper>

        {/* System notifications */}
        <SectionTitle icon={<SettingsOutlinedIcon fontSize="small" />} title="시스템 알림" />
        <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.grey[100]}`, mb: 2 }}>
          <SettingRow
            title="보안 알림"
            description="계정 보안 관련 중요한 알림"
            checked={toggles.security}
            onChange={(v) => setToggle('security', v)}
          />
          <Divider />
          <SettingRow
            title="마케팅 알림"
            description="이벤트, 프로모션 등의 마케팅 정보"
            checked={toggles.marketing}
            onChange={(v) => setToggle('marketing', v)}
          />
        </Paper>

        {/* Delivery method */}
        <SectionTitle icon={<SmartphoneOutlinedIcon fontSize="small" />} title="알림 방식" />
        <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.grey[100]}`, mb: 2 }}>
          <SettingRow
            title="푸시 알림"
            description="앱 푸시 알림 받기"
            checked={toggles.push}
            onChange={(v) => setToggle('push', v)}
          />
          <Divider />
          <SettingRow
            title="이메일 알림"
            description="이메일로 알림 받기"
            checked={false}
            onChange={() => { }}
            disabled
          />
          <Box sx={{ px: 2, pb: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Chip
              label="준비 중"
              size="small"
              sx={{ fontSize: 11, height: 20, bgcolor: theme.palette.grey[100] }}
            />
          </Box>
        </Paper>

        {/* Notification time */}
        <SectionTitle icon={<AccessTimeIcon fontSize="small" />} title="알림 시간" />
        <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.grey[100]}` }}>
          <Box sx={{ px: 2, py: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: theme.palette.text.primary }}>
                방해 금지 모드
              </Typography>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mt: 0.2 }}>
                설정한 시간에는 알림을 받지 않아요
              </Typography>
            </Box>
            <NotificationSwitch
              checked={quietMode}
              onChange={(e) => setQuietMode(e.target.checked)}
            />
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: theme.palette.text.secondary, mb: 0.8 }}>
                  시작 시간
                </Typography>
                <TextField
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  type="time"
                  fullWidth
                  size="small"
                  disabled={!quietMode}
                  inputProps={{ step: 300 }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: theme.palette.text.secondary, mb: 0.8 }}>
                  종료 시간
                </Typography>
                <TextField
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  type="time"
                  fullWidth
                  size="small"
                  disabled={!quietMode}
                  inputProps={{ step: 300 }}
                />
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      <ActionResultModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="저장되었어요."
        confirmLabel="확인"
        variant="success"
      />
    </Box>
  );
}


