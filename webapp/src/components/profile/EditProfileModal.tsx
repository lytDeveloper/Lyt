import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Dialog,
    Box,
    Typography,
    IconButton,
    Button,
    TextField,
    Avatar,
    Stack,
    MenuItem,
    Select,
    Chip,
    RadioGroup,
    Radio,
    Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import {
    SiInstagram,
    SiYoutube,
    SiTiktok,
    SiThreads,
    SiNaver,
} from 'react-icons/si';

import { profileService } from '../../services/profileService';
import { profileQueryService } from '../../services/profileQueryService';
import ConfirmDialog from '../common/ConfirmDialog';
import ChipSelector from '../common/ChipSelector';
import ActivityFieldKeywordPicker from '../onboarding/ActivityFieldKeywordPicker';
import { getCreatorTypesByActivityField } from '../../constants/brandCreatorTypes';
import { EXTENDED_CATEGORIES, CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_VALUES } from '../../constants/projectConstants';
import type { ProfileType } from '../../stores/profileStore';
import type { ProjectCategory } from '../../types/exploreTypes';

// 상수 정의
const ACTIVITY_FIELDS = ['음악', '패션', '뷰티', '콘텐츠', '마켓', '재테크', '라이브쇼핑', '이벤트', '문화', '디지털', '라이프', '힐링'];
const TARGET_GENERATIONS = ['10대', '20대', '30대', '40대 이상'];
const COLLABORATION_TYPES = ['공동구매', '유료광고', '이벤트', '굿즈제작', '제품협찬', '프로젝트'];
const BUDGET_RANGES = ['100만원 이하', '100-500만원', '500-1,000만원', '1,000만원 이상'];
const PERSONA_OPTIONS = [
    { id: '탐험가', label: '오지를 탐험하는 탐험가', description: '새로운 아티스트의 브랜드를 발견해요.' },
    { id: '트렌드세터', label: '세상을 파악하는 눈을 가진 트렌드세터', description: '최신 트렌드를 파악해요.' },
    { id: '서포터', label: '묵묵히 뒤에서 비춰주는 서포터', description: '아티스트를 응원해요.' },
];
const REGION_OPTIONS = [
    '전체', '서울', '경기', '인천', '광주', '부산', '대구', '대전', '세종',
    '강원', '울산', '충북', '충남', '전북', '전남', '경남', '경북', '제주',
];
const ACQUISITION_OPTIONS = [
    { value: 'DM 제안', label: 'DM 제안' },
    { value: '인스타 광고', label: '인스타 광고' },
    { value: '지인 추천', label: '지인 추천' },
    { value: '인터넷 검색', label: '인터넷 검색' },
    { value: '기타', label: '기타' },
];

// Static components defined outside to prevent re-renders
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{children}</Typography>
);

const FormSection = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>{children}</Box>
);

interface EditProfileModalProps {
    open: boolean;
    onClose: () => void;
    profileType: ProfileType;
    profileData: any;
    onSuccess: () => void;
    fanProfileNickname?: string | null;
}

// SNS 채널 옵션 타입 정의
interface SnsChannelOption {
    type: string;
    name: string;
    url: string;
    icon: React.ElementType;
    iconColor: string;
    color: string;
    domain: string;
    is_main: boolean;
}

// 사용 가능한 SNS 채널 정의
const AVAILABLE_CHANNELS: Omit<SnsChannelOption, 'url' | 'is_main'>[] = [
    {
        type: 'instagram',
        name: 'Instagram',
        icon: SiInstagram,
        iconColor: '#E4405F', // Step2_addChannels.tsx와 동일
        color: '', // Step2_addChannels.tsx와 동일 (빈 문자열)
        domain: 'http://www.instagram.com/',
    },
    {
        type: 'youtube',
        name: 'Youtube',
        icon: SiYoutube,
        iconColor: '#FFFFFF',
        color: '#FF0000',
        domain: 'http://www.youtube.com/',
    },
    {
        type: 'naver',
        name: 'Naver',
        icon: SiNaver,
        iconColor: '#FFFFFF',
        color: '#03C75A',
        domain: 'http://blog.naver.com/',
    },
    {
        type: 'tiktok',
        name: 'Tiktok',
        icon: SiTiktok,
        iconColor: '#000000',
        color: '#FFFFFF',
        domain: 'http://www.tiktok.com/',
    },
    {
        type: 'threads',
        name: 'Threads',
        icon: SiThreads,
        iconColor: '#FFFFFF',
        color: '#000000',
        domain: 'http://www.threads.net/@',
    },
];

const DEFAULT_COVER_IMAGE_URL = 'https://xianrhwkdarupnvaumti.supabase.co/storage/v1/object/public/assets/defaults/cover.png';

