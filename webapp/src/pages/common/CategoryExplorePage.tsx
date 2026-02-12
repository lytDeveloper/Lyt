
import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, IconButton, Chip, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import Header from '../../components/common/Header';
import BottomNavigationBar from '../../components/navigation/BottomNavigationBar';
import { COLORS } from '../../styles/onboarding/common.styles';
import { supabase } from '../../lib/supabase';
import { PROJECT_CATEGORIES, CATEGORY_LABELS, STATUS_LABELS } from '../../constants/projectConstants';
import type { ProjectCategory, ProjectStatus } from '../../types/exploreTypes';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';

type ProjectSummary = {
    id: string;
    title: string;
    budget_range: string | null;
    status: ProjectStatus;
};

type CategoryMeta = {
    id: ProjectCategory;
    description: string;
    image: string;
};

// 카테고리 메타 정보 (이미지, 소개 문구)
const CATEGORY_META: Record<ProjectCategory, CategoryMeta> = {
    music: {
        id: 'music',
        description: 'K-POP부터 인디까지 다양한 음악 프로젝트와\n아티스트 활동을 한눈에',
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    fashion: {
        id: 'fashion',
        description: '트렌디한 스타일링과 패션 디자인, 브랜드 협업까지',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8JUVEJThDJUE4JUVDJTg1JTk4fGVufDB8fDB8fHww'
    },
    beauty: {
        id: 'beauty',
        description: '뷰티 브랜드와 메이크업 아티스트 협업',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    contents: {
        id: 'contents',
        description: '영상, 사진, 디자인, SNS까지. 창작 콘텐츠의 모든 과정',
        image: 'https://plus.unsplash.com/premium_photo-1684017834245-f714094ca936?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    market: {
        id: 'market',
        description: '공동구매부터 굿즈 제작, 온라인 판매까지',
        image: 'https://plus.unsplash.com/premium_photo-1666739387925-5841368970a7?q=80&w=1653&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    Investment: {
        id: 'Investment',
        description: '인사이트로 채우는 스마트 자산관리 경험',
        image: 'https://plus.unsplash.com/premium_photo-1677692593965-28c886409cfb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8JUVDJUEwJTgwJUVBJUI4JTg4JUVEJTg2JUI1fGVufDB8fDB8fHww'
    },
    liveShopping: {
        id: 'liveShopping',
        description: '실시간 소통으로 완성되는 새로운 쇼핑의 매력',
        image: 'https://plus.unsplash.com/premium_photo-1684529562808-7845127b991a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fCVFQiU5RCVCQyVFQyU5RCVCNCVFQiVCOCU4QyVFQyU4NyVCQyVFRCU5NSU5MXxlbnwwfHwwfHx8MA%3D%3D'
    },
    event: {
        id: 'event',
        description: '팝업부터 런칭행사, 네트워킹까지 특별한 이벤트의 모든 순간',
        image: 'https://images.unsplash.com/photo-1511317559916-56d5ddb62563?q=80&w=786&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    ticket: {
        id: 'ticket',
        description: '공연, 전시, 페스티벌 등 다채로운 문화 체험과 창작 활동',
        image: 'https://images.unsplash.com/photo-1571173069043-82a7a13cee9f?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    tech: {
        id: 'tech',
        description: '최신 기술과 디지털 트렌드를 경험하는 테크 기반 프로젝트',
        image: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8JUVEJTg1JThDJUVEJTgxJUFDfGVufDB8fDB8fHww'
    },
    life: {
        id: 'life',
        description: '인테리어, 반려동물, 홈카페 등 일상을 풍요롭게 만드는 아이디어',
        image: 'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8JUVDJTlEJUJDJUVDJTgzJTgxfGVufDB8fDB8fHww'
    },
    healing: {
        id: 'healing',
        description: '여행, 요가, 명상, 웰니스로 마음과 몸을 채우는 힐링 경험',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fCVFRCU5RSU5MCVFQiVBNyU4MXxlbnwwfHwwfHx8MA%3D%3D'
    },
};

const POPULAR_TAGS = ['#글로벌', '#브랜딩', '#콜라보', '#K-POP', '#친환경', '#AI기술', '#핸드메이드', '#스타트업', '#팬덤', '#챌린지'];

type ViewType = 'grid' | 'list';

const CategoryExplorePage = () => {
    const navigate = useNavigate();
    const [viewType, setViewType] = useState<ViewType>('grid');
    const [counts, setCounts] = useState<Record<ProjectCategory, number>>(() =>
        PROJECT_CATEGORIES.reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {} as Record<ProjectCategory, number>)
    );
    const [recentProjects, setRecentProjects] = useState<Record<ProjectCategory, ProjectSummary[]>>(() =>
        PROJECT_CATEGORIES.reduce((acc, cur) => ({ ...acc, [cur]: [] }), {} as Record<ProjectCategory, ProjectSummary[]>)
    );

    useEffect(() => {
        let isMounted = true;
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('id,title,category,budget_range,status,created_at')
                .order('created_at', { ascending: false })
                .limit(200);

            if (!isMounted) return;

            if (error) {
                console.error('[CategoryExplorePage] 프로젝트 조회 실패', error);
                return;
            }

            const baseCount = PROJECT_CATEGORIES.reduce((acc, cur) => ({ ...acc, [cur]: 0 }), {} as Record<ProjectCategory, number>);
            const nextCounts = { ...baseCount };
            const nextRecents: Record<ProjectCategory, ProjectSummary[]> = { ...PROJECT_CATEGORIES.reduce((acc, cur) => ({ ...acc, [cur]: [] }), {} as Record<ProjectCategory, ProjectSummary[]>) };

            (data ?? []).forEach((project) => {
                const category = project.category as ProjectCategory;
                if (PROJECT_CATEGORIES.includes(category)) {
                    nextCounts[category] = (nextCounts[category] || 0) + 1;
                }
            });

            PROJECT_CATEGORIES.forEach((category) => {
                const filtered = (data ?? [])
                    .filter((project) => project.category === category)
                    .slice(0, 2)
                    .map((project) => ({
                        id: project.id,
                        title: project.title,
                        budget_range: project.budget_range,
                        status: project.status as ProjectStatus
                    }));
                nextRecents[category] = filtered;
            });

            setCounts(nextCounts);
            setRecentProjects(nextRecents);
        };

        fetchProjects();
        return () => { isMounted = false; };
    }, []);

    const categoryData = useMemo(() => PROJECT_CATEGORIES.map((category) => ({
        id: category,
        name: CATEGORY_LABELS[category],
        count: counts[category] ?? 0,
        description: CATEGORY_META[category].description,
        image: CATEGORY_META[category].image,
        recent: recentProjects[category] ?? []
    })), [counts, recentProjects]);

    const totalProjects = useMemo(
        () => categoryData.reduce((acc, curr) => acc + (curr.count || 0), 0),
        [categoryData]
    );
    const theme = useTheme();
    return (
        <Box sx={{
            width: '100%',
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            pb: '80px', // Bottom Nav height
            position: 'relative' // relative for absolute header if needed, but here we use sticky logic or standard flow
        }}>
            {/* Header Area - Using Common Header but customizing back behavior if needed, generally Header component handles it */}
            <Box sx={{
                position: 'sticky', top: 0, zIndex: 1000, backgroundColor: 'transparent',
                backdropFilter: 'blur(3px) saturate(180%)',
                WebkitBackdropFilter: 'blur(3px) saturate(180%)',
            }}>
                <Header showBackButton={true} onBackClick={() => navigate(-1)} />
            </Box>

            {/* Main Content */}
            <Box sx={{ px: { xs: 2.5, sm: 3 }, pt: 2 }}> {/* xs: 20px -> 40px total padding. 403-40 = 363. Gap 1 (8px) -> 355/2 = 177px per card. */}

                {/* Page Title & Toggle */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                        <Typography sx={{
                            fontFamily: 'Pretendard',
                            fontSize: { xs: 20, sm: 24 },
                            fontWeight: 700,
                            color: COLORS.TEXT_PRIMARY,
                            lineHeight: 1.3,
                            mb: 1
                        }}>
                            카테고리 탐색
                        </Typography>
                        <Typography sx={{
                            fontFamily: 'Pretendard',
                            fontSize: { xs: 13, sm: 14 },
                            color: COLORS.TEXT_SECONDARY,
                            fontWeight: 400
                        }}>
                            관심있는 분야의 프로젝트를 찾아보세요
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5, backgroundColor: theme.palette.grey[100], borderRadius: '10px', p: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={() => setViewType('grid')}
                            sx={{
                                borderRadius: '6px',
                                p: 1,
                                backgroundColor: viewType === 'grid' ? '#fff' : 'transparent',
                                boxShadow: viewType === 'grid' ? '0px 1px 3px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            <GridOnOutlinedIcon sx={{ fontSize: 14, color: viewType === 'grid' ? theme.palette.primary.main : theme.palette.icon.default }} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => setViewType('list')}
                            sx={{
                                borderRadius: '6px',
                                p: 1,
                                backgroundColor: viewType === 'list' ? '#fff' : 'transparent',
                                boxShadow: viewType === 'list' ? '0px 1px 3px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            <ListAltOutlinedIcon sx={{ fontSize: 16, color: viewType === 'list' ? theme.palette.primary.main : theme.palette.icon.default }} />
                        </IconButton>
                    </Box>
                </Box>

                {/* All Categories Hero Card */}
                <Box sx={{
                    width: '100%',
                    p: 2.5,
                    borderRadius: '16px',
                    backgroundColor: theme.palette.bgColor.blue,
                    mb: 4,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                    onClick={() => navigate('/explore?tab=projects&category=전체')} // 전체 카테고리
                >
                    <Typography sx={{
                        fontFamily: 'Pretendard',
                        fontSize: 18,
                        fontWeight: 600,
                        color: theme.palette.subText.default,
                        mb: 0.5,
                        position: 'relative',
                        zIndex: 1
                    }}>
                        전체 카테고리
                    </Typography>
                    <Typography sx={{
                        fontFamily: 'Pretendard',
                        fontSize: 13,
                        color: theme.palette.subText.default,
                        mb: 2,
                        fontWeight: 400,
                        position: 'relative',
                        zIndex: 1
                    }}>
                        다양한 분야의 창작자들과 협업하세요
                    </Typography>
                    <Typography sx={{
                        fontFamily: 'Pretendard',
                        fontSize: 11,
                        color: theme.palette.subText.default,
                        fontWeight: 400,
                        position: 'relative',
                        zIndex: 1
                    }}>
                        총 {PROJECT_CATEGORIES.length}개 카테고리 · {totalProjects}개 프로젝트
                    </Typography>
                </Box>

                {/* Category List */}
                <Box sx={{ mb: 5 }}>
                    {viewType === 'grid' ? (
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: { xs: 1.5, sm: 2 },

                        }}>
                            {categoryData.map((item) => (
                                <Box key={item.id} sx={{
                                    borderRadius: '16px',
                                    backgroundColor: '#fff',
                                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
                                    p: { xs: 2, sm: 3 }, // Reduced padding for mobile
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    height: '100%',
                                    minHeight: { xs: 230, sm: 'auto' }, // Ensure minimal height
                                    transition: 'transform 0.2s',
                                    '&:active': { transform: 'scale(0.98)' },

                                }}
                                    onClick={() => navigate(`/explore?tab=projects&category=${item.id}`)}
                                >
                                    <Box sx={{
                                        width: { xs: 60, sm: 70 },
                                        height: { xs: 60, sm: 70 },
                                        borderRadius: '12px',
                                        mb: { xs: 1.5, sm: 2 },
                                        backgroundImage: `url(${item.image})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundColor: '#F3F4F6',

                                    }} />
                                    <Typography sx={{
                                        fontFamily: 'Pretendard',
                                        fontSize: { xs: 16, sm: 18 },
                                        fontWeight: 700,
                                        mb: 1,
                                        color: COLORS.TEXT_PRIMARY,
                                        textAlign: 'center',
                                        wordBreak: 'keep-all',
                                    }}>
                                        {item.name}
                                    </Typography>
                                    <Typography sx={{
                                        fontFamily: 'Pretendard',
                                        fontSize: { xs: 12, sm: 13 },
                                        color: COLORS.TEXT_SECONDARY,
                                        textAlign: 'center',
                                        mb: 'auto',
                                        lineHeight: 1.3,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'keep-all',
                                        overflow: 'hidden'
                                    }}>
                                        {item.description}
                                    </Typography>
                                    <Box sx={{
                                        mt: { xs: 1.5, sm: 2 },
                                        backgroundColor: '#F3F4F6',
                                        px: 1.5,
                                        py: 0.8,
                                        borderRadius: '100px'
                                    }}>
                                        <Typography sx={{ fontFamily: 'Pretendard', fontSize: { xs: 11, sm: 12 }, color: '#4B5563', fontWeight: 600 }}>
                                            {item.count}개 프로젝트
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {categoryData.map((item) => (
                                <Box key={item.id} sx={{
                                    borderRadius: '16px',
                                    backgroundColor: '#fff',
                                    p: { xs: 2.5, sm: 3 },
                                    display: 'flex',
                                    flexDirection: 'column', // Mobile default
                                    gap: 3,
                                    cursor: 'pointer',
                                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
                                    '&:active': { backgroundColor: '#F9FAFB' }
                                }}
                                    onClick={() => navigate(`/explore?tab=projects&category=${item.id}`)}
                                >
                                    {/* Top Section: Image + Title/Desc + Badge */}
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        {/* Image */}
                                        <Box sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '16px',
                                            backgroundImage: `url(${item.image})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            backgroundColor: '#F3F4F6',
                                            flexShrink: 0
                                        }} />

                                        {/* Header Info */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                <Typography sx={{ fontFamily: 'Pretendard', fontSize: 18, fontWeight: 700, color: COLORS.TEXT_PRIMARY }}>
                                                    {item.name}
                                                </Typography>
                                                <Box sx={{
                                                    backgroundColor: '#F3F4F6',
                                                    px: 1.5,
                                                    py: 0.5,
                                                    borderRadius: '100px',
                                                    flexShrink: 0,
                                                    ml: 1 // margin left to separate from title if long
                                                }}>
                                                    <Typography sx={{ fontFamily: 'Pretendard', fontSize: 13, color: '#4B5563', fontWeight: 600 }}>
                                                        {item.count}개
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Typography sx={{
                                                fontFamily: 'Pretendard',
                                                fontSize: 14,
                                                color: COLORS.TEXT_SECONDARY,
                                                lineHeight: 1.4,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word'
                                            }}>
                                                {item.description}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Recent Projects Section */}
                                    <Box>
                                        <Typography sx={{ fontFamily: 'Pretendard', fontSize: 14, fontWeight: 600, color: '#4B5563', mb: 1.5 }}>
                                            최근 프로젝트
                                        </Typography>
                                        {item.recent.length === 0 ? (
                                            <Typography sx={{ fontFamily: 'Pretendard', fontSize: 13, color: '#9CA3AF' }}>
                                                최근 프로젝트가 없습니다
                                            </Typography>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {item.recent.map((project) => (
                                                    <Box key={project.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography sx={{
                                                            fontFamily: 'Pretendard',
                                                            fontSize: 14,
                                                            color: COLORS.TEXT_PRIMARY,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            flex: 1,
                                                            mr: 1
                                                        }}>
                                                            {project.title}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                                            <Typography sx={{ fontFamily: 'Pretendard', fontSize: 13, color: '#6B7280' }}>
                                                                {project.budget_range || '예산 미정'}
                                                            </Typography>
                                                            <Box sx={{
                                                                backgroundColor: project.status === 'in_progress' ? '#1F2937' : '#F3F4F6',
                                                                px: 1,
                                                                py: 0.3,
                                                                borderRadius: '20px'
                                                            }}>
                                                                <Typography sx={{ fontFamily: 'Pretendard', fontSize: 11, color: project.status === 'in_progress' ? '#fff' : '#4B5563', fontWeight: 500 }}>
                                                                    {STATUS_LABELS[project.status] ?? project.status}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>

                {/* Popular Tags */}
                <Box sx={{ mb: 4 }}>
                    <Typography sx={{
                        fontFamily: 'Pretendard',
                        fontSize: 18,
                        fontWeight: 700,
                        color: COLORS.TEXT_PRIMARY,
                        mb: 2
                    }}>
                        인기 태그
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, }}>
                        {POPULAR_TAGS.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                onClick={() => navigate(`/explore?tag=${tag.replace('#', '')}`)}
                                sx={{
                                    fontFamily: 'Pretendard',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.palette.subText.default,
                                    backgroundColor: theme.palette.grey[100],
                                    borderRadius: '100px',
                                    border: 'none',
                                }}
                            />
                        ))}
                    </Box>
                </Box>

            </Box>

            <BottomNavigationBar />
        </Box>
    );
};

export default CategoryExplorePage;
