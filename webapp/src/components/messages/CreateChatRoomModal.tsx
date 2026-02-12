import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    Box,
    Typography,
    IconButton,
    TextField,
    Button,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    Checkbox,
    useTheme
} from '@mui/material';
import { LightningLoader } from '../common';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { partnerService, type Partner } from '../../services/partnerService';
import { messageService } from '../../services/messageService';

interface CreateChatRoomModalProps {
    open: boolean;
    onClose: () => void;
    onRoomCreated: (roomId: string) => void;
}

export default function CreateChatRoomModal({ open, onClose, onRoomCreated }: CreateChatRoomModalProps) {
    const theme = useTheme();
    const [step, setStep] = useState<'select-members' | 'room-details'>('select-members');
    const [searchQuery, setSearchQuery] = useState('');
    const [partners, setPartners] = useState<Partner[]>([]);
    const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [roomTitle, setRoomTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Load partners on open
    useEffect(() => {
        if (open) {
            loadPartners();
            setStep('select-members');
            setSelectedPartnerIds([]);
            setRoomTitle('');
            setSearchQuery('');
        }
    }, [open]);

    const loadPartners = async () => {
        setIsLoading(true);
        try {
            const data = await partnerService.getAllPartners();
            setPartners(data);
        } catch (error) {
            console.error('Failed to load partners:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredPartners = useMemo(() => {
        if (!searchQuery.trim()) return partners;
        const query = searchQuery.toLowerCase();
        return partners.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.activityField.toLowerCase().includes(query)
        );
    }, [partners, searchQuery]);

    const handleTogglePartner = (id: string) => {
        setSelectedPartnerIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleNext = () => {
        if (selectedPartnerIds.length === 0) return;
        setStep('room-details');
    };

    const handleCreate = async () => {
        if (!roomTitle.trim()) return;

        setIsCreating(true);
        try {
            const roomId = await messageService.createRoom('team', roomTitle, selectedPartnerIds);
            if (roomId) {
                onRoomCreated(roomId);
                onClose();
            }
        } catch (error) {
            console.error('Failed to create room:', error);
            alert('채팅방 생성에 실패했어요.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    maxHeight: '80vh',
                    height: '600px',
                    display: 'flex',
                    flexDirection: 'column'
                },
            }}
        >
            {/* Header */}
            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'Pretendard', fontSize: 18, fontWeight: 700 }}>
                    {step === 'select-members' ? '새로운 채팅' : '채팅방 정보'}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {step === 'select-members' ? (
                    <>
                        {/* Search Bar */}
                        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: theme.palette.grey[100],
                                borderRadius: '8px',
                                px: 2,
                                py: 1
                            }}>
                                <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
                                <TextField
                                    variant="standard"
                                    placeholder="이름 또는 활동 분야 검색"
                                    fullWidth
                                    InputProps={{ disableUnderline: true }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </Box>
                        </Box>

                        {/* Partner List */}
                        <List sx={{ flex: 1, overflowY: 'auto' }}>
                            {isLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <LightningLoader />
                                </Box>
                            ) : filteredPartners.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center', color: theme.palette.text.secondary }}>
                                    검색 결과가 없어요.
                                </Box>
                            ) : (
                                filteredPartners.map(partner => (
                                    <ListItem key={partner.id} disablePadding>
                                        <ListItemButton onClick={() => handleTogglePartner(partner.id)}>
                                            <ListItemAvatar>
                                                <Avatar src={partner.profileImageUrl} />
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={partner.name}
                                                secondary={partner.activityField}
                                                primaryTypographyProps={{ fontWeight: 600 }}
                                            />
                                            <Checkbox
                                                checked={selectedPartnerIds.includes(partner.id)}
                                                edge="end"
                                                disableRipple
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </>
                ) : (
                    <Box sx={{ p: 3 }}>
                        <Typography sx={{ mb: 1, fontWeight: 600 }}>채팅방 이름</Typography>
                        <TextField
                            fullWidth
                            placeholder="채팅방 이름을 입력해주세요"
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                            sx={{ mb: 3 }}
                        />

                        <Typography sx={{ mb: 2, fontWeight: 600 }}>
                            참여자 ({selectedPartnerIds.length}명)
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {partners
                                .filter(p => selectedPartnerIds.includes(p.id))
                                .map(p => (
                                    <Box key={p.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 60 }}>
                                        <Avatar src={p.profileImageUrl} sx={{ width: 40, height: 40, mb: 0.5 }} />
                                        <Typography variant="caption" noWrap sx={{ width: '100%', textAlign: 'center' }}>
                                            {p.name}
                                        </Typography>
                                    </Box>
                                ))
                            }
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                {step === 'select-members' ? (
                    <Button
                        fullWidth
                        variant="contained"
                        disabled={selectedPartnerIds.length === 0}
                        onClick={handleNext}
                        sx={{
                            height: 48,
                            borderRadius: '12px',
                            bgcolor: theme.palette.primary.main,
                            fontWeight: 700
                        }}
                    >
                        다음 ({selectedPartnerIds.length}명 선택)
                    </Button>
                ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setStep('select-members')}
                            sx={{ height: 48, borderRadius: '12px' }}
                        >
                            이전
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            disabled={!roomTitle.trim() || isCreating}
                            onClick={handleCreate}
                            sx={{
                                height: 48,
                                borderRadius: '12px',
                                bgcolor: theme.palette.primary.main,
                                fontWeight: 700
                            }}
                        >
                            {isCreating ? <LightningLoader size={20} color="inherit" /> : '채팅방 생성'}
                        </Button>
                    </Box>
                )}
            </Box>
        </Dialog>
    );
}
