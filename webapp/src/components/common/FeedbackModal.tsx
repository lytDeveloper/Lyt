import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DraggableStarRating from './DraggableStarRating';
import { supabase } from '../../lib/supabase';

interface FeedbackModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit?: (data: FeedbackData) => void;
}

export interface FeedbackData {
    type: string;
    rating: number;
    title: string;
    content: string;
    email: string;
}

const FEEDBACK_TYPES = [
    '기능 오류',
    '기능 사용 불편',
    '기능 개선 제안',
    'UX 흐름 불편',
    'UI 디자인 의견',
    '성능 저하 / 로딩 문제',
    '앱·웹 오류 / 크래시',
    '콘텐츠 정보 부족',
    '잘못된 정보',
    '알림 관련 불편',
    '신규 기능 제안',
    '서비스 전반 의견',
    '기타 의견 (직접 입력)',
];

export default function FeedbackModal({ open, onClose, onSubmit }: FeedbackModalProps) {
    const theme = useTheme();
    const [type, setType] = useState('');
    const [customType, setCustomType] = useState('');
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [email, setEmail] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setType('');
            setCustomType('');
            setRating(0);
            setTitle('');
            setContent('');
            setEmail('');
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!type || !title || !content) return;

        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                alert('로그인이 필요합니다.');
                return;
            }

            const finalType = type === '기타 의견 (직접 입력)' ? `기타: ${customType}` : type;

            // Insert feedback into database
            const { error: insertError } = await supabase
                .from('feedbacks')
                .insert({
                    user_id: user.id,
                    feedback_type: finalType,
                    satisfaction_rating: rating || null,
                    email: email.trim() || null,
                    title: title.trim(),
                    content: content.trim(),
                    status: 'pending',
                });

            if (insertError) {
                console.error('피드백 저장 실패:', insertError);
                alert('피드백 전송에 실패했습니다. 다시 시도해주세요.');
                return;
            }

            // Optional callback
            const data: FeedbackData = {
                type: finalType,
                rating,
                title,
                content,
                email,
            };
            onSubmit?.(data);

            onClose();
            alert('피드백이 전송되었습니다. 소중한 의견 감사합니다!');
        } catch (error) {
            console.error('피드백 전송 중 오류:', error);
            alert('피드백 전송에 실패했습니다. 다시 시도해주세요.');
        }
    };

    const isValid = () => {
        const isTypeValid = type === '기타 의견 (직접 입력)' ? customType.trim() !== '' : type !== '';
        return isTypeValid && title.trim() !== '' && content.trim() !== '';
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    maxHeight: '70vh',
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
                        피드백 보내기
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, border: 'none' }}>
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Feedback Type */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                            피드백 유형 <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                        </Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                displayEmpty
                                renderValue={(selected) => {
                                    if (!selected) {
                                        return <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>선택해주세요</Typography>;
                                    }
                                    return selected;
                                }}
                                sx={{ borderRadius: 2, bgcolor: '#F3F4F6', '& fieldset': { border: 'none' } }}
                            >
                                <MenuItem disabled value="">
                                    <em>선택해주세요</em>
                                </MenuItem>
                                {FEEDBACK_TYPES.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {type === '기타 의견 (직접 입력)' && (
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="의견 유형을 직접 입력해주세요"
                                value={customType}
                                onChange={(e) => setCustomType(e.target.value)}
                                sx={{
                                    mt: 1,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: theme.palette.grey[300],
                                    }
                                }}
                            />
                        )}
                    </Box>

                    {/* Satisfaction Rating */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                            만족도
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DraggableStarRating
                                value={rating}
                                onChange={setRating}
                                size="large"
                            />
                            <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>
                                {rating > 0 ? `${rating}점` : ''}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Title */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                            제목 <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="피드백 제목을 입력해주세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: theme.palette.grey[300],
                                }
                            }}
                        />
                    </Box>

                    {/* Content */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                            상세 내용 <Typography component="span" sx={{ color: 'error.main' }}>*</Typography>
                        </Typography>
                        <TextField
                            multiline
                            rows={5}
                            fullWidth
                            placeholder="개선사항이나 문제점을 자세히 설명해주세요"
                            value={content}
                            onChange={(e) => {
                                if (e.target.value.length <= 500) {
                                    setContent(e.target.value);
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: theme.palette.grey[300],
                                }
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                {content.length}/500자
                            </Typography>
                        </Box>
                    </Box>

                    {/* Email */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1 }}>
                            답변 받을 이메일
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="답변을 받을 이메일 주소 (선택사항)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'background.paper',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: theme.palette.grey[300],
                                }
                            }}
                        />
                    </Box>

                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    size="large"
                    sx={{
                        flex: 1,
                        borderRadius: 6,
                        borderColor: theme.palette.divider,
                        color: 'text.primary',
                        py: 1.2,
                    }}
                >
                    취소
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    size="large"
                    disabled={!isValid()}
                    sx={{
                        flex: 1,
                        borderRadius: 6,
                        bgcolor: '#2563EB',
                        color: 'white',
                        py: 1.2,
                        '&:hover': {
                            bgcolor: '#1D4ED8',
                        },
                    }}
                >
                    피드백 전송
                </Button>
            </DialogActions>
        </Dialog>
    );
}
