import { Dialog, DialogTitle, IconButton, Box, Typography, Avatar, Chip, Divider, useTheme } from '@mui/material';
import { LightningLoader } from '../../components/common';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { SupporterUser } from '../../types/community.types';
import { useAuth } from '../../providers/AuthContext';
import { useProfileStore } from '../../stores/profileStore';
import { profileService } from '../../services/profileService';
import { useEffect, useMemo, useState } from 'react';

interface SupporterListModalProps {
  open: boolean;
  supporters: SupporterUser[];
  loading?: boolean;
  onClose: () => void;
}

const formatRelativeTime = (value?: string) => {
  if (!value) return '';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

export default function SupporterListModal({
  open,
  supporters,
  loading = false,
  onClose,
}: SupporterListModalProps) {
  const theme = useTheme();
  const ROLE_META: Record<string, { label: string; color: string; bg: string }> = useMemo(() => ({
    artist: {
      label: '아티스트', color: theme.palette.userTypeText.artist
      , bg: theme.palette.userTypeBg.artist
    },
    creative: { label: '크리에이티브', color: theme.palette.userTypeText.creative, bg: theme.palette.userTypeBg.creative },
    brand: { label: '브랜드', color: theme.palette.userTypeText.brand, bg: theme.palette.userTypeBg.brand },
    fan: { label: '팬', color: theme.palette.userTypeText.fan, bg: theme.palette.userTypeBg.fan },
    unknown: { label: '유저', color: theme.palette.icon.default, bg: theme.palette.grey[100] },
  }), [theme]);

  const { user } = useAuth();
  const { type: activeRole, profileId, fanProfile, nonFanProfile } = useProfileStore();
  const [selfDisplay, setSelfDisplay] = useState<{ name?: string; avatarUrl?: string; role?: SupporterUser['role'] }>({});

  // 현재 사용자에 대해 활성 프로필 정보로 표시값 계산
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user || !activeRole || activeRole === 'customer' || !profileId) {
        setSelfDisplay({});
        return;
      }
      try {
        const profile = await profileService.getProfile(profileId, activeRole);
        if (!isMounted) return;

        if (activeRole === 'brand') {
          setSelfDisplay({
            name: nonFanProfile?.record.brand_name,
            avatarUrl: (profile as any)?.logo_image_url || undefined,
            role: 'brand',
          });
        } else if (activeRole === 'artist') {
          setSelfDisplay({
            name: nonFanProfile?.record.artist_name,
            avatarUrl: (profile as any)?.logo_image_url || undefined,
            role: 'artist',
          });
        } else if (activeRole === 'creative') {
          setSelfDisplay({
            name: nonFanProfile?.record.nickname,
            avatarUrl: (profile as any)?.profile_image_url || undefined,
            role: 'creative',
          });
        } else if (activeRole === 'fan') {
          setSelfDisplay({
            name: fanProfile?.nickname,
            avatarUrl: (profile as any)?.profile_image_url || undefined,
            role: 'fan',
          });
        }
      } catch {
        // ignore, keep existing display
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user, activeRole, profileId, fanProfile, nonFanProfile]);

  // supporters 목록에서 본인 항목을 활성 프로필 정보로 치환
  const adjustedSupporters = useMemo(() => {
    if (!user || !selfDisplay.role) return supporters;
    return supporters.map((s) => {
      if (s.userId !== user.id) return s;
      return {
        ...s,
        name: selfDisplay.name || s.name,
        avatarUrl: selfDisplay.avatarUrl || s.avatarUrl,
        role: selfDisplay.role || s.role,
      };
    });
  }, [supporters, user, selfDisplay]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 3, p: 1, backgroundColor: theme.palette.background.default },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <Typography component="span" variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          응원한 사람들 {supporters.length > 0 ? supporters.length : ''}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <Box sx={{ maxHeight: 520, overflowY: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <LightningLoader size={28} />
          </Box>
        ) : adjustedSupporters.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            아직 응원한 사람이 없어요.
          </Typography>
        ) : (
          adjustedSupporters.map((supporter) => {
            const roleInfo = ROLE_META[supporter.role] || ROLE_META.unknown;
            return (
              <Box
                key={`${supporter.userId}-${supporter.likedAt}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: theme.palette.grey[100],
                  borderRadius: 4,
                  p: 1.5,
                  mb: 1.5,
                }}
              >
                <Avatar
                  src={supporter.avatarUrl || undefined}
                  alt={supporter.name}
                  sx={{ width: 40, height: 40, mr: 2 }}
                >
                  {supporter.name?.[0] || '?'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>
                      {supporter.name || '이름 없음'}
                      <FiberManualRecordIcon sx={{
                        fontSize: 8, color: theme.palette.status.
                          Success, ml: 1,
                      }} />
                    </Typography>
                    <Chip
                      size="small"
                      label={roleInfo.label}
                      sx={{
                        height: 22,
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 400,
                        color: roleInfo.color,
                        backgroundColor: roleInfo.bg,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FavoriteIcon sx={{
                      fontSize: 16, color: theme.palette.status.
                        red, fontWeight: 400
                    }} />
                    <Typography variant="body2" color="text.secondary" fontSize={12}>
                      {formatRelativeTime(supporter.likedAt)}
                    </Typography>
                  </Box>
                </Box>
                <ChevronRightIcon sx={{
                  color: theme.palette.icon.inner
                }} />
              </Box>
            );
          })
        )}
      </Box>
    </Dialog>
  );
}

