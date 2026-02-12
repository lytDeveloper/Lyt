import { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    Box,
    Typography,
    IconButton,
    Alert,
    useTheme
} from '@mui/material';
import { LightningLoader } from './index';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation } from '@tanstack/react-query';
import { inquiryService } from '../../services/inquiryService';
import { validateImage, createImageUrl, revokeImageUrl, resizeImage } from '../../utils/imageUtils';
import { supabase } from '../../lib/supabase'; // Needed for auth check in useMutation
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

interface InquiryModalProps {
    open: boolean;
    onClose: () => void;
    initialInquiryType?: string;
    initialValues?: {
        subject?: string;
        contents?: string;
        email?: string;
    };
}

export default function InquiryModal({
    open,
    onClose,
    initialInquiryType = 'general',
    initialValues
}: InquiryModalProps) {
    const [inquiryType, setInquiryType] = useState<string>(initialInquiryType);
    const [subject, setSubject] = useState(initialValues?.subject || '');
    const [contents, setContents] = useState(initialValues?.contents || '');
    const [email, setEmail] = useState(initialValues?.email || '');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Constants
    const MAX_FILES = 3;
    const MAX_IMAGE_SIZE = 1280; // Standardize max dimension for resize

    const resetForm = () => {
        setInquiryType(initialInquiryType);
        setSubject('');
        setContents('');
        setEmail('');
        setFiles([]);
        previews.forEach(url => revokeImageUrl(url));
        setPreviews([]);
        setSubmitError(null);
        setSubmitSuccess(false);
    };

    const handleClose = () => {
        if (submitSuccess) {
            resetForm();
        }
        onClose();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) return;

        // Check file count limit
        if (files.length + event.target.files.length > MAX_FILES) {
            alert(`최대 ${MAX_FILES}개까지만 업로드 가능합니다.`);
            return;
        }

        const newFiles: File[] = [];
        const newPreviews: string[] = [];

        for (const file of Array.from(event.target.files)) {
            // Validate
            const error = await validateImage(file, { maxSize: 10 });
            if (error) {
                alert(error);
                continue;
            }

            try {
                // Resize image
                const resizedBlob = await resizeImage(file, MAX_IMAGE_SIZE, MAX_IMAGE_SIZE);
                const resizedFile = new File([resizedBlob], file.name, { type: file.type });

                newFiles.push(resizedFile);
                newPreviews.push(createImageUrl(resizedFile));
            } catch (err) {
                console.error('Image processing failed:', err);
                alert('이미지 처리 중 오류가 발생했어요.');
            }
        }

        setFiles(prev => [...prev, ...newFiles]);
        setPreviews(prev => [...prev, ...newPreviews]);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveFile = (index: number) => {
        const urlToRemove = previews[index];
        revokeImageUrl(urlToRemove);

        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const submitMutation = useMutation({
        mutationFn: async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('로그인이 필요합니다.');
            }

            await inquiryService.submitInquiry(user.id, {
                inquiryType,
                subject,
                contents,
                email,
                files
            });
        },
        onSuccess: () => {
            setSubmitSuccess(true);
            setTimeout(() => {
                handleClose();
            }, 2000);
        },
        onError: (error: Error) => {
            setSubmitError(error.message || '문의 제출 실패');
        }
    });

    const handleSubmit = () => {
        if (!inquiryType || !subject.trim() || !contents.trim()) {
            setSubmitError('문의 유형, 제목, 내용을 모두 입력해주세요.');
            return;
        }
        if (email && !isValidEmail(email)) {
            setSubmitError('올바른 이메일 형식이 아닙니다.');
            return;
        }

        setSubmitError(null);
        submitMutation.mutate();
    };

    const isFormValid = !!inquiryType && !!subject.trim() && !!contents.trim();
    const theme = useTheme();
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"

            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    p: 1,
                    m: 0,
                    maxHeight: '70vh',
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <DialogTitle sx={{ p: 0, fontWeight: 700, fontSize: 16 }}>1:1 문의하기</DialogTitle>
                <IconButton onClick={handleClose} size="small" aria-label="close">
                    <CloseIcon />
                </IconButton>
            </Box>

            <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {submitSuccess && (
                        <Alert severity="success" sx={{ mb: 1 }}>문의사항이 성공적으로 제출되었어요.</Alert>
                    )}
                    {submitError && (
                        <Alert severity="error" sx={{ mb: 1 }}>{submitError}</Alert>
                    )}

                    {/* Inquiry Type */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>문의 유형</Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={inquiryType}
                                onChange={(e) => setInquiryType(e.target.value)}
                                displayEmpty
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value="general">일반 문의</MenuItem>
                                <MenuItem value="ban_appeal">제재 해제 요청</MenuItem>
                                <MenuItem value="account">계정 관련</MenuItem>
                                <MenuItem value="project">프로젝트 관련</MenuItem>
                                <MenuItem value="payment">결제/정산</MenuItem>
                                <MenuItem value="bug">버그 신고</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Subject */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>제목</Typography>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="문의 제목을 입력해주세요"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                    </Box>

                    {/* Content */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>문의 내용</Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={5}
                            placeholder="문의 내용을 자세히 작성해주세요"
                            value={contents}
                            onChange={(e) => setContents(e.target.value)}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                    </Box>

                    {/* File Upload */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>첨부 파일</Typography>
                        <Box
                            sx={{
                                border: '2px dashed #E5E7EB',
                                borderRadius: 2,
                                p: 3,
                                textAlign: 'center',
                                bgcolor: theme.palette.background.default,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: '#9CA3AF', mb: 1 }} />
                            <Typography sx={{ fontSize: 13, color: '#4B5563', fontWeight: 600 }}>
                                파일을 드래그하거나 클릭하여 업로드
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#9CA3AF', mt: 0.5 }}>
                                최대 10MB, JPG, PNG 지원
                            </Typography>
                        </Box>

                        {/* Previews */}
                        {previews.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                                {previews.map((url, idx) => (
                                    <Box key={idx} sx={{ position: 'relative', width: 64, height: 64, borderRadius: 2, overflow: 'hidden', border: '2px dashed #E5E7EB' }}>
                                        <img src={url} alt={`preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemoveFile(idx)}
                                            sx={{
                                                position: 'absolute',
                                                top: 2,
                                                right: 2,
                                                bgcolor: 'rgba(0,0,0,0.5)',
                                                color: 'white',
                                                p: 0.5,
                                            }}
                                        >
                                            <CloseRoundedIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>

                    {/* Email */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>답변 받을 이메일</Typography>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="답변을 받을 이메일 주소"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                    </Box>

                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'center' }}>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={submitMutation.isPending || submitSuccess || !isFormValid}
                    sx={{ borderRadius: '22px', py: 1.2, fontSize: 15, fontWeight: 600, width: '60%' }}
                >
                    {submitMutation.isPending ? <LightningLoader size={20} color="inherit" /> : '문의하기'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
