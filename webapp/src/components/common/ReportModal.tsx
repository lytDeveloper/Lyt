import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    IconButton,
    TextField,
    Button,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    useTheme,
    Autocomplete,
    Avatar,
    Chip,
    CircularProgress,
    type SelectChangeEvent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { toast } from 'react-toastify';
import { LightningLoader } from './index';
import { reportService, type ReportTargetSearchResult } from '../../services/reportService';

// 신고 유형 정의
export type ReportType =
    | 'inappropriate_content'
    | 'fraud'
    | 'copyright'
    | 'communication'
    | 'other';

// 신고 대상 유형
export type ReportTargetType =
    | 'message'
    | 'project'
    | 'collaboration'
    | 'profile'
    | 'chat_room';

// 신고 유형별 사유 목록
const REPORT_REASONS: Record<ReportType, string[]> = {
    inappropriate_content: [
        '음란/선정적 내용',
        '폭력적 표현',
        '불쾌감을 주는 이미지·문구',
        '미성년자에게 부적절한 내용',
        '스팸/광고',
    ],
    fraud: [
        '사실과 다른 정보 제공',
        '존재하지 않는 이력·성과',
        '금전 요구 또는 외부 결제 유도',
        '의도적인 오해 유발',
    ],
    copyright: [
        '타인의 작업물 무단 사용',
        '출처 미표기',
        'AI 생성물 허위 표기',
        '브랜드·로고 무단 사용',
    ],
    communication: [
        '욕설/공격적 발언',
        '성희롱·차별 발언',
        '반복적인 불쾌한 메시지',
        '협업과 무관한 연락',
    ],
    other: [],
};

// 신고 유형 라벨
const REPORT_TYPE_LABELS: Record<ReportType, string> = {
    inappropriate_content: '부적절한 콘텐츠',
    fraud: '허위·과장 / 사기',
    copyright: '저작권·도용',
    communication: '커뮤니케이션 문제',
    other: '기타',
};

// 역할별 라벨
const ROLE_LABELS: Record<string, string> = {
    brand: '브랜드',
    artist: '아티스트',
    creative: '크리에이티브',
    fan: '팬',
};

interface ReportModalProps {
    open: boolean;
    onClose: () => void;
    targetType?: ReportTargetType;
    targetId?: string;
    targetName?: string;
    onSuccess?: () => void;
}

interface AttachmentFile {
    file: File;
    preview: string;
}

