import { useState, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    styled,
    useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { toast } from 'react-toastify';
import TagInput from '../../../components/common/TagInput';
import MonthPickerModal from '../../../components/common/MonthPickerModal';
import type { PortfolioItem } from '../../../services/profileService';
import { imageUploadService } from '../../../services/imageUploadService';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

const ModalContent = styled(Box)({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '500px',
    backgroundColor: '#fff',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
    maxHeight: '70vh',
    overflowY: 'auto',
    outline: 'none'
});

interface PickerButtonProps {
    error?: boolean;
}

const PickerButton = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'error'
})<PickerButtonProps>(({ theme, error }) => ({
    width: '100%',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    border: `1px solid ${error ? theme.palette.error.main : '#E5E7EB'}`,
    borderRadius: '12px',
    cursor: 'pointer',
    '&:hover': {
        borderColor: error ? theme.palette.error.dark : theme.palette.primary.main,
    }
}));

interface AddPortfolioModalProps {
    open: boolean;
    onClose: () => void;
    onAdded: (item: PortfolioItem) => void;
    initialData?: PortfolioItem;
}

export default function AddPortfolioModal({ open, onClose, onAdded, initialData }: AddPortfolioModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [performedYM, setPerformedYM] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const [openPicker, setOpenPicker] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

    const formatYM = (ym: string) => {
        if (!ym) return '----년 --월';
        const [y, m] = ym.split('-');
        return `${y}년 ${parseInt(m)}월`;
    };

    // Initialize with data when open changes or initialData changes
    useEffect(() => {
        if (open) {
            setErrors({});
            if (initialData) {
                setTitle(initialData.title);
                setCategory(initialData.category);
                setDescription(initialData.description || '');
                setSkills(initialData.skills || []);
                setPerformedYM(initialData.performed_YM);
                setCoverPreview(initialData.coverImage || '');
                setCoverFile(null);
            } else {
                // Reset for add mode
                setTitle('');
                setCategory('');
                setDescription('');
                setSkills([]);
                setPerformedYM('');
                setCoverFile(null);
                setCoverPreview('');
            }
        }
    }, [open, initialData]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleSubmit = async () => {
        const newErrors: { [key: string]: boolean } = {};
        if (!title) newErrors.title = true;
        if (!description) newErrors.description = true;
        if (!performedYM) newErrors.performedYM = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('필수 항목을 입력해주세요.');
            return;
        }

        try {
            setUploading(true);
            let coverImageUrl = initialData?.coverImage || '';

            if (coverFile) {
                const result = await imageUploadService.uploadImage(coverFile, 'portfolio-covers');
                coverImageUrl = result.publicUrl;
            }

            onAdded({
                ...initialData, // Preserve ID if it exists (though PortfolioItem interface might not have ID yet, treating as value object)
                title,
                category,
                description,
                skills,
                performed_YM: performedYM,
                coverImage: coverImageUrl
            });

            // Reset form
            setTitle('');
            setCategory('');
            setDescription('');
            setSkills([]);
            setPerformedYM('');
            setCoverFile(null);
            setCoverPreview('');
            onClose();
        } catch (error) {
            console.error('Portfolio upload failed:', error);
            toast.error('저장에 실패했어요.');
        } finally {
            setUploading(false);
        }
    };

    const theme = useTheme();

    return (
        <Modal open={open} onClose={onClose}>
            <ModalContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {initialData ? '작업물 수정' : '작업물 추가'}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Form */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>


                    {/* Cover Image Upload */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>커버 이미지</Typography>
                        <Box
                            onClick={() => document.getElementById('portfolio-cover-input')?.click()}
                            sx={{
                                width: '100%',
                                height: '160px',
                                borderRadius: '12px',
                                border: '1px dashed #E5E7EB',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                bgcolor: '#F9FAFB',
                                backgroundImage: coverPreview ? `url(${coverPreview})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {!coverPreview && (
                                <>
                                    <PhotoCameraIcon sx={{ color: '#9CA3AF', fontSize: 32, mb: 1 }} />
                                    <Typography sx={{ color: '#9CA3AF', fontSize: 13 }}>
                                        클릭하여 이미지 업로드
                                    </Typography>
                                </>
                            )}
                            <input
                                id="portfolio-cover-input"
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleImageChange}
                            />
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>프로젝트명</Typography>
                        <TextField
                            fullWidth
                            placeholder="프로젝트 이름을 입력하세요"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (errors.title) setErrors(prev => ({ ...prev, title: false }));
                            }}
                            error={errors.title}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>카테고리</Typography>
                        <TextField
                            fullWidth
                            placeholder="예: UI 디자인, 로고 디자인"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>완료 날짜</Typography>
                        <PickerButton
                            onClick={() => setOpenPicker(true)}
                            error={errors.performedYM}
                        >
                            <Typography sx={{ color: performedYM ? '#111827' : '#9CA3AF' }}>
                                {formatYM(performedYM)}
                            </Typography>
                            <CalendarTodayIcon sx={{ fontSize: '1.2rem', color: errors.performedYM ? theme.palette.error.main : '#6B7280' }} />
                        </PickerButton>
                    </Box>

                    <MonthPickerModal
                        open={openPicker}
                        onClose={() => setOpenPicker(false)}
                        value={performedYM}
                        onChange={(val) => {
                            setPerformedYM(val);
                            if (errors.performedYM) setErrors(prev => ({ ...prev, performedYM: false }));
                        }}
                        title="완료일 선택"
                    />

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>스킬</Typography>
                        <TagInput
                            tags={skills}
                            onTagsChange={setSkills}
                            placeholder="기술 스택을 입력하고 쉼표"
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>설명</Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                if (errors.description) setErrors(prev => ({ ...prev, description: false }));
                            }}
                            error={errors.description}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSubmit}
                        sx={{
                            mt: 2,
                            height: '47px',
                            borderRadius: '30px',
                            fontSize: '16px',
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: theme.palette.primary.main,
                            color: '#fff',
                        }}
                        disabled={uploading}
                    >
                        {uploading ? '저장 중...' : '완료'}
                    </Button>
                </Box>
            </ModalContent>
        </Modal>
    );
}
