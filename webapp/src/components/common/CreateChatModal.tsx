import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  Typography,
  Box,
  useTheme,
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import { LightningLoader } from './index';
import { messageService } from '../../services/messageService';
import { toast } from 'react-toastify';
import { useProfileStore } from '../../stores/profileStore';
import { useNavigate } from 'react-router-dom';
// import { TextsmsOutlinedIcon } from '../navigation/BottomNavigationBar';

interface TeamMember {
  id: string;
  name: string;
  profileImageUrl?: string;
  fallbackAvatar?: string;
  activityField?: string;
  isLeader?: boolean;
}

interface CreateChatModalProps {
  open: boolean;
  onClose: () => void;
  members: TeamMember[];
  entityType: 'project' | 'collaboration';
  entityId: string;
  entityTitle: string;
}

export default function CreateChatModal({
  open,
  onClose,
  members,
  entityType,
  entityId,
  entityTitle,
}: CreateChatModalProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const currentUserId = useProfileStore((state) => state.userId);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [chatTitle, setChatTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [includeCreator, setIncludeCreator] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(currentUserId || null);

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.id));
    }
  };

  const handleCreate = async () => {
    if (selectedMembers.length === 0) {
      toast.warning('최소 1명의 멤버를 선택해주세요.');
      return;
    }

    if (!includeCreator && !ownerId) {
      toast.warning('방장을 선택해주세요.');
      return;
    }

    if (!includeCreator && ownerId && !selectedMembers.includes(ownerId)) {
      toast.warning('방장은 참여자 중에서 선택해야 합니다.');
      return;
    }

    setIsCreating(true);
    try {
      const title = chatTitle.trim() || `${entityTitle} 채팅방`;
      // CreateChatModal로 만든 채팅방은 항상 'team' 타입으로 생성 (팀 탭에서 보이도록)
      const roomType = 'team';
      const roomId = await messageService.createRoom(
        roomType,
        title,
        selectedMembers,
        {
          ...(entityType === 'project' ? { projectId: entityId } : { collaborationId: entityId }),
          includeCreator,
          ownerId: includeCreator ? currentUserId || undefined : ownerId || undefined,
        }
      );

      if (roomId) {
        toast.success('이제 라잇으로 이야기해요');
        onClose();
        if (includeCreator) {
          navigate(`/messages/${roomId}`);
        }
      } else {
        toast.error('채팅방 생성에 실패했어요.');
      }
    } catch (error) {
      console.error('[CreateChatModal] Error creating chat room:', error);
      toast.error('채팅방 생성 중 오류가 발생했어요.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedMembers([]);
    setChatTitle('');
    setIncludeCreator(true);
    setOwnerId(currentUserId || null);
    onClose();
  };

  // includeCreator 변경 시 owner 재설정
  useEffect(() => {
    if (includeCreator) {
      setOwnerId(currentUserId || null);
    } else {
      setOwnerId((prev) => {
        if (prev && selectedMembers.includes(prev)) return prev;
        return selectedMembers[0] || null;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCreator]);

  // 선택 멤버 변경 시 owner 유효성 유지
  useEffect(() => {
    if (!includeCreator && ownerId && !selectedMembers.includes(ownerId)) {
      setOwnerId(selectedMembers[0] || null);
    }
  }, [includeCreator, ownerId, selectedMembers]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '16px',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
            채팅방 만들기
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <TextField
          fullWidth
          label="채팅방 이름을 입력해주세요."
          placeholder={`${entityTitle} 채팅방`}
          value={chatTitle}
          onChange={(e) => setChatTitle(e.target.value)}
          size="small"
          sx={{
            mb: 2, mt: 1
          }}
        />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: theme.palette.subText.default }}>
            공유 대상 ({selectedMembers.length}/{members.length})
          </Typography>
          <Button size="small" onClick={handleSelectAll}>
            {selectedMembers.length === members.length ? '전체 해제' : '전체 선택'}
          </Button>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={includeCreator}
              onChange={(e) => setIncludeCreator(e.target.checked)}
            />
          }
          label="나도 참여자에 포함"
          sx={{ mb: 1 }}
        />

        {!includeCreator && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.subText.default, mb: 0.5 }}>
              방장 선택
            </Typography>
            <RadioGroup
              value={ownerId || ''}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              {selectedMembers.map((id) => {
                const member = members.find((m) => m.id === id);
                return (
                  <FormControlLabel
                    key={id}
                    value={id}
                    control={<Radio size="small" />}
                    label={member?.name || '참여자'}
                  />
                );
              })}
            </RadioGroup>
          </Box>
        )}

        <List
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '12px',
          }}
        >
          {members.map((member) => (
            <ListItem key={member.id} disablePadding>
              <ListItemButton onClick={() => handleToggleMember(member.id)} dense>
                <Checkbox
                  checked={selectedMembers.includes(member.id)}
                  tabIndex={-1}
                  disableRipple
                  sx={{ mr: 1 }}
                />
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar
                    src={member.profileImageUrl || member.fallbackAvatar}
                    sx={{ width: 32, height: 32 }}
                  >
                    {(member.name || '').charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {member.name}
                      </Typography>
                      {member.isLeader && (
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            color: '#fff',
                            px: 0.5,
                            borderRadius: '4px',
                            fontSize: 10,
                          }}
                        >
                          리더
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={member.activityField}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {members.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: theme.palette.text.secondary,
              py: 4,
            }}
          >
            선택 가능한 멤버가 없어요.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" sx={{ borderRadius: '20px', minWidth: 140, border: `1px solid ${theme.palette.divider}` }}>
          취소
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={selectedMembers.length === 0 || isCreating}
          sx={{ borderRadius: '20px', minWidth: 140 }}
        >
          {isCreating ? <LightningLoader size={18} /> : '생성하기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}




