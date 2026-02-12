import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Modal,
  useTheme,
  Divider,
} from '@mui/material';
import { LightningLoader } from '../common';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { blockService, type BlockedEntity } from '../../services/blockService';
import { useProfileStore } from '../../stores/profileStore';
import ExpandCircleDownOutlinedIcon from '@mui/icons-material/ExpandCircleDownOutlined';

import BlockIconImg from '../../assets/icon/block/block.png';
import HideIconImg from '../../assets/icon/block/hide.png';
import BlockCriteriaImg from '../../assets/icon/block/blockCriteria.png';
import Header from '../common/Header';
import TabBarFill from '../common/TabBarFill';
import type { Project, Collaboration } from '../../services/exploreService';
import ProjectCard from '../explore/ProjectCard';
import CollaborationCard from '../explore/CollaborationCard';



interface BlockedAccountManagementProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`blocked-tabpanel-${index}`}
      aria-labelledby={`blocked-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function BlockedAccountManagement({ open, onClose }: BlockedAccountManagementProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { profileId } = useProfileStore();
  const [tabValue, setTabValue] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState<BlockedEntity[]>([]);
  const [blockedBrands, setBlockedBrands] = useState<BlockedEntity[]>([]);
  const [hiddenProfiles, setHiddenProfiles] = useState<BlockedEntity[]>([]);
  const [hiddenProjects, setHiddenProjects] = useState<Project[]>([]);
  const [hiddenCollaborations, setHiddenCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(false);

  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // Unblock Confirmation State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<BlockedEntity | null>(null);
  const [actionType, setActionType] = useState<'unblock' | 'unhide'>('unblock');

  const fetchBlockedList = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const [users, brands, profiles, projects, collabs] = await Promise.all([
        blockService.getBlockedUsers(profileId),
        blockService.getBlockedBrands(profileId),
        blockService.getHiddenProfiles(profileId),
        blockService.getHiddenProjects(profileId),
        blockService.getHiddenCollaborations(profileId),
      ]);
      setBlockedUsers(users);
      setBlockedBrands(brands);
      setHiddenProfiles(profiles);
      setHiddenProjects(projects);
      setHiddenCollaborations(collabs);
    } catch (error) {
      console.error('차단 목록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchBlockedList();
    }
  }, [open, profileId]);

  const handleTabChange = (newValue: number) => setTabValue(newValue);

  const handleUnblockClick = (entity: BlockedEntity, type: 'unblock' | 'unhide') => {
    setSelectedEntity(entity);
    setActionType(type);
    setConfirmOpen(true);
  };

  const handleConfirmUnblock = async () => {
    if (!selectedEntity || !profileId) return;

    try {
      await blockService.unblockPartner(profileId, selectedEntity.id);
      setConfirmOpen(false);
      setSuccessOpen(true);
      fetchBlockedList(); // Refresh list
    } catch (error) {
      console.error('차단 해제 실패:', error);
    }
  };

  const handleUnhideProject = async (projectId: string) => {
    if (!profileId) return;
    try {
      await blockService.unhideProject(profileId, projectId);
      fetchBlockedList();
    } catch (error) {
      console.error('프로젝트 숨김 해제 실패:', error);
    }
  };

  const handleUnhideCollaboration = async (collaborationId: string) => {
    if (!profileId) return;
    try {
      await blockService.unhideCollaboration(profileId, collaborationId);
      fetchBlockedList();
    } catch (error) {
      console.error('협업 숨김 해제 실패:', error);
    }
  };

  const renderList = (items: BlockedEntity[], type: 'unblock' | 'unhide', showHeader: boolean = true, showEmptyState: boolean = false) => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <LightningLoader />
        </Box>
      );
    }

    if (items.length === 0) {
      if (!showEmptyState) {
        return null;
      }
      return (
        <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              color: theme.palette.text.secondary,
              fontSize: 24,
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={type === 'unblock' ? BlockIconImg : HideIconImg}
              alt={type === 'unblock' ? 'empty-block' : 'empty-hide'}
              sx={{ width: '100%', height: '100%' }}
            />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {type === 'unblock' ? '차단된 계정이 없어요' : '숨긴 프로필이 없어요'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'keep-all', width: '70%', mx: 'auto' }}>
            {type === 'unblock'
              ? '원하지 않는 브랜드나 아티스트를 차단하면 여기서 관리할 수 있어요.'
              : '프로필을 숨긴 대상을 여기서 관리할 수 있어요.'}
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {showHeader && (
          <Box sx={{ px: 2, py: 0.5, mb: '8px', color: theme.palette.subText.default, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
            {type === 'unblock' ? `차단된 계정` : `프로필을 숨긴 대상`}
            <Typography sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {items.length}
            </Typography>
          </Box>
        )}
        {items.map((item) => (
          <ListItem
            key={item.id}
            sx={{
              borderBottom: `1px solid ${theme.palette.grey[100]}`,
              py: 2,
            }}
            secondaryAction={
              <Button
                variant="contained"
                size="small"
                onClick={() => handleUnblockClick(item, type)}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  borderRadius: '20px',
                  textTransform: 'none',
                  boxShadow: 'none',
                }}
              >
                {type === 'unblock' ? '차단 해제' : '노출 재개'}
              </Button>
            }
          >
            <ListItemAvatar>
              <Avatar src={item.avatarUrl || ''} alt={item.name}>
                {item.name.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                </Box>
              }
              secondary={
                <>
                  <Typography variant="caption" color="text.secondary" display="block">
                    @{item.id.slice(0, 8)}
                  </Typography>
                  {item.reason && (
                    <Typography variant="caption" sx={{ color: '#EF4444', mt: 0.5, display: 'block' }}>
                      사유: {item.reason}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {type === 'unblock' ? '차단일' : '숨김일'}: {new Date(item.blockedAt).toLocaleDateString()}
                  </Typography>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderBlockedAccountTab = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <LightningLoader />
        </Box>
      );
    }

    const hasBlockedUsers = blockedUsers.length > 0;
    const hasBlockedBrands = blockedBrands.length > 0;

    if (!hasBlockedUsers && !hasBlockedBrands) {
      return (
        <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              color: theme.palette.text.secondary,
              fontSize: 24,
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={BlockIconImg}
              alt="empty-block"
              sx={{ width: '100%', height: '100%' }}
            />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            차단된 계정이 없어요
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'keep-all', width: '70%', mx: 'auto' }}>
            원하지 않는 브랜드나 아티스트를 차단하면 여기서 관리할 수 있어요.
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        {/* 차단된 파트너 섹션 */}
        {hasBlockedUsers && (
          <Box sx={{ mb: hasBlockedBrands ? 3 : 0 }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 500, color: theme.palette.subText.default }}>
                차단된 파트너
              </Typography>
              <Typography sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                {blockedUsers.length}
              </Typography>
            </Box>
            {renderList(blockedUsers, 'unblock', false)}
          </Box>
        )}

        {/* 차단된 브랜드 섹션 */}
        {hasBlockedBrands && (
          <Box>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 500, color: theme.palette.subText.default }}>
                차단된 브랜드
              </Typography>
              <Typography sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                {blockedBrands.length}
              </Typography>
            </Box>
            {renderList(blockedBrands, 'unblock', false)}
          </Box>
        )}
      </Box>
    );
  };

  const renderHiddenProjectTab = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <LightningLoader />
        </Box>
      );
    }

    const hiddenItems = [
      ...hiddenProjects.map((p) => ({ type: 'project' as const, data: p })),
      ...hiddenCollaborations.map((c) => ({ type: 'collaboration' as const, data: c })),
    ].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());

    if (hiddenItems.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              color: theme.palette.text.secondary,
              fontSize: 24,
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={HideIconImg}
              alt="empty-hide"
              sx={{ width: '100%', height: '100%' }}
            />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            숨긴 프로젝트·협업이 없어요
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'keep-all', width: '70%', mx: 'auto' }}>
            프로젝트나 협업을 숨기면 여기서 관리할 수 있어요.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ px: 2, pb: 4 }}>
        <Box sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: theme.palette.subText.default }}>
            숨긴 프로젝트·협업
          </Typography>
          <Typography sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {hiddenItems.length}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {hiddenItems.map((item) => (
            item.type === 'project' ? (
              <ProjectCard
                key={item.data.id}
                project={item.data}
                simpleView={true}
                onClick={() => navigate(`/explore/project/${item.data.id}`)}
                typeTag="프로젝트"
                bottomAction={
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnhideProject(item.data.id);
                    }}
                    sx={{
                      width: '70%',
                      height: '40px',
                      borderRadius: '20px',
                      backgroundColor: theme.palette.primary.main,
                      color: '#fff',
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 14,
                      fontWeight: 400,
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        boxShadow: 'none',
                      }
                    }}
                  >
                    숨김 해제
                  </Button>
                }
              />
            ) : (
              <CollaborationCard
                key={item.data.id}
                collaboration={item.data}
                simpleView={true}
                onClick={() => navigate(`/explore/collaboration/${item.data.id}`)}
                typeTag="협업"
                bottomAction={
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnhideCollaboration(item.data.id);
                    }}
                    sx={{
                      width: '70%',
                      height: '40px',
                      borderRadius: '20px',
                      backgroundColor: theme.palette.primary.main,
                      color: '#fff',
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        boxShadow: 'none',
                      }
                    }}
                  >
                    숨김 해제
                  </Button>
                }
              />
            )
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white' }}>
          {/* Header */}
          <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'white' }}>
            <Header showBackButton onBackClick={onClose} />
          </Box>

          <Box sx={{ px: 2, mt: 2 }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: 24 }}>
                숨김/차단 계정 관리
              </Typography>
              <Box sx={{ width: 40 }} /> {/* Spacer for center alignment */}
            </Box>

            <Box sx={{ px: 1.5, pb: 2 }}>
              <Box
                sx={{
                  bgcolor: theme.palette.grey[50],
                  borderRadius: '12px',
                  p: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                }}
              >
                <Box
                  component="img"
                  src={BlockCriteriaImg}
                  alt="block-info"
                  sx={{ width: 34, height: 34, mt: 0.25 }}
                />
                <Box>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1, wordBreak: 'keep-all', lineHeight: 1.5 }}>
                    원하지 않는 사용자, 브랜드, 프로젝트를 관리하여 더 나은 경험을 만드세요.
                  </Typography>

                  <Box
                    onClick={() => setInfoModalOpen(true)}
                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.text.primary, fontSize: 13 }}>
                      자세히 알아보기
                    </Typography>
                    <ChevronRightIcon sx={{ fontSize: 16, color: theme.palette.text.primary }} />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Tabs */}
            <TabBarFill
              tabs={[
                { key: 0, label: '사용자 차단' },
                { key: 1, label: '프로필 숨김' },
                { key: 2, label: '프로젝트·협업 숨김' },
              ]}
              activeTab={tabValue}
              onTabChange={handleTabChange}
            />
          </Box>

          {/* Content */}
          <DialogContent sx={{ p: 0, flex: 1, bgcolor: '#fff' }}>
            <CustomTabPanel value={tabValue} index={0}>
              {renderBlockedAccountTab()}
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={1}>
              {renderList(hiddenProfiles, 'unhide', true, true)}
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={2}>
              {renderHiddenProjectTab()}
            </CustomTabPanel>
          </DialogContent>
        </Box>
      </Dialog>

      {/* Confirmation Modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          boxShadow: 24,
          textAlign: 'center',
          borderRadius: '12px',
          padding: 2,
          py: 3,
          margin: 2,
          width: '60%',
          maxWidth: 360,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: 18, }}>
            {actionType === 'unblock' ? '차단 해제' : '프로필 노출 재개'}
          </Typography>
          <Typography sx={{ mb: 3, wordBreak: 'keep-all', color: theme.palette.text.primary }}>
            <Box component="span" sx={{ fontWeight: 700 }}>{selectedEntity?.name}</Box> 님의
            {actionType === 'unblock' ? ' 차단을 해제하시겠습니까?' : ' 프로필 노출을 재개하시겠습니까?'}
            {actionType === 'unblock' && <br />}
            {/* {actionType === 'unblock' && <Typography component="span" variant="caption" color="text.secondary">해제 후에는 해당 계정의 프로젝트가 다시 표시 됩니다.</Typography>} */}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-around' }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setConfirmOpen(false)}
              sx={{
                height: 40,
                width: '44%',
                borderRadius: '22px',
                color: theme.palette.text.primary,
                borderColor: theme.palette.divider,
                fontSize: 15,
                fontWeight: 500
              }}
            >
              취소
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleConfirmUnblock}
              sx={{
                height: 40,
                width: '44%',
                borderRadius: '22px',
                bgcolor: theme.palette.primary.main,
                boxShadow: 'none',
                fontSize: 15,
                fontWeight: 500
              }}
            >
              {actionType === 'unblock' ? '차단 해제' : '노출 재개'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Success Modal */}
      <Modal open={successOpen} onClose={() => setSuccessOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          borderRadius: '12px',
          padding: 2,
          margin: 2,
          width: '60%',
          maxWidth: 360,
          textAlign: 'center'
        }}>
          <ExpandCircleDownOutlinedIcon sx={{
            fontSize: 24,
            color: theme.palette.icon.default,
            mb: 2
          }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: 18, }}>
            {actionType === 'unblock' ? '차단이 해제되었어요.' : '프로필 노출이 재개되었어요.'}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setSuccessOpen(false)}
            sx={{
              height: 40,
              width: '44%',
              borderRadius: '22px',
              fontSize: 16,
              fontWeight: 600,
              textTransform: 'none',
              mt: 2,
              bgcolor: theme.palette.primary.main,
              boxShadow: 'none'
            }}
          >
            확인
          </Button>
        </Box>
      </Modal>

      <BlockedInfoModal open={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
    </>
  );
}

function BlockedInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();

  const InfoSection = ({
    icon,
    title,
    description,
    items,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    items: (string | React.ReactNode)[];
  }) => (
    <Box sx={{ mb: 4, '&:last-child': { mb: 0 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box sx={{ color: theme.palette.text.primary }}>{icon}</Box>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary, wordBreak: 'keep-all' }}>
        {description}
      </Typography>
      <Box sx={{ bgcolor: '#FFF8F1', p: 2, borderRadius: '8px' }}>
        {items.map((item, index) => (
          <Typography key={index} variant="caption" display="block" sx={{ color: theme.palette.text.primary, mb: 0.5, lineHeight: 1.5, wordBreak: 'keep-all' }}>
            • {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll="paper"
      PaperProps={{
        sx: {
          maxHeight: '70vh',
          maxWidth: '360px',
          borderRadius: '16px',
          m: 2,
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      <DialogContent sx={{ p: 3, flex: 1, overflow: 'auto' }}>
        <InfoSection
          icon={<Box component="img" src={BlockIconImg} alt="block-info" sx={{ width: 24, height: 24 }} />}
          title="사용자 차단"
          description="특정 사용자와의 모든 상호작용을 차단해요."
          items={[
            '차단한 사용자의 프로필이 보이지 않아요.',
            '메시지를 주고받을 수 없어요.',
            '모든 요청을 받을 수 없어요.',
            '추천 목록 및 검색 결과에 표시되지 않아요.',
            '차단 사실은 상대방에게 노출되지 않아요.',
            <>
              <Box component="span" sx={{ fontWeight: 600 }}>브랜드</Box>를 차단할 경우 파트너십 문의가 불가해요.
            </>,
          ]}
        />
        <Divider sx={{ my: 3, }} />
        <InfoSection
          icon={<Box component="img" src={HideIconImg} alt="hide-info" sx={{ width: 30, height: 30 }} />}
          title="프로필 숨기기"
          description="특정 사용자에게 내 활동을 숨겨요."
          items={[
            '추천 목록에서 제외돼요.',
            '메시지는 주고받을 수 있어요.',
            '프로젝트 및 협업 제안은 받을 수 있어요.',
            '사용자와의 1:1 연결 요청이 제한돼요.',
            '숨김 사실은 상대방에게 노출되지 않아요.',
            '상대방에게 나의 활동 기록이 숨겨져요.',
            '게시물 공유 기능이 비활성화돼요.',
            '커뮤니티 이벤트 참여가 불가능해요.',
            '사용자 맞춤 추천이 제공되지 않아요.',
          ]}
        />
        <Divider sx={{ my: 2 }} />
        <InfoSection
          icon={<Box component="img" src={HideIconImg} alt="hide-info" sx={{ width: 30, height: 30 }} />}
          title="프로젝트·협업 숨기기"
          description="프로젝트·협업이 탐색 탭에서 보이지 않아요."
          items={[
            '탐색 탭에서 사용자에게 노출되지 않아요.',
            '프로젝트·협업은 삭제되지 않고, 기존 데이터와 기록은 그대로 유지돼요.',
            '숨긴 프로젝트·협업은 본인 계정에서만 확인하고 관리할 수 있어요.',
            '숨기기를 해제하면 탐색 탭에 다시 정상적으로 보여요.'
          ]}
        />
      </DialogContent>
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'center' }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{
            height: 40,
            width: '80%',
            borderRadius: '24px',
            fontSize: 16,
            fontWeight: 700,
            bgcolor: '#2563EB',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#1d4ed8',
              boxShadow: 'none',
            }
          }}
        >
          확인
        </Button>
      </Box>
    </Dialog>
  );
}


