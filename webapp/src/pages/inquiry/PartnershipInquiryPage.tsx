import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container, useTheme } from '@mui/material';
import { LightningLoader } from '../../components/common';
import { toast } from 'react-toastify';

import { usePartnershipStore } from '../../stores/usePartnershipStore';
import { partnershipService } from '../../services/partnershipService';
import { useProfileStore } from '../../stores/profileStore';
import { brandService, type Brand } from '../../services/brandService';

import PartnershipProgressBar from '../../components/inquiry/PartnershipProgressBar';
import TargetBrandCard from '../../components/inquiry/TargetBrandCard';
import CreatePartnershipInquiryStep1 from './steps/CreatePartnershipInquiryStep1';
import CreatePartnershipInquiryStep2 from './steps/CreatePartnershipInquiryStep2';
import CreatePartnershipInquiryStep3 from './steps/CreatePartnershipInquiryStep3';
import ActionSuccessModal from '../../components/notification/ActionSuccessModal';
import { validateEmail } from '../../utils/validation';
import { CATEGORY_LABELS } from '../../constants/projectConstants';
import type { ProjectCategory } from '../../types/exploreTypes';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';



export default function PartnershipInquiryPage() {
    const { brandId } = useParams<{ brandId: string }>();
    const navigate = useNavigate();
    const myId = useProfileStore((state) => state.userId);
    const theme = useTheme();

    const { step, data, nextStep, prevStep, reset } = usePartnershipStore();

    const [brand, setBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [rating, setRating] = useState<number | null>(null);
    const [projectCount, setProjectCount] = useState<number>(0);

    // Fetch brand info
    useEffect(() => {
        if (!brandId) return;

        const loadBrand = async () => {
            try {
                const b = await brandService.getBrandById(brandId);
                if (!b) {
                    toast.error('브랜드 정보를 찾을 수 없어요.');
                    setLoading(false);
                    return;
                }
                setBrand(b);

                // Load rating and project count
                const [brandRating, count] = await Promise.all([
                    brandService.getBrandRating(brandId),
                    brandService.getBrandProjectCount(brandId),
                ]);
                setRating(brandRating);
                setProjectCount(count);
            } catch (error) {
                console.error('Failed to load brand:', error);
                toast.error('대상 정보를 불러오는데 실패했어요.');
            } finally {
                setLoading(false);
            }
        };
        loadBrand();
    }, [brandId]);

    // Reset store on mount if it's a new session (optional, or keep data)
    // Requirement: "이전 버튼을 눌러 돌아가거나... 입력했던 정보 유지" -> Zustand does this by default.
    // We might want to clear data when leaving the page completely, but keeping it for now is safer for "back" navigation.

    const handleNext = () => {
        // Validation checks before moving
        if (step === 1) {
            if (!data.companyName || !data.contactName || !data.email || !data.phone) {
                toast.warning('모든 필수 항목을 입력해주세요.');
                return;
            }
            if (validateEmail(data.email)) {
                toast.warning('올바른 이메일 형식이 아니에요.');
                return;
            }
        }
        if (step === 2) {
            if (!data.projectType || !data.budgetRange || !data.duration) {
                toast.warning('모든 필수 항목을 선택해주세요.');
                return;
            }
        }

        nextStep();
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        if (!data.description || !data.goals) {
            toast.warning('필수 항목을 입력해주세요.');
            return;
        }
        if (!myId || !brandId) {
            toast.error('사용자 정보를 찾을 수 없어요.');
            return;
        }

        setSubmitting(true);
        try {
            await partnershipService.createInquiry(myId, brandId, data);
            setShowSuccess(true);
            // Store reset will happen after modal close
        } catch (error) {
            console.error(error);
            toast.error('문의 전송에 실패했어요.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        reset(); // Clear form
        navigate(-1); // Go back
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <LightningLoader />
            </Box>
        );
    }

    if (!brand) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>브랜드 정보를 찾을 수 없어요.</Typography>
                <Button onClick={() => navigate(-1)}>돌아가기</Button>
            </Box>
        );
    }

    // Helper to safe get category label
    const getCategoryLabel = (cat: string) => {
        // cat might be "music", "fashion", etc. or Korean label
        if (CATEGORY_LABELS[cat as ProjectCategory]) return CATEGORY_LABELS[cat as ProjectCategory];
        return cat;
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#fff', pb: 10 }}>
            {/* Header */}
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#fff',
                    height: '56px',
                    pt: 0,
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                }}
            >
                <Box
                    onClick={() => navigate(-1)}
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', p: 1 }}
                >
                    <ArrowBackIosNewRoundedIcon sx={{ color: theme.palette.icon.default }} />
                </Box>

            </Box>

            <Container maxWidth="sm" sx={{ pt: 3 }}>
                {/* Top Card */}
                <TargetBrandCard
                    name={brand.name}
                    coverImageUrl={brand.coverImageUrl}
                    activityField={`${getCategoryLabel(brand.activityField)} • 브랜드`}
                    rating={rating}
                    projectCount={projectCount}
                />

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                    <PartnershipProgressBar currentStep={step} totalSteps={3} />
                </Box>

                {/* Step Content */}
                {step === 1 && <CreatePartnershipInquiryStep1 />}
                {step === 2 && <CreatePartnershipInquiryStep2 />}
                {step === 3 && <CreatePartnershipInquiryStep3 />}
            </Container>

            {/* Bottom Navigation Buttons */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    pt: 1,
                    pb: 3,
                    zIndex: 10,
                }}
            >
                <Container maxWidth="sm" sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={step === 1 ? () => navigate(-1) : prevStep}
                        sx={{
                            height: 40,
                            borderRadius: '30px',
                            borderColor: '#E5E7EB',
                            color: '#374151',
                            fontSize: 16,
                            fontWeight: 600,
                        }}
                    >
                        이전
                    </Button>

                    {step < 3 ? (
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleNext}
                            sx={{
                                height: 40,
                                borderRadius: '30px',
                                backgroundColor: '#2563EB',
                                fontSize: 16,
                                fontWeight: 600,
                                boxShadow: 'none',
                            }}
                        >
                            다음
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleSubmit}
                            disabled={submitting}
                            sx={{
                                height: 40,
                                borderRadius: '30px',
                                backgroundColor: '#2563EB',
                                fontSize: 16,
                                fontWeight: 600,
                                boxShadow: 'none',
                            }}
                        >
                            {submitting ? '전송 중...' : '확인'}
                        </Button>
                    )}
                </Container>
            </Box>

            <ActionSuccessModal
                open={showSuccess}
                onClose={handleSuccessClose}
                message="문의가 완료되었어요."
            />
        </Box>
    );
}

