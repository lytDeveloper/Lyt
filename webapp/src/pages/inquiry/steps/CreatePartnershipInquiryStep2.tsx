import { Box, Typography, Chip, useTheme } from '@mui/material';
import { usePartnershipStore } from '../../../stores/usePartnershipStore';

// 프로젝트 유형 옵션 (스크린샷 2 기준)
const PROJECT_TYPE_OPTIONS = [
    '브랜드 콜라보레이션',
    '제품 개발',
    '마케팅 캠페인',
    '이벤트 기획',
    '콘텐츠 제작',
    '기술 협력',
    '유통 파트너쉽',
    '기타',
] as const;

// 예산 규모 옵션 (스크린샷 3 기준)
const BUDGET_RANGE_OPTIONS = [
    '1천만원 미만',
    '1천만원 - 5천만원',
    '5천만원 - 1억원',
    '1억원 - 5억원',
    '5억원 - 10억원',
    '예산 협의',
] as const;

// 프로젝트 기간 옵션 (스크린샷 4 기준)
const PROJECT_DURATION_OPTIONS = [
    '1개월 이내',
    '1-3개월',
    '3-6개월',
    '6개월-1년',
    '1년 이상',
    '기간 협의',
] as const;

export default function CreatePartnershipInquiryStep2() {
    const { data, updateData } = usePartnershipStore();
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                    프로젝트 정보를 선택해주세요
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Project Type */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5 }}>
                            프로젝트 유형 *
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
                            {PROJECT_TYPE_OPTIONS.map((option) => {
                                const isSelected = data.projectType === option;
                                return (
                                    <Chip
                                        key={option}
                                        label={option}
                                        onClick={() => updateData({ projectType: isSelected ? '' : (option as string) })}
                                        sx={{
                                            width: '46%',
                                            backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.grey[100],
                                            color: isSelected ? theme.palette.primary.contrastText : theme.palette.subText.default,
                                            fontWeight: isSelected ? 600 : 400,
                                            '&:focus': {
                                                bgcolor: theme.palette.primary.main,
                                            },
                                            '&.MuiChip-clickable:hover': {
                                                bgcolor: theme.palette.primary.main,
                                            },

                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Budget Range */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5 }}>
                            예산 규모 *
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
                            {BUDGET_RANGE_OPTIONS.map((option) => {
                                const isSelected = data.budgetRange === option;
                                return (
                                    <Chip
                                        key={option}
                                        label={option}
                                        onClick={() => updateData({ budgetRange: isSelected ? '' : option })}
                                        sx={{
                                            width: '46%',
                                            backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.grey[100],
                                            color: isSelected ? theme.palette.primary.contrastText : theme.palette.subText.default,
                                            fontWeight: isSelected ? 600 : 400,
                                            '&:focus': {
                                                bgcolor: theme.palette.primary.main,
                                            },
                                            '&.MuiChip-clickable:hover': {
                                                bgcolor: theme.palette.primary.main,
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Duration */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1.5 }}>
                            프로젝트 기간 *
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
                            {PROJECT_DURATION_OPTIONS.map((option) => {
                                const isSelected = data.duration === option;
                                return (
                                    <Chip
                                        key={option}
                                        label={option}
                                        onClick={() => updateData({ duration: isSelected ? '' : option })}
                                        sx={{
                                            width: '30%',
                                            backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.grey[100],
                                            color: isSelected ? theme.palette.primary.contrastText : theme.palette.subText.default,
                                            fontWeight: isSelected ? 600 : 400,
                                            '&:focus': {
                                                bgcolor: theme.palette.primary.main,
                                            },
                                            '&.MuiChip-clickable:hover': {
                                                bgcolor: theme.palette.primary.main,
                                            },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>

                </Box>
            </Box>
        </Box>
    );
}

