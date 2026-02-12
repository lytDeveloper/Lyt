import { useState, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    styled,
    Checkbox,
    FormControlLabel,
    useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { toast } from 'react-toastify';
import TagInput from '../../../components/common/TagInput';
import MonthPickerModal from '../../../components/common/MonthPickerModal';
import type { CareerItem } from '../../../services/profileService';

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
    disabled?: boolean;
}

const PickerButton = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'error' && prop !== 'disabled'
})<PickerButtonProps>(({ theme, error, disabled }) => ({
    flex: 1,
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    border: `1px solid ${error ? theme.palette.error.main : '#E5E7EB'}`,
    borderRadius: '12px',
    cursor: disabled ? 'default' : 'pointer',
    backgroundColor: disabled ? '#F9FAFB' : 'transparent',
    '&:hover': {
        borderColor: disabled ? (error ? theme.palette.error.main : '#E5E7EB') : (error ? theme.palette.error.dark : theme.palette.primary.main),
    }
}));

interface AddCareerModalProps {
    open: boolean;
    onClose: () => void;
    onAdded: (item: CareerItem) => void;
    initialData?: CareerItem;
    isBrand?: boolean;
}

export default function AddCareerModal({ open, onClose, onAdded, initialData, isBrand = false }: AddCareerModalProps) {
    // 브랜드 유저일 경우 '경력' → '히스토리'로 표시
    const careerLabel = isBrand ? '히스토리' : '경력';
    const firstLabel = isBrand ? '타이틀' : '소속';
    const firstPlaceholder = isBrand ? '타이틀을 입력하세요' : '회사 이름을 입력하세요';
    const secondLabel = isBrand ? '서브 타이틀' : '담당 역할';
    const secondPlaceholder = isBrand ? '서브 타이틀을 입력하세요' : '직급을 입력하세요';
    const presentLabel = isBrand ? '현재 진행중' : '현재 재직 중';
    const thirdLabel = isBrand ? '키워드' : '스킬';
    const thirdPlaceholder = isBrand ? '키워드를 입력하고 쉼표' : '기술 스택을 입력하고 쉼표';
    const descPlaceholder = isBrand ? '브랜드 히스토리에 대한 설명을 작성해 주세요' : '역할 및 기여에 대한 간단한 설명을 입력하세요';

    const [companyName, setCompanyName] = useState('');
    const [position, setPosition] = useState('');
    const [startYM, setStartYM] = useState('');
    const [endYM, setEndYM] = useState('');
    const [isPresent, setIsPresent] = useState(false);
    const [description, setDescription] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

    const formatYM = (ym: string) => {
        if (!ym) return '----년 --월';
        const [y, m] = ym.split('-');
        return `${y}년 ${parseInt(m)}월`;
    };

    useEffect(() => {
        if (open) {
            setErrors({});
            if (initialData) {
                setCompanyName(initialData.companyName);
                setPosition(initialData.position);
                setDescription(initialData.description || '');
                setSkills(initialData.skills || []);

                // Parse period string "YYYY-MM ~ YYYY-MM" or "YYYY-MM ~ 현재"
                if (initialData.period) {
                    const parts = initialData.period.split(' ~ ');
                    if (parts.length >= 1) setStartYM(parts[0]);
                    if (parts.length >= 2) {
                        if (parts[1] === '현재') {
                            setIsPresent(true);
                            setEndYM('');
                        } else {
                            setIsPresent(false);
                            setEndYM(parts[1]);
                        }
                    }
                }
            } else {
                // Reset state for new entry
                setCompanyName('');
                setPosition('');
                setStartYM('');
                setEndYM('');
                setIsPresent(false);
                setDescription('');
                setSkills([]);
            }
        }
    }, [open, initialData]);

    const handleSubmit = () => {
        const newErrors: { [key: string]: boolean } = {};
        if (!companyName) newErrors.companyName = true;
        if (!position) newErrors.position = true;
        if (!startYM) newErrors.startYM = true;
        if (!isPresent && !endYM) newErrors.endYM = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('필수 정보를 모두 입력해주세요.');
            return;
        }

        // Date Validation
        if (!isPresent && startYM && endYM) {
            if (endYM < startYM) {
                setErrors({ startYM: true, endYM: true });
                toast.error('종료일이 시작일보다 빠를 수 없어요.');
                return;
            }
        }

        const period = isPresent ? `${startYM} ~ 현재` : `${startYM} ~ ${endYM}`;

        onAdded({
            ...initialData,
            companyName,
            period,
            position,
            description,
            skills
        });

        // Reset fields handled by useEffect or parent
        onClose();
    };
    const theme = useTheme();
    return (
        <Modal open={open} onClose={onClose}>
            <ModalContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {initialData ? `${careerLabel} 수정` : `${careerLabel} 추가`}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Form */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>{firstLabel}</Typography>
                        <TextField
                            fullWidth
                            placeholder={firstPlaceholder}
                            value={companyName}
                            onChange={(e) => {
                                setCompanyName(e.target.value);
                                if (errors.companyName) setErrors(prev => ({ ...prev, companyName: false }));
                            }}
                            error={errors.companyName}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>{secondLabel}</Typography>
                        <TextField
                            fullWidth
                            placeholder={secondPlaceholder}
                            value={position}
                            onChange={(e) => {
                                setPosition(e.target.value);
                                if (errors.position) setErrors(prev => ({ ...prev, position: false }));
                            }}
                            error={errors.position}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>기간</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <PickerButton
                                onClick={() => setOpenPicker('start')}
                                error={errors.startYM}
                            >
                                <Typography sx={{ color: startYM ? '#111827' : '#9CA3AF' }}>
                                    {formatYM(startYM)}
                                </Typography>
                                <CalendarTodayIcon sx={{ fontSize: '1.2rem', color: errors.startYM ? theme.palette.error.main : '#6B7280' }} />
                            </PickerButton>

                            <Typography sx={{ color: '#9CA3AF' }}>~</Typography>

                            <PickerButton
                                onClick={() => !isPresent && setOpenPicker('end')}
                                disabled={isPresent}
                                error={errors.endYM}
                            >
                                <Typography sx={{ color: isPresent ? '#9CA3AF' : (endYM ? '#111827' : '#9CA3AF') }}>
                                    {isPresent ? '현재' : formatYM(endYM)}
                                </Typography>
                                {!isPresent && <CalendarTodayIcon sx={{ fontSize: '1.2rem', color: errors.endYM ? theme.palette.error.main : '#6B7280' }} />}
                            </PickerButton>
                        </Box>
                        <FormControlLabel
                            control={<Checkbox checked={isPresent} onChange={(e) => setIsPresent(e.target.checked)} />}
                            label={presentLabel}
                            sx={{ mt: 1 }}
                        />
                    </Box>

                    <MonthPickerModal
                        open={openPicker !== null}
                        onClose={() => setOpenPicker(null)}
                        value={openPicker === 'start' ? startYM : endYM}
                        onChange={(val) => {
                            if (openPicker === 'start') {
                                setStartYM(val);
                                if (errors.startYM) setErrors(prev => ({ ...prev, startYM: false }));
                            }
                            else {
                                setEndYM(val);
                                if (errors.endYM) setErrors(prev => ({ ...prev, endYM: false }));
                            }
                        }}
                        title={openPicker === 'start' ? '시작일 선택' : '종료일 선택'}
                        minDate={openPicker === 'end' ? startYM : undefined}
                    />

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>{thirdLabel}</Typography>
                        <TagInput
                            tags={skills}
                            onTagsChange={setSkills}
                            placeholder={thirdPlaceholder}
                        />
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>설명</Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder={descPlaceholder}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={onClose}
                            sx={{
                                height: '47px',
                                borderRadius: '30px',
                                fontSize: '16px',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderColor: '#E5E7EB',
                                color: '#6B7280',
                                '&:hover': {
                                    borderColor: '#D1D5DB',
                                    bgcolor: '#F9FAFB'
                                }
                            }}
                        >
                            취소
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleSubmit}
                            sx={{
                                height: '47px',
                                borderRadius: '30px',
                                fontSize: '16px',
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: theme.palette.primary.main,
                                color: '#fff',
                            }}
                        >
                            {isBrand ? (initialData ? '수정하기' : '+ 추가하기') : '완료'}
                        </Button>
                    </Box>
                </Box>
            </ModalContent>
        </Modal>
    );
}