export default function ReportModal({
    open,
    onClose,
    targetType,
    targetId,
    targetName = '',
    onSuccess,
}: ReportModalProps) {
    const theme = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [reportType, setReportType] = useState<ReportType | ''>('');
    const [reason, setReason] = useState<string>('');
    const [targetNameInput, setTargetNameInput] = useState(targetName);
    const [description, setDescription] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // User search states (for when targetId is not provided)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ReportTargetSearchResult[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<ReportTargetSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Determine if we should show user search (no targetId provided)
    const showUserSearch = !targetId;

    // Debounced search effect
    useEffect(() => {
        if (!showUserSearch || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const debounceTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await reportService.searchUsersForReport(searchQuery);
                setSearchResults(results);
            } catch (error) {
                console.error('[ReportModal] Search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, showUserSearch]);

    const handleReportTypeChange = (e: SelectChangeEvent<ReportType | ''>) => {
        setReportType(e.target.value as ReportType);
        setReason(''); // 유형 변경 시 사유 초기화
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles: AttachmentFile[] = [];
        for (let i = 0; i < files.length && attachments.length + newFiles.length < 3; i++) {
            const file = files[i];
            // 파일 크기 검증 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.warning('파일 크기는 10MB 이하여야 합니다.');
                continue;
            }
            // 파일 형식 검증
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                toast.warning('JPG, PNG 형식만 지원됩니다.');
                continue;
            }
            newFiles.push({
                file,
                preview: URL.createObjectURL(file),
            });
        }

        setAttachments((prev) => [...prev, ...newFiles]);
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => {
            const newList = [...prev];
            URL.revokeObjectURL(newList[index].preview);
            newList.splice(index, 1);
            return newList;
        });
    };

    const handleClose = () => {
        // 상태 초기화
        setReportType('');
        setReason('');
        setTargetNameInput(targetName);
        setDescription('');
        setEvidenceUrl('');
        attachments.forEach((a) => URL.revokeObjectURL(a.preview));
        setAttachments([]);
        // 검색 상태 초기화
        setSearchQuery('');
        setSearchResults([]);
        setSelectedTarget(null);
        onClose();
    };

    const handleSubmit = async () => {
        // 유효성 검증
        if (!reportType) {
            toast.warning('신고 유형을 선택해주세요.');
            return;
        }
        if (showUserSearch && !selectedTarget) {
            toast.warning('신고 대상을 검색하여 선택해주세요.');
            return;
        }
        if (!reason && reportType !== 'other') {
            toast.warning('신고 사유를 선택해주세요.');
            return;
        }
        if (!description.trim()) {
            toast.warning('상세 설명을 입력해주세요.');
            return;
        }

        // 최종 targetId 결정
        const finalTargetId = targetId || selectedTarget?.id;
        const finalTargetType = targetType || (selectedTarget ? 'profile' : 'profile');
        const finalTargetName = targetName || selectedTarget?.name || targetNameInput.trim();

        setIsSubmitting(true);
        try {
            const result = await reportService.createReport({
                reportType,
                reason: reason || description.trim(),
                targetType: finalTargetType,
                targetId: finalTargetId!,
                targetName: finalTargetName || undefined,
                description: description.trim() || undefined,
                evidenceUrl: evidenceUrl.trim() || undefined,
                attachmentFiles: attachments.map(a => a.file),
            });

            if (result.success) {
                toast.success('신고가 접수되었어요. 검토 후 조치해드릴게요. ');
                handleClose();
                onSuccess?.();
            } else {
                toast.error(result.error || '신고 접수 중 오류가 발생했어요.');
            }
        } catch (error) {
            console.error('[ReportModal] Error submitting report:', error);
            toast.error('신고 접수 중 오류가 발생했어요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableReasons = reportType ? REPORT_REASONS[reportType] : [];

    // 필수 입력 여부에 따라 신고 버튼 활성화
    const hasTarget = showUserSearch
        ? !!selectedTarget
        : !!(targetName || targetNameInput.trim());
    const hasDescription = !!description.trim();
    const hasReason = reportType === 'other' ? hasDescription : !!reason;
    const isFormValid = !!reportType && hasTarget && hasReason && hasDescription;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    maxHeight: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Header */}
            <DialogTitle component="div" sx={{ pb: 0.5, pr: 6, mb: 2 }}>
                <Box sx={{ fontWeight: 700, fontSize: 18 }}>
                    신고하기
                </Box>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
                    부적절한 콘텐츠나 행동을 신고해주세요
                </Typography>
                <IconButton
                    onClick={handleClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2, pb: 2, flex: 1, overflowY: 'auto' }}>
                {/* 신고 유형 */}
                <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
                    <InputLabel>신고 유형</InputLabel>
                    <Select
                        value={reportType}
                        onChange={handleReportTypeChange}
                        label="신고 유형"
                    >
                        <MenuItem value="" disabled>
                            신고 유형을 선택하세요
                        </MenuItem>
                        {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
                            <MenuItem key={key} value={key}>
                                {label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* 신고 대상 */}
                {showUserSearch ? (
                    /* 사용자 검색 Autocomplete (CustomerSupportPage 등에서 targetId 없이 열린 경우) */
                    <Autocomplete
                        fullWidth
                        size="small"
                        options={searchResults}
                        value={selectedTarget}
                        onChange={(_event, newValue) => setSelectedTarget(newValue)}
                        inputValue={searchQuery}
                        onInputChange={(_event, newInputValue) => setSearchQuery(newInputValue)}
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        loading={isSearching}
                        noOptionsText={searchQuery.length < 2 ? "2글자 이상 입력하세요" : "검색 결과가 없습니다"}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="신고 대상 검색"
                                placeholder="사용자명을 입력하세요"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {isSearching ? <CircularProgress color="inherit" size={18} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                                <Avatar
                                    src={option.avatarUrl}
                                    sx={{ width: 32, height: 32 }}
                                >
                                    {option.name.charAt(0)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                        {option.name}
                                    </Typography>
                                    <Chip
                                        label={ROLE_LABELS[option.role] || option.role}
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: 10,
                                            bgcolor: option.role === 'brand' ? '#FEF3C7' :
                                                option.role === 'artist' ? '#DBEAFE' :
                                                    option.role === 'creative' ? '#F3E8FF' : '#E5E7EB',
                                        }}
                                    />
                                </Box>
                            </Box>
                        )}
                        sx={{ mb: 2.5 }}
                    />
                ) : (
                    /* 대상이 이미 지정된 경우: 읽기 전용 표시 */
                    <TextField
                        fullWidth
                        size="small"
                        label="신고 대상"
                        value={targetName || targetNameInput}
                        onChange={(e) => setTargetNameInput(e.target.value)}
                        disabled={!!targetName}
                        InputProps={{
                            readOnly: !!targetName,
                        }}
                        sx={{ mb: 2.5 }}
                    />
                )}

                {/* 신고 사유 - 항상 표시, 유형 미선택시 disabled */}
                <FormControl fullWidth size="small" sx={{ mb: 2.5 }} disabled={!reportType || reportType === 'other'}>
                    <InputLabel>신고 사유</InputLabel>
                    <Select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        label="신고 사유"

                    >
                        <MenuItem value="" disabled>

                        </MenuItem>
                        {availableReasons.map((r) => (
                            <MenuItem key={r} value={r}>
                                {r}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* 상세 설명 */}
                <Box sx={{ mb: 2.5 }}>
                    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                        상세 설명
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="신고 내용을 자세히 설명해주세요"
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                        inputProps={{ maxLength: 500 }}
                    />
                    <Typography
                        variant="caption"
                        sx={{ display: 'block', textAlign: 'right', color: theme.palette.text.secondary }}
                    >
                        {description.length}/500
                    </Typography>
                </Box>

                {/* 증거 자료 (선택) */}
                <Box sx={{ mb: 2.5 }}>
                    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                        증거 자료 (선택)
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="관련 링크나 추가 정보를 입력해주세요"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                    />
                </Box>

                {/* 첨부 파일 (선택) */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                        첨부 파일 (선택)
                    </Typography>
                    <Box
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            border: `2px dashed ${theme.palette.divider}`,
                            borderRadius: '12px',
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                            },
                        }}
                    >
                        <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: theme.palette.text.secondary, mb: 1 }} />
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            파일을 드래그하거나 클릭하여 업로드
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
                            최대 10MB, JPG, PNG 지원
                        </Typography>
                    </Box>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />

                    {/* 첨부된 파일 미리보기 */}
                    {attachments.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                            {attachments.map((attachment, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        position: 'relative',
                                        width: 64,
                                        height: 64,
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: `1px solid ${theme.palette.divider}`,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={attachment.preview}
                                        alt={`첨부 ${index + 1}`}
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemoveAttachment(index)}
                                        sx={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            bgcolor: 'rgba(0,0,0,0.5)',
                                            color: '#fff',
                                            p: 0.25,
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                        }}
                                    >
                                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </DialogContent>

            {/* 버튼 (하단 고정) */}
            <DialogActions sx={{ px: 3, pb: 3, pt: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleClose}
                        sx={{
                            borderRadius: '24px',
                            py: 1.25,
                            borderColor: theme.palette.divider,
                            color: theme.palette.text.primary,
                        }}
                    >
                        취소
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !isFormValid}
                        sx={{
                            borderRadius: '24px',
                            py: 1.25,
                            bgcolor: isFormValid
                                ? theme.palette.status.Error
                                : theme.palette.action.disabledBackground,
                            color: isFormValid
                                ? theme.palette.common.white
                                : theme.palette.text.disabled,
                            '&:hover': {
                                bgcolor: isFormValid
                                    ? theme.palette.error.dark
                                    : theme.palette.action.disabledBackground,
                            },
                        }}
                    >
                        {isSubmitting ? <LightningLoader size={18} /> : '신고하기'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
