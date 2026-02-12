import { Dialog, DialogTitle, IconButton, Box, Typography, Avatar, Chip, Divider, useTheme } from '@mui/material';
import { LightningLoader } from '../../components/common';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { ViewerUser } from '../../types/community.types';
import { useAuth } from '../../providers/AuthContext';
import { useProfileStore } from '../../stores/profileStore';
import { profileService } from '../../services/profileService';
import { useEffect, useMemo, useState } from 'react';
import { getPartnerById, type Partner } from '../../services/partnerService';
import PartnerDetailContent from '../explore/PartnerDetailContent';

interface ViewerListModalProps {
  open: boolean;
  viewers: ViewerUser[];
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

export default function ViewerListModal({
  open,
  viewers,
  loading = false,
  onClose,
}: ViewerListModalProps) {
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
  const [selfDisplay, setSelfDisplay] = useState<{ name?: string; avatarUrl?: string; role?: ViewerUser['role'] }>({});

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

  // viewers 목록에서 본인 항목을 활성 프로필 정보로 치환
  const adjustedViewers = useMemo(() => {
    if (!user || !selfDisplay.role) return viewers;
    return viewers.map((v) => {
      if (v.userId !== user.id) return v;
      return {
        ...v,
        name: selfDisplay.name || v.name,
        avatarUrl: selfDisplay.avatarUrl || v.avatarUrl,
        role: selfDisplay.role || v.role,
      };
    });
  }, [viewers, user, selfDisplay]);

  // 방어 로직: 같은 userId가 여러 번 들어오더라도 최신 1건만 표시
  const dedupedViewers = useMemo(() => {
    const seen = new Set<string>();
    const result: ViewerUser[] = [];
    for (const v of adjustedViewers) {
      if (!v?.userId) continue;
      if (seen.has(v.userId)) continue;
      seen.add(v.userId);
      result.push(v);
    }
    return result;
  }, [adjustedViewers]);

  // 파트너 상세 모달 상태
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerLoading, setPartnerLoading] = useState(false);

  // 팬이 아닌 역할의 유저 클릭 시 파트너 상세 모달 열기
  const handleViewerClick = async (viewer: ViewerUser) => {
    // fan 역할은 파트너 상세 모달을 띄우지 않음
    if (viewer.role === 'fan') return;

    // artist, creative, brand 역할만 파트너 상세 모달 띄우기
    if (!['artist', 'creative', 'brand'].includes(viewer.role)) return;

    try {
      setPartnerLoading(true);
      const partner = await getPartnerById(viewer.userId);
      if (partner) {
        setSelectedPartner(partner);
        setPartnerModalOpen(true);
      }
    } catch (error) {
      console.error('[ViewerListModal] Failed to fetch partner:', error);
    } finally {
      setPartnerLoading(false);
    }
  };

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
          조회한 사람들 {dedupedViewers.length > 0 ? dedupedViewers.length : ''}
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
        ) : dedupedViewers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            아직 조회한 사람이 없어요.
          </Typography>
        ) : (
          dedupedViewers.map((viewer) => {
            const roleInfo = ROLE_META[viewer.role] || ROLE_META.unknown;
            return (
              <Box
                key={viewer.userId}
                onClick={() => handleViewerClick(viewer)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: theme.palette.grey[100],
                  borderRadius: 4,
                  p: 1.5,
                  mb: 1.5,
                  cursor: viewer.role !== 'fan' && ['artist', 'creative', 'brand'].includes(viewer.role) ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  '&:hover': viewer.role !== 'fan' && ['artist', 'creative', 'brand'].includes(viewer.role) ? {
                    backgroundColor: theme.palette.grey[200],
                  } : {},
                }}
              >
                <Avatar
                  src={viewer.avatarUrl || undefined}
                  alt={viewer.name}
                  sx={{ width: 40, height: 40, mr: 2 }}
                >
                  {viewer.name?.[0] || '?'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>
                      {viewer.name || '이름 없음'}
                      <FiberManualRecordIcon sx={{
                        fontSize: 8, color: theme.palette.status.Success, ml: 1,
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                    <AccessTimeOutlinedIcon sx={{
                      fontSize: 12, color: theme.palette.icon.default, fontWeight: 400
                    }} />
                    <Typography variant="body2" color="text.secondary" fontSize={12}>
                      {formatRelativeTime(viewer.viewedAt)}
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

      {/* 파트너 상세 모달 */}
      <Dialog
        open={partnerModalOpen}
        onClose={() => {
          setPartnerModalOpen(false);
          setSelectedPartner(null);
        }}
        fullWidth
        maxWidth="md"
        scroll="paper"
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(6px)',
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: '768px',
            width: 'calc(100% - 40px)',
            m: { xs: '16px auto', sm: '48px auto' },
            maxHeight: { xs: 'calc(100vh - 64px)', sm: 'calc(100vh - 128px)' },
            overflow: 'hidden',
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        <PartnerDetailContent
          partner={selectedPartner}
          loading={partnerLoading}
          onClose={() => {
            setPartnerModalOpen(false);
            setSelectedPartner(null);
          }}
          showBottomNavigation={false}
          isModal={true}
        />
      </Dialog>
    </Dialog>
  );
}
