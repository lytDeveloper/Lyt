import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Checkbox,
    Typography,
    Box
} from '@mui/material';

interface MultiSelectOption {
    id: string;
    label: string;
    avatar?: string;
    description?: string;
}

interface MultiSelectDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (selected: string[]) => void;
    title: string;
    options: MultiSelectOption[];
    confirmLabel?: string;
    cancelLabel?: string;
    emptyMessage?: string;
}

/**
 * 다중 선택 다이얼로그 컴포넌트
 * 참여자 초대, 권한 부여 등에 사용
 */
export default function MultiSelectDialog({
    open,
    onClose,
    onConfirm,
    title,
    options,
    confirmLabel = '확인',
    cancelLabel = '취소',
    emptyMessage = '선택할 항목이 없어요.'
}: MultiSelectDialogProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // 다이얼로그가 열릴 때마다 선택 초기화
    useEffect(() => {
        if (open) {
            setSelected(new Set());
        }
    }, [open]);

    const handleToggle = (id: string) => {
        setSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selected.size === options.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(options.map(o => o.id)));
        }
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selected));
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {options.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {emptyMessage}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* 전체 선택 */}
                        <Box
                            sx={{
                                px: 2,
                                py: 1,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {selected.size}명 선택됨
                            </Typography>
                            <Button
                                size="small"
                                onClick={handleSelectAll}
                                sx={{ minWidth: 'auto' }}
                            >
                                {selected.size === options.length ? '전체 해제' : '전체 선택'}
                            </Button>
                        </Box>

                        {/* 옵션 리스트 */}
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                            {options.map(option => (
                                <ListItem key={option.id} disablePadding>
                                    <ListItemButton
                                        onClick={() => handleToggle(option.id)}
                                        dense
                                    >
                                        <Checkbox
                                            checked={selected.has(option.id)}
                                            edge="start"
                                            tabIndex={-1}
                                            disableRipple
                                            sx={{ mr: 1 }}
                                        />
                                        <ListItemAvatar sx={{ minWidth: 48 }}>
                                            <Avatar
                                                src={option.avatar}
                                                sx={{ width: 36, height: 36 }}
                                            >
                                                {option.label[0]}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={option.label}
                                            secondary={option.description}
                                            primaryTypographyProps={{
                                                variant: 'body2',
                                                fontWeight: 500
                                            }}
                                            secondaryTypographyProps={{
                                                variant: 'caption'
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button
                    onClick={onClose}
                    color="inherit"
                    sx={{ color: 'text.secondary', borderRadius: '24px' }}
                >
                    {cancelLabel}
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={selected.size === 0}
                    sx={{ borderRadius: '24px' }}
                >
                    {confirmLabel} {selected.size > 0 && `(${selected.size})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
