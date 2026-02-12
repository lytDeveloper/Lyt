import React, { useState, useRef } from 'react';
import { Box, Typography, Avatar, ListItem, ListItemButton, ListItemAvatar, ListItemText, IconButton, useTheme, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import type { PanInfo } from 'framer-motion';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import type { MessageRoom as MessageRoomType } from '../../services/messageService';
import OnlineIndicator from '../common/OnlineIndicator';

interface MessageRoomProps {
    room: MessageRoomType;
    currentUserId?: string;
    onClick: (id: string) => void;
    onPin: (id: string) => void;
    onUnpin: (id: string) => void;
    onToggleNotification: (id: string, enabled: boolean) => void;
    onLeave?: (id: string) => void;
    onDelete?: (id: string) => void;
}

const MessageRoom: React.FC<MessageRoomProps> = ({ room, currentUserId, onClick, onPin, onUnpin, onToggleNotification, onLeave, onDelete }) => {
    const theme = useTheme();
    const x = useMotionValue(0);
    const controls = useAnimation();
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    // 상수
    const SWIPE_THRESHOLD = 80;   // 버튼 노출 임계값
    const DIRECTION_LOCK_THRESHOLD = 15; // 방향 고정 임계값
    const RIGHT_ACTIONS_WIDTH = 180; // 오른쪽 버튼(핀/알림/나가기) 영역 너비
    const LEFT_ACTIONS_WIDTH = 60;  // 왼쪽 버튼(삭제) 영역 너비

    // ref로 드래그 상태 추적 (실시간 접근용)
    const swipeStateRef = useRef<'closed' | 'right-open' | 'left-open'>('closed');
    const lockedDirectionRef = useRef<'left' | 'right' | null>(null);
    const dragStartXRef = useRef(0);

    const isCreator = currentUserId && room.createdBy === currentUserId;
    const canSwipeLeft = isCreator && onDelete; // 왼쪽으로 스와이프(삭제 버튼) 가능 여부

    // 오른쪽 액션 버튼 opacity (왼쪽으로 드래그 시 - 오른쪽 버튼 보임)
    const rightActionsOpacity = useTransform(x, [0, -50], [0, 1]);
    // 왼쪽 액션 버튼 opacity (오른쪽으로 드래그 시 - 왼쪽 버튼 보임)
    const leftActionsOpacity = useTransform(x, [0, 50], [0, 1]);

    const handleDragStart = () => {
        lockedDirectionRef.current = null;
        dragStartXRef.current = x.get();
    };

    const handleDrag = () => {
        const currentX = x.get();
        const startX = dragStartXRef.current;
        const delta = currentX - startX;
        const state = swipeStateRef.current;

        // 1. 방향 고정 (처음 15px 이동 후)
        if (!lockedDirectionRef.current && Math.abs(delta) >= DIRECTION_LOCK_THRESHOLD) {
            lockedDirectionRef.current = delta > 0 ? 'right' : 'left';
        }

        // 2. 상태별 x 값 제한
        let minX: number;
        let maxX: number;

        if (state === 'right-open') {
            // 오른쪽 버튼 열림: 현재 위치(-180)에서 0까지만 이동 가능
            minX = -RIGHT_ACTIONS_WIDTH;
            maxX = 0;
        } else if (state === 'left-open') {
            // 왼쪽 버튼 열림: 0에서 현재 위치(60)까지만 이동 가능
            minX = 0;
            maxX = LEFT_ACTIONS_WIDTH;
        } else {
            // 닫힌 상태
            if (lockedDirectionRef.current === 'left') {
                // 왼쪽으로 드래그 → 오른쪽 버튼 열기
                minX = -RIGHT_ACTIONS_WIDTH;
                maxX = 0;
            } else if (lockedDirectionRef.current === 'right') {
                // 오른쪽으로 드래그 → 왼쪽 버튼 열기 (권한 있을 때만)
                minX = 0;
                maxX = canSwipeLeft ? LEFT_ACTIONS_WIDTH : 0;
            } else {
                // 방향 미결정
                minX = -RIGHT_ACTIONS_WIDTH;
                maxX = canSwipeLeft ? LEFT_ACTIONS_WIDTH : 0;
            }
        }

        // 3. x 값 강제 제한
        if (currentX < minX) {
            x.set(minX);
        } else if (currentX > maxX) {
            x.set(maxX);
        }
    };

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const state = swipeStateRef.current;
        const currentX = x.get();

        if (state === 'right-open') {
            // 오른쪽 버튼 열림 상태: 오른쪽으로 스와이프하면 닫기
            if (info.offset.x > SWIPE_THRESHOLD || currentX > -RIGHT_ACTIONS_WIDTH / 2) {
                // 닫기
                swipeStateRef.current = 'closed';
                controls.start({ x: 0 });
            } else {
                // 원위치 (열린 상태 유지)
                controls.start({ x: -RIGHT_ACTIONS_WIDTH });
            }
        } else if (state === 'left-open') {
            // 왼쪽 버튼 열림 상태: 왼쪽으로 스와이프하면 닫기
            if (info.offset.x < -SWIPE_THRESHOLD || currentX < LEFT_ACTIONS_WIDTH / 2) {
                // 닫기
                swipeStateRef.current = 'closed';
                controls.start({ x: 0 });
            } else {
                // 원위치 (열린 상태 유지)
                controls.start({ x: LEFT_ACTIONS_WIDTH });
            }
        } else {
            // 닫힌 상태
            if (lockedDirectionRef.current === 'left' && (currentX < -SWIPE_THRESHOLD || info.offset.x < -SWIPE_THRESHOLD)) {
                // 왼쪽으로 충분히 스와이프 → 오른쪽 버튼 열기
                swipeStateRef.current = 'right-open';
                controls.start({ x: -RIGHT_ACTIONS_WIDTH });
            } else if (lockedDirectionRef.current === 'right' && canSwipeLeft && (currentX > LEFT_ACTIONS_WIDTH / 2 || info.offset.x > SWIPE_THRESHOLD)) {
                // 오른쪽으로 충분히 스와이프 → 왼쪽 버튼 열기
                swipeStateRef.current = 'left-open';
                controls.start({ x: LEFT_ACTIONS_WIDTH });
            } else {
                // 임계값 미달 → 원위치
                controls.start({ x: 0 });
            }
        }

        lockedDirectionRef.current = null;
    };

    const closeSwipe = () => {
        swipeStateRef.current = 'closed';
        controls.start({ x: 0 });
    };

    const handlePinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (room.isPinned) {
            onUnpin(room.id);
        } else {
            onPin(room.id);
        }
        closeSwipe();
    };

    const handleNotificationClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleNotification(room.id, !room.isNotificationEnabled);
        closeSwipe();
    };

    const handleLeaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLeaveDialogOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteDialogOpen(true);
    };

    const handleConfirmLeave = () => {
        setLeaveDialogOpen(false);
        closeSwipe();
        if (onLeave) {
            onLeave(room.id);
        }
    };

    const handleConfirmDelete = () => {
        setDeleteDialogOpen(false);
        closeSwipe();
        if (onDelete) {
            onDelete(room.id);
        }
    };

    // 채팅 리스트 프리뷰용: react-mentions 저장 포맷(@[이름](id))을 @이름으로 변환
    const previewLastMessage = (text?: string) => {
        if (!text) return '';
        // react-mentions markup: @[__display__](__id__)
        return text.replace(/@\[[^\]]+\]\([^)]+\)/g, (m) => {
            const match = /@\[([^\]]+)\]\([^)]+\)/.exec(m);
            return match?.[1] ? `@${match[1]}` : m;
        });
    };

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#fff' }}>
            {/* Left Action Buttons (삭제 - 오른쪽으로 스와이프 시 보임) */}
            {canSwipeLeft && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: LEFT_ACTIONS_WIDTH,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        zIndex: 0,
                    }}
                >
                    <motion.div style={{ opacity: leftActionsOpacity, display: 'flex', width: '100%', height: '100%', justifyContent: 'flex-start' }}>
                        <IconButton
                            onClick={handleDeleteClick}
                            sx={{
                                borderRadius: '0',
                                bgcolor: theme.palette.error.main,
                                width: '100%',
                                height: '100%',
                            }}
                        >
                            <DeleteIcon sx={{ color: '#fff' }} />
                        </IconButton>
                    </motion.div>
                </Box>
            )}

            {/* Right Action Buttons (핀/알림/나가기 - 왼쪽으로 스와이프 시 보임) */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: RIGHT_ACTIONS_WIDTH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    zIndex: 0,
                }}
            >
                <motion.div style={{ opacity: rightActionsOpacity, display: 'flex', width: '100%', height: '100%', justifyContent: 'flex-end' }}>
                    <IconButton
                        onClick={handlePinClick}
                        sx={{
                            borderRadius: '0',
                            bgcolor: theme.palette.grey[100],
                            width: '33%',
                            height: '100%',
                        }}
                    >
                        {room.isPinned ? <PushPinIcon color="primary" /> : <PushPinOutlinedIcon color="action" />}
                    </IconButton>
                    <IconButton
                        onClick={handleNotificationClick}
                        sx={{
                            borderRadius: '0',
                            bgcolor: theme.palette.bgColor.blue,
                            width: '33%',
                            height: '100%',
                        }}
                    >
                        {room.isNotificationEnabled ? <NotificationsIcon color="primary" /> : <NotificationsOffIcon color="action" />}
                    </IconButton>
                    {onLeave && (
                        <IconButton
                            onClick={handleLeaveClick}
                            sx={{
                                borderRadius: '0',
                                bgcolor: theme.palette.bgColor.red,
                                width: '33%',
                                height: '100%',
                            }}
                        >
                            <LogoutIcon color="warning" />
                        </IconButton>
                    )}
                </motion.div>
            </Box>

            {/* Foreground List Item */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -RIGHT_ACTIONS_WIDTH, right: canSwipeLeft ? LEFT_ACTIONS_WIDTH : 0 }}
                dragElastic={0}
                dragMomentum={false}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x, backgroundColor: '#fff', position: 'relative', zIndex: 1 }}
            >
                <ListItem disablePadding>
                    <ListItemButton
                        alignItems="flex-start"
                        onClick={() => onClick(room.id)}
                        sx={{ px: 2, py: 1.5, bgcolor: room.isPinned ? theme.palette.grey[50] : 'inherit' }}
                    >
                        <ListItemAvatar>
                            <Box sx={{ position: 'relative', width: 48, height: 48 }}>
                                <Avatar alt={room.title} src={room.avatarUrl} sx={{ width: 48, height: 48 }} />
                                {/* 1:1 채팅 또는 파트너 채팅인 경우 온라인 상태 표시 (프로필 사진 우하단 오버랩) */}
                                {room.participantIds && room.participantIds.length > 0 && (
                                    <OnlineIndicator
                                        userId={room.participantIds[0]}
                                        size="medium"
                                        position={{ bottom: -2, right: -2 }}
                                    />
                                )}
                            </Box>
                        </ListItemAvatar>
                        <ListItemText
                            primaryTypographyProps={{ component: 'div' }}
                            secondaryTypographyProps={{ component: 'div' }}
                            primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'nowrap' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1, mr: 1 }}>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '15px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 1,
                                                minWidth: 0
                                            }}
                                        >
                                            {room.type === 'partner' && room.participants.length > 0 ? room.participants.join(', ') : room.title}
                                        </Typography>
                                        {room.type === 'project' && (
                                            <Box sx={{ bgcolor: theme.palette.grey[100], px: 0.6, py: 0.3, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="caption" sx={{ color: theme.palette.subText.default, fontSize: '11px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                    프로젝트
                                                </Typography>
                                            </Box>
                                        )}
                                        {room.type === 'team' && (
                                            <Box sx={{ bgcolor: theme.palette.grey[100], px: 0.6, py: 0.3, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="caption" sx={{ color: theme.palette.subText.default, fontSize: '11px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                    팀
                                                </Typography>
                                            </Box>
                                        )}
                                        {room.type === 'partner' && (
                                            <Box sx={{ bgcolor: theme.palette.grey[100], px: 0.6, py: 0.3, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="caption" sx={{ color: theme.palette.subText.default, fontSize: '11px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                    파트너
                                                </Typography>
                                            </Box>
                                        )}
                                        {room.type === 'collaboration' && (
                                            <Box sx={{ bgcolor: theme.palette.grey[100], px: 0.6, py: 0.3, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="caption" sx={{ color: theme.palette.subText.default, fontSize: '11px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                    협업
                                                </Typography>
                                            </Box>
                                        )}
                                        {room.isPinned && (
                                            <PushPinIcon sx={{ fontSize: 14, color: theme.palette.primary.main, transform: 'rotate(45deg)' }} />
                                        )}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                        {room.lastMessageTime}
                                    </Typography>
                                </Box>
                            }
                            secondary={
                                <Box>
                                    <Typography
                                        sx={{ display: 'block', color: theme.palette.text.primary, fontSize: '14px', mb: 0.5 }}
                                        component="span"
                                        variant="body2"
                                        color={theme.palette.text.primary}
                                    >
                                        {previewLastMessage(room.lastMessage)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '12px' }}>
                                            참여자: {room.participants.join(', ')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {!room.isNotificationEnabled && (
                                                <NotificationsOffIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                                            )}
                                            {room.unreadCount > 0 && (
                                                <Box
                                                    sx={{
                                                        bgcolor: '#3B82F6',
                                                        color: '#fff',
                                                        borderRadius: '50%',
                                                        width: 20,
                                                        height: 20,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {room.unreadCount}
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            }
                        />
                    </ListItemButton>
                </ListItem>
                <Box sx={{ borderBottom: `1px solid ${theme.palette.grey[100]}`, mx: 2 }} />
            </motion.div>

            {/* Leave Confirmation Dialog */}
            <Dialog
                open={leaveDialogOpen}
                onClose={() => setLeaveDialogOpen(false)}
            >
                <DialogTitle>채팅방 나가기</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        이 채팅방에서 나가시겠습니까? 대화 내용은 다른 참여자들에게 계속 보관됩니다.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLeaveDialogOpen(false)} color="inherit">
                        취소
                    </Button>
                    <Button onClick={handleConfirmLeave} color="warning" variant="contained">
                        나가기
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>채팅방 삭제</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        이 채팅방을 삭제하시겠어요? 모든 대화 내용이 영구적으로 삭제돼요. 다른 참여자들도 더 이상 이 채팅방에 접근할 수 없어요.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
                        취소
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        삭제
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MessageRoom;
