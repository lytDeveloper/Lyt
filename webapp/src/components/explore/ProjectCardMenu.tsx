import { useState, type ReactNode } from 'react';
import { IconButton, Menu, MenuItem, Typography, ListItemIcon } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import ReasonModal, { type ActionType } from '../common/ReasonModal';
import { hideProject } from '../../services/projectService';
import { blockService } from '../../services/blockService';
import { useTheme } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import NotInterestedOutlinedIcon from '@mui/icons-material/NotInterestedOutlined';

interface ProjectCardMenuProps {
  projectId: string;
  onHide?: (projectId: string) => void;
  onBlock?: (projectId: string) => void;
  onView?: (projectId: string) => void;
  onReport?: (projectId: string) => void;
  menuItems?: MenuActionItem[];
  projectBrandName?: string;
  onActionSuccess?: (action: ActionType) => void;
  leaderId?: string;
  currentUserId?: string;
}

type MenuAction = 'view' | 'hide' | 'block' | 'report' | undefined;

export interface MenuActionItem {
  action?: MenuAction;
  label: string;
  icon?: ReactNode;
  textColor?: string;
  onClick?: (projectId: string) => void;
}
export default function ProjectCardMenu({
  projectId,
  onHide,
  onBlock,
  onView,
  onReport,
  menuItems,
  projectBrandName,
  onActionSuccess,
  leaderId,
  currentUserId,
}: ProjectCardMenuProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const defaultMenuItems: MenuActionItem[] = [
    {
      action: 'hide',
      label: '프로젝트 숨기기',
      icon: <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />
    },
    {
      action: 'block',
      label: '리더/마스터 차단하기',
      textColor: theme.palette.subText.default,
      icon: <NotInterestedOutlinedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />
    },
    {
      action: 'report',
      label: '프로젝트 신고',
      textColor: theme.palette.status.Error,
      icon: <NotInterestedOutlinedIcon sx={{ fontSize: 18, color: theme.palette.status.Error }} />
    },
  ];

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [modalAction, setModalAction] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent card click event
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (_event?: object, _reason?: 'backdropClick' | 'escapeKeyDown') => {
    setAnchorEl(null);
  };

  const handleHide = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleClose();

    if (onHide) {
      onHide(projectId);
      return;
    }

    // Show reason modal
    setModalAction('hide');
  };

  const handleBlock = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleClose();

    if (onBlock) {
      onBlock(projectId);
      return;
    }

    // Show reason modal
    setModalAction('block');
  };

  const handleReasonConfirm = async (reason: string) => {
    if (!modalAction) return;

    setIsLoading(true);
    try {
      if (modalAction === 'hide') {
        await hideProject(projectId, reason);
        toast.success('프로젝트가 숨겨졌습니다');
        // Invalidate explore cache to hide the project immediately
        queryClient.invalidateQueries({ queryKey: ['explore'] });
      } else {
        // Block the leader/master instead of the project
        if (leaderId && currentUserId) {
          await blockService.blockUser(currentUserId, leaderId, reason);
          toast.success('리더/마스터가 차단되었습니다');
          // Invalidate explore cache to hide all content from blocked user
          queryClient.invalidateQueries({ queryKey: ['explore'] });
        } else {
          toast.error('차단할 사용자 정보를 찾을 수 없습니다');
        }
      }
      setModalAction(null);
      onActionSuccess?.(modalAction);
    } catch (error) {
      console.error(`Failed to ${modalAction} project:`, error);
      toast.error(`프로젝트 ${modalAction === 'hide' ? '숨김' : '차단'}에 실패했습니다`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleClose();
    if (onView) {
      onView(projectId);
    } else {
      alert('프로필 보기 기능은 준비중입니다');
    }
  };

  const handleItemClick = (item: MenuActionItem, event: React.MouseEvent) => {
    if (item.onClick) {
      event.stopPropagation();
      handleClose();
      item.onClick(projectId);
      return;
    }

    switch (item.action) {
      case 'view':
        handleView(event);
        break;
      case 'hide':
        handleHide(event);
        break;
      case 'block':
        handleBlock(event);
        break;
      case 'report':
        event.stopPropagation();
        handleClose();
        onReport?.(projectId);
        break;
      default:
        event.stopPropagation();
        handleClose();
    }
  };

  const itemsToRender = menuItems ?? defaultMenuItems;

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        disabled={isLoading}
        sx={{
          p: 0.5,
          color: theme.palette.icon.inner,
        }}
      >
        <MoreHorizIcon sx={{ fontSize: 16 }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          sx: { p: 0 },
        }}
        slotProps={{
          backdrop: {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
            },
          },
        }}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            minWidth: 160,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {itemsToRender.map((item, index) => (
          <MenuItem
            key={`${item.label}-${index}`}
            onClick={(event) => handleItemClick(item, event)}
            disabled={isLoading}
            sx={{ gap: 1 }}
          >
            {item.icon && (
              <ListItemIcon sx={{ color: 'inherit', pl: 1 }}>{item.icon}</ListItemIcon>
            )}
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                color: item.textColor ?? '#374151',
              }}
            >
              {item.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      <ReasonModal
        open={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={handleReasonConfirm}
        actionType={modalAction || 'hide'}
        entityType="project"
        loading={isLoading}
        projectBrandName={projectBrandName}
      />
    </>
  );
}
