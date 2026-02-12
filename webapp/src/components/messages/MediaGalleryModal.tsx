/**
 * MediaGalleryModal
 * Full-screen modal for viewing all media (photos/videos) in a chat room
 * with tabs for filtering and date-grouped 3-column grid layout
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Dialog,
    Box,
    Typography,
    Tab,
    Tabs,
    useTheme,
    Checkbox,
    Button,
    Dialog as ConfirmDialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { LightningLoader } from '../common';
import Header from '../common/Header';
import PlayCircleFilledOutlinedIcon from '@mui/icons-material/PlayCircleFilledOutlined';
import { messageService } from '../../services/messageService';
import type { MediaItem as ServiceMediaItem } from '../../services/messageService';

interface MediaItem {
    id: string;
    messageId?: string; // 메시지 ID (삭제 시 필요)
    url: string;
    type: 'image' | 'video' | 'file';
    name?: string;
    createdAt: string;
}

interface MediaGalleryModalProps {
    open: boolean;
    onClose: () => void;
    roomId: string; // 전체 미디어 로드를 위해 필요
    mediaItems?: MediaItem[]; // 미리보기용 (deprecated, 자체 로드로 대체)
    loading?: boolean;
    onMediaClick?: (item: MediaItem) => void;
    currentUserId?: string;
    isOwner?: boolean;
    isAdmin?: boolean;
    onDeleteMedia?: (items: Array<{ messageId: string; url: string }>) => Promise<void>;
}

// 날짜별로 미디어 그룹화
const groupMediaByDate = (items: MediaItem[]): Map<string, MediaItem[]> => {
    const groups = new Map<string, MediaItem[]>();

    for (const item of items) {
        const date = new Date(item.createdAt);
        const dateKey = `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;

        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(item);
    }

    return groups;
};

export default function MediaGalleryModal({
    open,
    onClose,
    roomId,
    mediaItems: _mediaItems,
    loading: _loading = false,
    onMediaClick,
    isOwner = false,
    isAdmin = false,
    onDeleteMedia,
}: MediaGalleryModalProps) {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState<'photo' | 'video'>('photo');

    // 관리 모드 상태
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // 자체 미디어 로드 상태
    const [allMediaItems, setAllMediaItems] = useState<MediaItem[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);

    // 권한 체크: owner 또는 admin만 관리 가능
    const canManage = isOwner || isAdmin;

    // 전체 미디어 로드
    const loadAllMedia = useCallback(async () => {
        if (!open || !roomId) return;

        setLoadingMedia(true);
        try {
            // limit을 크게 설정하여 모든 미디어 로드 (9999개까지)
            const result = await messageService.getRoomMedia(roomId, 'all', 9999);
            const items: MediaItem[] = result.items.map((item: ServiceMediaItem) => ({
                id: item.messageId,
                messageId: item.messageId,
                url: item.url,
                type: item.type,
                name: item.name,
                createdAt: item.createdAt,
            }));
            setAllMediaItems(items);
        } catch (error) {
            console.error('Failed to load all media:', error);
        } finally {
            setLoadingMedia(false);
        }
    }, [open, roomId]);

    // 모달이 열릴 때 전체 미디어 로드
    useEffect(() => {
        if (open) {
            loadAllMedia();
        }
    }, [open, loadAllMedia]);

    // 사진/동영상 필터링
    const filteredItems = useMemo(() => {
        return allMediaItems.filter(item => {
            if (activeTab === 'photo') {
                return item.type === 'image';
            } else {
                const fileExt = item.url?.split('.').pop()?.toLowerCase() || '';
                return item.type === 'video' || fileExt === 'mp4' || item.name?.toLowerCase().endsWith('.mp4');
            }
        });
    }, [allMediaItems, activeTab]);

    // 날짜별 그룹화
    const groupedItems = useMemo(() => {
        return groupMediaByDate(filteredItems);
    }, [filteredItems]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: 'photo' | 'video') => {
        setActiveTab(newValue);
        // 탭 변경 시 선택 초기화
        setSelectedIds(new Set());
    };

    // 관리 모드 토글
    const handleToggleManageMode = () => {
        if (isManageMode) {
            setSelectedIds(new Set());
        }
        setIsManageMode(!isManageMode);
    };

    // 개별 항목 선택/해제
    const handleToggleSelect = (mediaId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(mediaId)) {
                newSet.delete(mediaId);
            } else {
                newSet.add(mediaId);
            }
            return newSet;
        });
    };

    // 삭제 확인 다이얼로그 열기
    const handleDeleteClick = () => {
        if (selectedIds.size === 0) return;
        setIsConfirmDialogOpen(true);
    };

    // 삭제 확인
    const handleConfirmDelete = async () => {
        if (!onDeleteMedia || selectedIds.size === 0) return;

        setIsDeleting(true);
        try {
            // selectedIds를 {messageId, url} 형식으로 변환
            const itemsToDelete = filteredItems
                .filter(item => selectedIds.has(item.id))
                .map(item => ({
                    messageId: item.messageId || item.id, // messageId가 있으면 사용, 없으면 id 사용 (fallback)
                    url: item.url
                }));

            await onDeleteMedia(itemsToDelete);
            setSelectedIds(new Set());
            setIsManageMode(false);
            setIsConfirmDialogOpen(false);

            // 삭제 후 미디어 목록 새로고침
            await loadAllMedia();
        } catch (error) {
            console.error('Failed to delete media:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    // 삭제 취소
    const handleCancelDelete = () => {
        setIsConfirmDialogOpen(false);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullScreen
                PaperProps={{
                    sx: {
                        bgcolor: theme.palette.background.default,
                    },
                }}
            >
                {/* Header */}
                <Header showBackButton onBackClick={onClose} />

                {/* Manage Buttons (Owner/Admin only) - 헤더 바로 아래 */}
                {canManage && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            px: 2,
                            py: 1,
                            gap: 1,
                            bgcolor: theme.palette.background.paper,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        {isManageMode ? (
                            <>
                                <Button
                                    onClick={handleDeleteClick}
                                    disabled={selectedIds.size === 0 || isDeleting}
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: theme.palette.error.main,
                                        padding: '4px 12px',
                                        borderRadius: 16,
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        '&.Mui-disabled': {
                                            color: theme.palette.text.disabled,
                                        },
                                    }}
                                >
                                    삭제
                                </Button>
                                <Button
                                    onClick={handleToggleManageMode}
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: theme.palette.text.secondary,
                                        padding: '4px 12px',
                                        borderRadius: 16,
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                    }}
                                >
                                    취소
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={handleToggleManageMode}
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: theme.palette.primary.main,
                                    padding: '4px 12px',
                                    borderRadius: 16,
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                }}
                            >
                                관리
                            </Button>
                        )}
                    </Box>
                )}

            {/* Tabs */}
            <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                        '& .MuiTab-root': {
                            fontWeight: 600,
                            fontSize: '14px',
                        },
                        '& .Mui-selected': {
                            color: theme.palette.primary.main,
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: theme.palette.primary.main,
                        },
                    }}
                >
                    <Tab label="사진" value="photo" />
                    <Tab label="동영상" value="video" />
                </Tabs>
            </Box>

            {/* Content */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 2,
                }}
            >
                {loadingMedia ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <LightningLoader />
                    </Box>
                ) : filteredItems.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                            {activeTab === 'photo' ? '사진이 없습니다' : '동영상이 없습니다'}
                        </Typography>
                    </Box>
                ) : (
                    Array.from(groupedItems.entries()).map(([date, items]) => (
                        <Box key={date} sx={{ mb: 3 }}>
                            {/* Date Header */}
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 1, fontWeight: 500 }}
                            >
                                {date}
                            </Typography>

                            {/* 3-column Grid */}
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 0.5,
                                }}
                            >
                                {items.map((item) => {
                                    const isVideo = item.type === 'video' ||
                                        item.url?.split('.').pop()?.toLowerCase() === 'mp4' ||
                                        item.name?.toLowerCase().endsWith('.mp4');

                                    return (
                                        <Box
                                            key={item.id}
                                            onClick={() => !isManageMode && onMediaClick?.(item)}
                                            sx={{
                                                position: 'relative',
                                                paddingTop: '100%', // 1:1 aspect ratio
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                                borderRadius: 1,
                                                bgcolor: theme.palette.grey[100],
                                            }}
                                        >
                                            {/* Checkbox Overlay (Manage Mode) */}
                                            {isManageMode && (
                                                <Box
                                                    onClick={(e) => handleToggleSelect(item.id, e)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        right: 8,
                                                        zIndex: 10,
                                                    }}
                                                >
                                                    <Checkbox
                                                        checked={selectedIds.has(item.id)}
                                                        sx={{
                                                            p: 0,
                                                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                                                            borderRadius: '50%',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(255, 255, 255, 0.95)',
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            )}

                                            {isVideo ? (
                                                <>
                                                    <video
                                                        src={item.url}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                        }}
                                                        muted
                                                        playsInline
                                                    />
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            bgcolor: 'rgba(0,0,0,0.4)',
                                                            borderRadius: '50%',
                                                            p: 0.5,
                                                        }}
                                                    >
                                                        <PlayCircleFilledOutlinedIcon
                                                            sx={{ fontSize: 24, color: '#fff' }}
                                                        />
                                                    </Box>
                                                </>
                                            ) : (
                                                <Box
                                                    component="img"
                                                    src={item.url}
                                                    alt={item.name || 'media'}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    ))
                )}
            </Box>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
            open={isConfirmDialogOpen}
            onClose={handleCancelDelete}
        >
            <DialogTitle>미디어 삭제</DialogTitle>
            <DialogContent>
                <Typography>
                    선택한 {selectedIds.size}개의 미디어를 삭제하시겠습니까?
                    <br />
                    이 작업은 되돌릴 수 없습니다.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={handleCancelDelete}
                    sx={{
                        color: theme.palette.text.secondary,
                    }}
                >
                    취소
                </Button>
                <Button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    sx={{
                        color: theme.palette.error.main,
                        fontWeight: 600,
                    }}
                >
                    {isDeleting ? '삭제 중...' : '삭제'}
                </Button>
            </DialogActions>
        </ConfirmDialog>
    </>
    );
}