export default function EditProfileModal({
    open,
    onClose,
    profileType,
    profileData,
    onSuccess,
    fanProfileNickname,
}: EditProfileModalProps) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [businessRegChangeConfirmOpen, setBusinessRegChangeConfirmOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<any>({});
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previews, setPreviews] = useState({ cover: '', logo: '' });

    // Selection states
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<string[]>([]);
    const [selectedCreatorTypes, setSelectedCreatorTypes] = useState<string[]>([]);
    const [selectedCollaborationTypes, setSelectedCollaborationTypes] = useState<string[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [selectedSpecificInterests, setSelectedSpecificInterests] = useState<string[]>([]);
    const [selectedPreferredRegions, setSelectedPreferredRegions] = useState<string[]>([]);
    const [selectedSnsChannels, setSelectedSnsChannels] = useState<SnsChannelOption[]>([]);
    // 해제된 채널의 데이터를 유지하기 위한 상태
    const [deselectedChannels, setDeselectedChannels] = useState<Map<string, SnsChannelOption>>(new Map());
    const [acquisitionOption, setAcquisitionOption] = useState<string>('');
    const [acquisitionOtherText, setAcquisitionOtherText] = useState<string>('');

    // Refs for file inputs
    const coverInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Dynamic creator types based on activity field
    const availableCreatorTypes = useMemo(() => {
        return getCreatorTypesByActivityField(formData.activity_field);
    }, [formData.activity_field]);

    // Memoize Korean interests for ActivityFieldKeywordPicker (팬 프로필용)
    const koreanInterestsForPicker = useMemo(() => {
        if (profileType !== 'fan' || selectedInterests.length === 0) return [];
        return selectedInterests.map((interest: string) => {
            // interest가 이미 한국어인지 확인
            if (CATEGORY_LABELS[interest as ProjectCategory]) {
                return CATEGORY_LABELS[interest as ProjectCategory];
            }
            // interest가 영어 카테고리 값인 경우 한국어로 변환
            return CATEGORY_LABELS[interest as ProjectCategory] || interest;
        }).filter(Boolean);
    }, [selectedInterests, profileType]);

    // Initialize form with existing data
    useEffect(() => {
        if (open && profileData) {
            const initialData: any = { ...profileData };

            // 팬의 경우 fanProfileNickname 사용
            if (profileType === 'fan' && fanProfileNickname) {
                initialData.nickname = fanProfileNickname;
            }

            setFormData(initialData);

            // 팬의 경우 커버 이미지를 기본 이미지로 고정
            const coverUrl = profileType === 'fan'
                ? DEFAULT_COVER_IMAGE_URL
                : (initialData.cover_image_url || '');

            setPreviews({
                cover: coverUrl,
                logo: initialData.logo_image_url || initialData.profile_image_url || ''
            });
            setCoverFile(null);
            setLogoFile(null);

            // Initialize selection states
            setSelectedTags(Array.isArray(initialData.tags) ? initialData.tags : []);
            setSelectedTargetAudiences(Array.isArray(initialData.target_audiences) ? initialData.target_audiences : []);
            setSelectedCreatorTypes(Array.isArray(initialData.preferred_creator_types) ? initialData.preferred_creator_types : []);
            setSelectedCollaborationTypes(Array.isArray(initialData.collaboration_types) ? initialData.collaboration_types : []);
            // 팬의 interests는 배열로 확실히 설정
            // interests가 한국어 값(['패션', '음악', '뷰티'])으로 저장되어 있을 수 있으므로 영어 값으로 변환
            const interestsArray = Array.isArray(initialData.interests) ? initialData.interests : [];
            const convertedInterests = interestsArray.map((interest: string) => {
                // 이미 영어 값이면 그대로 사용
                if (EXTENDED_CATEGORIES.includes(interest as ProjectCategory)) {
                    return interest;
                }
                // 한국어 값이면 영어 값으로 변환
                const englishValue = CATEGORY_VALUES[interest];
                return englishValue || interest;
            });
            setSelectedInterests(convertedInterests);
            setSelectedSpecificInterests(Array.isArray(initialData.specific_interests) ? initialData.specific_interests : []);
            setSelectedPreferredRegions(Array.isArray(initialData.preferred_regions) ? initialData.preferred_regions : []);

            // Initialize SNS channels (Creative)
            if (profileType === 'creative' && initialData.sns_channels) {
                // sns_channels가 배열인지 확인
                const snsChannelsArray = Array.isArray(initialData.sns_channels)
                    ? initialData.sns_channels
                    : [];

                const channels: SnsChannelOption[] = snsChannelsArray.map((ch: any) => {
                    // ch가 객체인지 확인하고, type 또는 platform 필드 사용
                    const channelType = ch?.type || ch?.platform || '';
                    const channelInfo = AVAILABLE_CHANNELS.find(c => c.type === channelType);
                    if (channelInfo) {
                        return {
                            ...channelInfo,
                            url: ch.url || channelInfo.domain,
                            is_main: ch.is_main || false,
                        };
                    }
                    return null;
                }).filter((ch: SnsChannelOption | null): ch is SnsChannelOption => ch !== null);
                setSelectedSnsChannels(channels);
            } else {
                setSelectedSnsChannels([]);
            }

            // Initialize acquisition source (Creative)
            const storedSource = initialData.acquisition_source || '';
            const isKnownOption = ACQUISITION_OPTIONS.some(opt => opt.value === storedSource);
            if (isKnownOption) {
                setAcquisitionOption(storedSource);
                setAcquisitionOtherText('');
            } else if (storedSource) {
                setAcquisitionOption('기타');
                setAcquisitionOtherText(storedSource);
            } else {
                setAcquisitionOption('');
                setAcquisitionOtherText('');
            }
        }
    }, [open, profileData, profileType, fanProfileNickname]);

    // Reset creator types when activity field changes
    useEffect(() => {
        if (formData.activity_field && availableCreatorTypes.length > 0) {
            setSelectedCreatorTypes(prev =>
                prev.filter(creator => availableCreatorTypes.includes(creator))
            );
        }
    }, [formData.activity_field, availableCreatorTypes]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo') => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === 'cover') {
                setCoverFile(file);
                setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(file) }));
            } else {
                setLogoFile(file);
                setPreviews(prev => ({ ...prev, logo: URL.createObjectURL(file) }));
            }
        }
    };

    const handleInterestToggle = (cat: string) => {
        if (selectedInterests.includes(cat)) {
            setSelectedInterests(prev => prev.filter(i => i !== cat));
        } else if (selectedInterests.length < 3) {
            setSelectedInterests(prev => [...prev, cat]);
        }
    };

    const handleSaveClick = async () => {
        // Basic Validation
        if (profileType === 'brand' && !formData.brand_name?.trim()) {
            toast.error('브랜드 이름을 입력해주세요.');
            return;
        }
        if (profileType === 'artist' && !formData.artist_name?.trim()) {
            toast.error('아티스트 이름을 입력해주세요.');
            return;
        }
        if ((profileType === 'creative' || profileType === 'fan') && !formData.nickname?.trim()) {
            toast.error('닉네임을 입력해주세요.');
            return;
        }

        // 브랜드 사업자 등록번호 변경 체크
        if (profileType === 'brand') {
            const originalBizNum = profileData?.business_registration_number || '';
            const newBizNum = formData.business_registration_number || '';
            if (originalBizNum !== newBizNum && newBizNum.trim() !== '') {
                // 사업자 등록번호가 변경되면 경고 다이얼로그 표시
                setBusinessRegChangeConfirmOpen(true);
                return;
            }
        }

        setConfirmOpen(true);
    };

    const handleBusinessRegChangeConfirm = () => {
        setBusinessRegChangeConfirmOpen(false);
        setConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setConfirmOpen(false);
        setLoading(true);

        try {
            // 1. 중복 체크 (이름/닉네임이 변경된 경우에만)
            if (profileType === 'brand' && formData.brand_name !== profileData.brand_name) {
                const isDuplicate = await profileQueryService.checkBrandNameDuplicate(formData.brand_name, profileData.profile_id);
                if (isDuplicate) {
                    toast.error('이미 존재하는 브랜드 이름입니다.');
                    setLoading(false);
                    return;
                }
            } else if (profileType === 'artist' && formData.artist_name !== profileData.artist_name) {
                const isDuplicate = await profileQueryService.checkArtistNameDuplicate(formData.artist_name, profileData.profile_id);
                if (isDuplicate) {
                    toast.error('이미 존재하는 아티스트 이름입니다.');
                    setLoading(false);
                    return;
                }
            } else if (profileType === 'creative' && formData.nickname !== profileData.nickname) {
                const isDuplicate = await profileQueryService.checkCreativeNicknameDuplicate(formData.nickname, profileData.profile_id);
                if (isDuplicate) {
                    toast.error('이미 존재하는 닉네임입니다.');
                    setLoading(false);
                    return;
                }
            } else if (profileType === 'fan' && formData.nickname !== fanProfileNickname) {
                const isDuplicate = await profileQueryService.checkNicknameDuplicate(
                    formData.nickname,
                    profileData.profile_id
                );

                if (isDuplicate) {
                    toast.error('이미 존재하는 닉네임입니다.');
                    setLoading(false);
                    return;
                }
            }

            // 2. 데이터 준비 및 업서트
            if (profileType === 'brand') {
                // 사업자 등록번호 변경 여부 확인
                const originalBizNum = profileData?.business_registration_number || '';
                const newBizNum = formData.business_registration_number || '';
                const bizNumChanged = originalBizNum !== newBizNum;

                await profileService.createBrandProfile({
                    brandName: formData.brand_name,
                    description: formData.description || '',
                    activityField: formData.activity_field || '',
                    targetAudiences: selectedTargetAudiences,
                    preferredCreatorTypes: selectedCreatorTypes,
                    collaborationTypes: selectedCollaborationTypes,
                    monthlyBudget: formData.monthly_budget || '',
                    websiteUrl: formData.website_url || '',
                    snsChannel: formData.sns_channel || '',
                    contactInfo: formData.contact_info || '',
                    tags: selectedTags,
                    region: formData.region || '',
                    businessRegistrationNumber: formData.business_registration_number || '',
                    coverFile: coverFile || undefined,
                    logoFile: logoFile || undefined,
                    existingCoverUrl: profileData?.cover_image_url || '',
                    existingLogoUrl: profileData?.logo_image_url || '',
                    resetApprovalStatus: bizNumChanged,
                });
            } else if (profileType === 'artist') {
                await profileService.createArtistProfile({
                    artistName: formData.artist_name,
                    activityField: formData.activity_field || '',
                    tags: selectedTags,
                    highlightKeywords: formData.highlight_keywords || [],
                    bio: formData.bio || '',
                    portfolioUrl: formData.portfolio_url || '',
                    region: formData.region || '',
                    coverFile: coverFile || undefined,
                    logoFile: logoFile || undefined,
                    existingCoverUrl: profileData?.cover_image_url || '',
                    existingLogoUrl: profileData?.logo_image_url || '',
                });
            } else if (profileType === 'creative') {
                const finalAcquisitionSource = acquisitionOption === '기타' ? acquisitionOtherText : acquisitionOption;
                // Convert SNS channels to service format
                const snsChannelsForService = selectedSnsChannels.map(ch => ({
                    platform: ch.type, // CreativeProfileData expects platform
                    type: ch.type,     // Supporting both for safety
                    url: ch.url,
                    is_main: ch.is_main,
                }));
                await profileService.createCreativeProfile({
                    creatorName: formData.nickname,
                    activityField: formData.activity_field || '',
                    tags: selectedTags,
                    bio: formData.bio || '',
                    snsChannels: snsChannelsForService,
                    acquisitionSource: finalAcquisitionSource || '',
                    region: formData.region || '',
                    coverFile: coverFile || undefined,
                    logoFile: logoFile || undefined,
                    existingCoverUrl: profileData?.cover_image_url || '',
                    existingLogoUrl: profileData?.profile_image_url || '',
                });
            } else if (profileType === 'fan') {
                // interests를 한국어로 변환 (데이터베이스에는 한국어로 저장)
                const koreanInterests = selectedInterests.map(interest => {
                    // 이미 한국어인 경우 그대로 사용
                    if (CATEGORY_VALUES[interest]) {
                        return interest;
                    }
                    // 영어 값인 경우 한국어로 변환
                    return CATEGORY_LABELS[interest as ProjectCategory] || interest;
                });

                await profileService.createFanProfile({
                    interests: koreanInterests,
                    persona: formData.persona || '',
                    specificInterests: selectedSpecificInterests || [],
                    preferredRegions: selectedPreferredRegions || [],
                    notificationPreferences: formData.notification_preferences || [],
                    logoFile: logoFile || undefined,
                    nickname: formData.nickname,
                    existingLogoUrl: profileData?.profile_image_url || '',
                });
            }

            toast.success('프로필이 성공적으로 수정되었어요.');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            toast.error(error.message || '프로필 수정 중 오류가 발생했어요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            sx={{ '& .MuiDialog-paper': { bgcolor: theme.palette.background.default } }}
        >
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                bgcolor: theme.palette.background.paper,
                zIndex: 10,
                px: 2,
                pt: 1.5,
                pb: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${theme.palette.divider}`
            }}>
                <IconButton onClick={onClose} edge="start" disabled={loading}>
                    <CloseIcon />
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>프로필 편집</Typography>
                <Button
                    onClick={handleSaveClick}
                    disabled={loading}
                    sx={{ fontWeight: 600, color: theme.palette.primary.main }}
                >
                    {loading ? '저장 중...' : '완료'}
                </Button>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2, pb: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>

                {/* Images Section */}
                <Box>
                    <SectionTitle>이미지 설정</SectionTitle>
                    {/* Cover Image */}
                    {profileType === 'fan' ? (
                        <Box
                            sx={{
                                width: '100%',
                                height: 160,
                                borderRadius: '12px',
                                bgcolor: '#F3F4F6',
                                backgroundImage: `url(${DEFAULT_COVER_IMAGE_URL})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                border: '1px solid #E5E7EB',
                            }}
                        />
                    ) : (
                        <Box
                            onClick={() => coverInputRef.current?.click()}
                            sx={{
                                width: '100%',
                                height: 160,
                                borderRadius: '12px',
                                bgcolor: theme.palette.background.paper,
                                backgroundImage: previews.cover ? `url(${previews.cover})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative',
                                cursor: 'pointer',
                                border: `1px solid ${theme.palette.divider}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {!previews.cover && (
                                <Stack alignItems="center" spacing={1}>
                                    <PhotoCameraIcon sx={{ color: theme.palette.icon.default }} />
                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>커버 이미지 추가</Typography>
                                </Stack>
                            )}
                            <Box sx={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                bgcolor: theme.palette.grey[100],
                                borderRadius: '50%',
                                width: 26,
                                height: 26,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <PhotoCameraIcon sx={{
                                    fontSize: 16,
                                    color: theme.palette.icon.default,
                                }} />
                            </Box>
                            <input
                                type="file"
                                ref={coverInputRef}
                                hidden
                                accept="image/*"
                                onChange={(e) => handleImageChange(e, 'cover')}
                            />
                        </Box>
                    )}

                    {/* Profile/Logo Image */}
                    <Box sx={{ position: 'relative', mt: -5, ml: 2, display: 'inline-block' }}>
                        <Avatar
                            src={previews.logo}
                            sx={{
                                width: 80,
                                height: 80,
                                border: '4px solid white',
                                boxShadow: '0px 4px 6px rgba(0,0,0,0.05)',
                                bgcolor: theme.palette.background.paper
                            }}
                        />
                        <IconButton
                            size="small"
                            onClick={() => logoInputRef.current?.click()}
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                bgcolor: theme.palette.grey[100],
                                color: theme.palette.icon.default,
                            }}
                        >
                            <PhotoCameraIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <input
                            type="file"
                            ref={logoInputRef}
                            hidden
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, 'logo')}
                        />
                    </Box>
                </Box>

                {/* Basic Info Section */}
                <Box>
                    <SectionTitle>기본 정보</SectionTitle>
                    <FormSection>
                        {/* Name fields */}
                        {profileType === 'brand' && (
                            <TextField
                                label="브랜드 이름"
                                fullWidth
                                variant="outlined"
                                value={formData.brand_name || ''}
                                onChange={(e) => handleChange('brand_name', e.target.value)}
                            />
                        )}
                        {profileType === 'artist' && (
                            <TextField
                                label="아티스트 이름"
                                fullWidth
                                variant="outlined"
                                value={formData.artist_name || ''}
                                onChange={(e) => handleChange('artist_name', e.target.value)}
                            />
                        )}
                        {(profileType === 'creative' || profileType === 'fan') && (
                            <TextField
                                label="닉네임"
                                fullWidth
                                variant="outlined"
                                value={formData.nickname || ''}
                                onChange={(e) => handleChange('nickname', e.target.value)}
                            />
                        )}

                        {/* Bio/Description - Text input */}
                        {profileType !== 'fan' && (
                            <TextField
                                label={profileType === 'brand' ? '브랜드 설명' : '한 줄 소개'}
                                fullWidth
                                multiline
                                rows={3}
                                variant="outlined"
                                value={formData.description || formData.bio || ''}
                                onChange={(e) => handleChange(profileType === 'brand' ? 'description' : 'bio', e.target.value)}
                            />
                        )}

                        {/* Activity Field - SELECT (Brand/Artist/Creative) */}
                        {profileType !== 'fan' && (
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>활동 분야</Typography>
                                <Select
                                    fullWidth
                                    value={formData.activity_field || ''}
                                    onChange={(e) => handleChange('activity_field', e.target.value)}
                                    displayEmpty
                                    renderValue={(selected) => {
                                        if (!selected) return <span style={{ color: '#949196' }}>선택해 주세요</span>;
                                        return selected as string;
                                    }}
                                >
                                    <MenuItem value="" disabled>선택해 주세요</MenuItem>
                                    {ACTIVITY_FIELDS.map((field) => (
                                        <MenuItem key={field} value={field}>{field}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                        )}

                        {/* Tags - ActivityFieldKeywordPicker (Brand/Artist/Creative) */}
                        {profileType !== 'fan' && formData.activity_field && (
                            <Box>
                                <ActivityFieldKeywordPicker
                                    activityField={formData.activity_field}
                                    maxSelection={5}
                                    externalSelectedKeywords={selectedTags}
                                    onKeywordAdd={(keyword) => setSelectedTags(prev => [...prev, keyword])}
                                    onKeywordRemove={(keyword) => setSelectedTags(prev => prev.filter(k => k !== keyword))}
                                />
                            </Box>
                        )}

                        {/* Region - Select dropdown */}
                        {profileType !== 'fan' && (
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>지역</Typography>
                                <Select
                                    fullWidth
                                    value={formData.region || ''}
                                    onChange={(e) => handleChange('region', e.target.value)}
                                    displayEmpty
                                    renderValue={(selected) => {
                                        if (!selected) return <span style={{ color: '#949196' }}>선택해 주세요</span>;
                                        return selected as string;
                                    }}
                                >
                                    <MenuItem value="" disabled>선택해 주세요</MenuItem>
                                    {REGION_OPTIONS.map((region) => (
                                        <MenuItem key={region} value={region}>{region}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                        )}
                    </FormSection>
                </Box>

                {/* Brand-specific fields */}
                {profileType === 'brand' && (
                    <Box>
                        <SectionTitle>협업 설정</SectionTitle>
                        <FormSection>
                            {/* Target Audiences - ChipSelector */}
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>타겟 고객층</Typography>
                                <ChipSelector
                                    options={TARGET_GENERATIONS}
                                    selected={selectedTargetAudiences}
                                    onToggle={(gen) => {
                                        if (selectedTargetAudiences.includes(gen)) {
                                            setSelectedTargetAudiences(prev => prev.filter(g => g !== gen));
                                        } else {
                                            setSelectedTargetAudiences(prev => [...prev, gen]);
                                        }
                                    }}
                                />
                            </Box>

                            {/* Preferred Creator Types */}
                            {formData.activity_field && availableCreatorTypes.length > 0 && (
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>선호 크리에이터 분야</Typography>
                                    <Select
                                        fullWidth
                                        value=""
                                        onChange={(e) => {
                                            const value = e.target.value as string;
                                            if (value && !selectedCreatorTypes.includes(value)) {
                                                setSelectedCreatorTypes(prev => [...prev, value]);
                                            }
                                        }}
                                        displayEmpty
                                        renderValue={() => <span style={{ color: '#949196' }}>선택해 주세요</span>}
                                    >
                                        <MenuItem value="" disabled>선택해 주세요</MenuItem>
                                        {availableCreatorTypes.map((type) => (
                                            <MenuItem key={type} value={type}>{type}</MenuItem>
                                        ))}
                                    </Select>
                                    {selectedCreatorTypes.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                                            {selectedCreatorTypes.map((creator) => (
                                                <Chip
                                                    key={creator}
                                                    label={creator}
                                                    color="primary"
                                                    onDelete={() => setSelectedCreatorTypes(prev => prev.filter(c => c !== creator))}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Collaboration Types - ChipSelector */}
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>협업 방식</Typography>
                                <ChipSelector
                                    options={COLLABORATION_TYPES}
                                    selected={selectedCollaborationTypes}
                                    onToggle={(type) => {
                                        if (selectedCollaborationTypes.includes(type)) {
                                            setSelectedCollaborationTypes(prev => prev.filter(t => t !== type));
                                        } else {
                                            setSelectedCollaborationTypes(prev => [...prev, type]);
                                        }
                                    }}
                                />
                            </Box>

                            {/* Monthly Budget - SELECT */}
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>월 마케팅 예산</Typography>
                                <Select
                                    fullWidth
                                    value={formData.monthly_budget || ''}
                                    onChange={(e) => handleChange('monthly_budget', e.target.value)}
                                    displayEmpty
                                    renderValue={(selected) => {
                                        if (!selected) return <span style={{ color: '#949196' }}>선택해 주세요</span>;
                                        return selected as string;
                                    }}
                                >
                                    <MenuItem value="" disabled>선택해 주세요</MenuItem>
                                    {BUDGET_RANGES.map((range) => (
                                        <MenuItem key={range} value={range}>{range}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                        </FormSection>
                    </Box>
                )}

                {/* Brand Business Info */}
                {profileType === 'brand' && (
                    <Box>
                        <SectionTitle>사업자 정보</SectionTitle>
                        <FormSection>
                            <TextField label="웹사이트" fullWidth value={formData.website_url || ''} onChange={(e) => handleChange('website_url', e.target.value)} />
                            <TextField label="SNS 채널" fullWidth value={formData.sns_channel || ''} onChange={(e) => handleChange('sns_channel', e.target.value)} />
                            <TextField label="연락처" fullWidth value={formData.contact_info || ''} onChange={(e) => handleChange('contact_info', e.target.value)} />
                            <TextField label="사업자 등록번호" fullWidth value={formData.business_registration_number || ''} onChange={(e) => handleChange('business_registration_number', e.target.value)} />
                        </FormSection>
                    </Box>
                )}

                {/* Artist-specific fields */}
                {profileType === 'artist' && (
                    <Box>
                        <SectionTitle>상세 정보</SectionTitle>
                        <FormSection>
                            <TextField label="포트폴리오 URL" fullWidth value={formData.portfolio_url || ''} onChange={(e) => handleChange('portfolio_url', e.target.value)} />
                        </FormSection>
                    </Box>
                )}

                {/* Creative-specific fields */}
                {profileType === 'creative' && (
                    <>
                        <Box>
                            <SectionTitle>SNS 채널</SectionTitle>
                            <FormSection>
                                {AVAILABLE_CHANNELS.map((channelInfo) => {
                                    const isSelected = selectedSnsChannels.some(ch => ch.type === channelInfo.type);
                                    const channelData = selectedSnsChannels.find(ch => ch.type === channelInfo.type);

                                    const getUrlSuffix = (url: string, domain: string) => {
                                        if (url && url.startsWith(domain)) {
                                            return url.substring(domain.length);
                                        }
                                        return url || '';
                                    };

                                    const suffix = channelData ? getUrlSuffix(channelData.url, channelInfo.domain) : '';

                                    return (
                                        <Box key={channelInfo.type}>
                                            {/* 채널 선택 라디오 버튼 */}
                                            <Box
                                                onClick={() => {
                                                    if (isSelected) {
                                                        // 선택 해제 - 데이터는 deselectedChannels에 저장
                                                        if (channelData) {
                                                            setDeselectedChannels(prev => {
                                                                const newMap = new Map(prev);
                                                                // 해제된 채널의 메인 지정을 해제
                                                                newMap.set(channelInfo.type, { ...channelData, is_main: false });
                                                                return newMap;
                                                            });
                                                        }
                                                        setSelectedSnsChannels(prev => {
                                                            const updated = prev.filter(ch => ch.type !== channelInfo.type);
                                                            // 해제된 채널이 메인이었다면 첫 번째 채널을 메인으로 자동 지정
                                                            if (channelData?.is_main && updated.length > 0) {
                                                                updated[0].is_main = true;
                                                            }
                                                            return updated;
                                                        });
                                                    } else {
                                                        // 선택 추가 - deselectedChannels에 기존 데이터가 있으면 사용, 없으면 새로 생성
                                                        const existingChannel = deselectedChannels.get(channelInfo.type);
                                                        if (existingChannel) {
                                                            // 기존 데이터가 있으면 사용 (입력값 유지, 메인 여부는 첫 번째 채널인 경우에만 true)
                                                            setSelectedSnsChannels(prev => [...prev, { ...existingChannel, is_main: prev.length === 0 }]);
                                                            setDeselectedChannels(prev => {
                                                                const newMap = new Map(prev);
                                                                newMap.delete(channelInfo.type);
                                                                return newMap;
                                                            });
                                                        } else {
                                                            // 새로 생성
                                                            setSelectedSnsChannels(prev => [
                                                                ...prev,
                                                                {
                                                                    ...channelInfo,
                                                                    url: channelInfo.domain,
                                                                    is_main: prev.length === 0, // 첫 번째 채널은 자동으로 메인
                                                                },
                                                            ]);
                                                        }
                                                    }
                                                }}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    p: 1.5,
                                                    borderRadius: '20px',
                                                    borderBottomLeftRadius: isSelected ? '0px' : '20px',
                                                    borderBottomRightRadius: isSelected ? '0px' : '20px',
                                                    bgcolor: '#F3F4F6',
                                                    borderBottom: isSelected ? 'none' : '1px solid #E5E7EB',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: '8px',
                                                            backgroundColor: channelInfo.color || '#F3F4F6',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <channelInfo.icon size={20} color={channelInfo.iconColor || '#000000'} />
                                                    </Box>
                                                    <Typography sx={{
                                                        fontFamily: 'Pretendard, sans-serif',
                                                        fontSize: 16,
                                                        fontWeight: 500,
                                                        color: '#111827'
                                                    }}>
                                                        {channelInfo.name}
                                                    </Typography>
                                                </Box>
                                                {/* 라디오 버튼 스타일 */}
                                                <Box
                                                    sx={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        border: `2px solid ${isSelected ? theme.palette.primary.main : '#D1D5DB'}`,
                                                        bgcolor: 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        position: 'relative',
                                                        '&::after': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                            bgcolor: theme.palette.primary.main,
                                                            opacity: isSelected ? 1 : 0,
                                                            transform: isSelected ? 'scale(1)' : 'scale(0)',
                                                            transition: 'all 0.2s ease-in-out',
                                                        },
                                                    }}
                                                />
                                            </Box>

                                            {/* 선택된 채널의 URL 입력 및 메인 채널 지정 */}
                                            {isSelected && channelData && (
                                                <Box
                                                    sx={{
                                                        mt: 0,
                                                        mb: 2,
                                                        p: 1.5,
                                                        borderTop: 'none',
                                                        borderBottomLeftRadius: '12px',
                                                        borderBottomRightRadius: '12px',
                                                        bgcolor: '#F3F4F6',
                                                    }}
                                                >
                                                    {/* URL 입력 */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        width: '100%',
                                                        p: 1.5,
                                                        borderRadius: '8px',
                                                        bgcolor: theme.palette.background.default,
                                                        mb: 1,
                                                        gap: '2px',
                                                    }}>
                                                        <Typography sx={{
                                                            fontFamily: 'Pretendard, sans-serif',
                                                            fontSize: 14,
                                                            color: '#111827',
                                                            flexShrink: 1,
                                                        }}>
                                                            {channelInfo.domain}
                                                        </Typography>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            value={suffix}
                                                            onChange={(e) => {
                                                                const newSuffix = e.target.value;
                                                                const fullUrl = channelInfo.domain + newSuffix;
                                                                setSelectedSnsChannels(prev =>
                                                                    prev.map(ch =>
                                                                        ch.type === channelInfo.type ? { ...ch, url: fullUrl } : ch
                                                                    )
                                                                );
                                                            }}
                                                            placeholder={
                                                                channelInfo.type === 'instagram' ? 'lyt_official' :
                                                                    channelInfo.type === 'youtube' ? '@lytofficial' :
                                                                        channelInfo.type === 'naver' ? 'lytofficial' :
                                                                            channelInfo.type === 'tiktok' ? 'lytofficial' :
                                                                                'lytofficial'
                                                            }
                                                            onClick={(e) => e.stopPropagation()}
                                                            sx={{
                                                                flex: 1,
                                                                '& .MuiOutlinedInput-root': {
                                                                    border: 'none',
                                                                    bgcolor: 'transparent',
                                                                    padding: 0, // 기본 패딩 제거
                                                                    '& fieldset': { border: 'none' },
                                                                },
                                                                '& .MuiInputBase-input': {
                                                                    fontFamily: 'Pretendard, sans-serif',
                                                                    fontSize: 14,
                                                                    color: '#6B7280',
                                                                    minWidth: 0,
                                                                    padding: '4px 0', // 좌우 패딩 제거
                                                                },
                                                            }}
                                                        />
                                                    </Box>

                                                    {/* 메인 채널 체크박스 */}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            cursor: 'pointer',
                                                            mt: 1,
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedSnsChannels(prev =>
                                                                prev.map(ch => ({
                                                                    ...ch,
                                                                    is_main: ch.type === channelInfo.type,
                                                                }))
                                                            );
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 16,
                                                                height: 16,
                                                                borderRadius: '50%',
                                                                border: `2px solid ${channelData.is_main ? theme.palette.primary.main : '#D1D5DB'}`,
                                                                bgcolor: 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0,
                                                                position: 'relative',
                                                                '&::after': {
                                                                    content: '""',
                                                                    position: 'absolute',
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    bgcolor: theme.palette.primary.main,
                                                                    opacity: channelData.is_main ? 1 : 0,
                                                                    transform: channelData.is_main ? 'scale(1)' : 'scale(0)',
                                                                    transition: 'all 0.2s ease-in-out',
                                                                },
                                                            }}
                                                        />
                                                        <Typography sx={{
                                                            fontFamily: 'Pretendard, sans-serif',
                                                            fontSize: 14,
                                                            color: '#111827'
                                                        }}>
                                                            메인 채널로 지정
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </FormSection>
                        </Box>
                        <Box>
                            <SectionTitle>유입 경로</SectionTitle>
                            <FormSection>
                                {ACQUISITION_OPTIONS.map((option) => (
                                    <Box
                                        key={option.value}
                                        onClick={() => setAcquisitionOption(option.value)}
                                        sx={{
                                            p: 2,
                                            mb: 1,
                                            borderRadius: '12px',
                                            border: acquisitionOption === option.value ? `2px solid ${theme.palette.primary.main}` : '1px solid #E5E7EB',
                                            bgcolor: acquisitionOption === option.value ? 'rgba(37, 99, 235, 0.05)' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                        }}
                                    >
                                        <Radio
                                            checked={acquisitionOption === option.value}
                                            value={option.value}
                                            sx={{ p: 0 }}
                                        />
                                        <Typography sx={{ fontWeight: 500, fontSize: 14 }}>{option.label}</Typography>
                                    </Box>
                                ))}
                                <Collapse in={acquisitionOption === '기타'}>
                                    <TextField
                                        fullWidth
                                        placeholder="기타 경로를 20자 이내로 입력해 주세요"
                                        value={acquisitionOtherText}
                                        onChange={(e) => setAcquisitionOtherText(e.target.value.slice(0, 20))}
                                        inputProps={{ maxLength: 20 }}
                                        sx={{ mt: 1 }}
                                    />
                                    <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.5, textAlign: 'right' }}>
                                        {acquisitionOtherText.length}/20
                                    </Typography>
                                </Collapse>
                            </FormSection>
                        </Box>
                    </>
                )}

                {/* Fan-specific fields */}
                {profileType === 'fan' && (
                    <>
                        <Box>
                            <SectionTitle>관심사 (최대 3개)</SectionTitle>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '20px 12px',
                            }}>
                                {EXTENDED_CATEGORIES.map((cat: ProjectCategory) => {
                                    const IconComponent = CATEGORY_ICONS[cat];
                                    // 한국어 라벨로 변환하여 비교
                                    const koreanLabel = CATEGORY_LABELS[cat];
                                    // selectedInterests는 한국어 값일 수 있으므로 둘 다 확인
                                    const isSelected = selectedInterests.includes(cat) || selectedInterests.includes(koreanLabel);
                                    return (
                                        <Button
                                            key={cat}
                                            onClick={() => {
                                                // 클릭 시 영어 값(cat)으로 토글
                                                handleInterestToggle(cat);
                                            }}
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                p: '10px',
                                                borderRadius: '20px',
                                                color: isSelected ? '#fff' : '#000',
                                                bgcolor: isSelected ? theme.palette.primary.main : '#F3F4F6',
                                                width: 72,
                                                height: 72,
                                                minWidth: 'auto',
                                            }}
                                        >
                                            {IconComponent && <IconComponent sx={{ fontSize: 26, mb: 0.5 }} />}
                                            <Typography sx={{ fontSize: 11, fontWeight: 500 }}>
                                                {koreanLabel}
                                            </Typography>
                                        </Button>
                                    );
                                })}
                            </Box>
                        </Box>

                        {selectedInterests.length > 0 && (
                            <Box>
                                <SectionTitle>더 자세한 취향</SectionTitle>
                                <ActivityFieldKeywordPicker
                                    interests={koreanInterestsForPicker}
                                    maxSelection={10}
                                    externalSelectedKeywords={selectedSpecificInterests}
                                    onKeywordAdd={(keyword) => setSelectedSpecificInterests(prev => [...prev, keyword])}
                                    onKeywordRemove={(keyword) => setSelectedSpecificInterests(prev => prev.filter(k => k !== keyword))}
                                />
                            </Box>
                        )}

                        <Box>
                            <SectionTitle>선호 지역</SectionTitle>
                            <ChipSelector
                                options={REGION_OPTIONS}
                                selected={selectedPreferredRegions}
                                onToggle={(region) => {
                                    if (selectedPreferredRegions.includes(region)) {
                                        setSelectedPreferredRegions(prev => prev.filter(r => r !== region));
                                    } else {
                                        setSelectedPreferredRegions(prev => [...prev, region]);
                                    }
                                }}
                            />
                        </Box>

                        <Box>
                            <SectionTitle>페르소나</SectionTitle>
                            <RadioGroup
                                value={formData.persona || ''}
                                onChange={(e) => handleChange('persona', e.target.value)}
                            >
                                {PERSONA_OPTIONS.map((option) => (
                                    <Box
                                        key={option.id}
                                        onClick={() => handleChange('persona', option.id)}
                                        sx={{
                                            p: 2,
                                            mb: 1.5,
                                            borderRadius: '12px',
                                            border: formData.persona === option.id ? `2px solid ${theme.palette.primary.main}` : '1px solid #E5E7EB',
                                            bgcolor: formData.persona === option.id ? 'rgba(37, 99, 235, 0.05)' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.5,
                                        }}
                                    >
                                        <Radio
                                            checked={formData.persona === option.id}
                                            value={option.id}
                                            sx={{ p: 0, mt: 0.5 }}
                                        />
                                        <Box>
                                            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{option.label}</Typography>
                                            <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.5 }}>{option.description}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </RadioGroup>
                        </Box>
                    </>
                )}

            </Box>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmSave}
                title="변경 내용을 저장하시겠어요?"
                message="수정된 프로필 정보가 업데이트됩니다."
                confirmText="저장"
                cancelText="취소"
            />

            {/* Business Registration Number Change Warning Dialog */}
            <ConfirmDialog
                open={businessRegChangeConfirmOpen}
                onClose={() => setBusinessRegChangeConfirmOpen(false)}
                onConfirm={handleBusinessRegChangeConfirm}
                title="사업자 등록번호를 변경하시겠어요?"
                message="사업자 등록번호를 변경하면 인증을 다시 받아야 합니다. 인증이 완료되기 전까지 일부 기능이 제한될 수 있어요."
                confirmText="변경하기"
                cancelText="취소"
                isDestructive
            />
        </Dialog>
    );
}
