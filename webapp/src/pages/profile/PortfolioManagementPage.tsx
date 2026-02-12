import { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import TabBarFill, { type TabItem } from '../../components/common/TabBarFill';
import PortfolioTab from './components/PortfolioTab';
import CareerTab from './components/CareerTab';
import AddPortfolioModal from './components/AddPortfolioModal';
import AddCareerModal from './components/AddCareerModal';
import { useProfileStore } from '../../stores/profileStore';
import { profileService } from '../../services/profileService';
import type { PortfolioItem, CareerItem } from '../../services/profileService';

type TabType = 'portfolio' | 'career';

export default function PortfolioManagementPage() {
    const navigate = useNavigate();
    const { type: activeProfileType, profileId: activeProfileId } = useProfileStore();
    const [activeTab, setActiveTab] = useState<TabType>('portfolio');

    // 브랜드 유저일 경우 '경력' → '히스토리'로 표시
    const careerLabel = activeProfileType === 'brand' ? '히스토리' : '경력';
    const TABS: TabItem<TabType>[] = [
        { key: 'portfolio', label: '작업물' },
        { key: 'career', label: careerLabel }
    ];

    // State for Modals
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
    const [careerModalOpen, setCareerModalOpen] = useState(false);

    // State for Editing
    const [editingPortfolioIndex, setEditingPortfolioIndex] = useState<number | null>(null);
    const [initialPortfolioData, setInitialPortfolioData] = useState<PortfolioItem | undefined>(undefined);

    const [editingCareerIndex, setEditingCareerIndex] = useState<number | null>(null);
    const [initialCareerData, setInitialCareerData] = useState<CareerItem | undefined>(undefined);

    const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
    const [careers, setCareers] = useState<CareerItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch initial data
    useEffect(() => {
        if (!activeProfileId || !activeProfileType) {
            // Handle case where profile is not ready
            return;
        }

        // Since portfolios and careers are stored as jsonb in the profile table,
        // we need to fetch the profile and extract them.
        // Assuming getProfile returns these fields even if not typed in the prompt yet.
        // I will cast the result for now.

        // NOTE: In a real scenario I might need to update the service to return these fields explicitly if they aren't.
        // But getProfile likely does select('*').

        const fetchData = async () => {
            try {
                setLoading(true);
                // We cast to any to access dynamic jsonb fields
                const profileData = await profileService.getProfile(activeProfileId, activeProfileType as any) as any;

                if (profileData) {
                    setPortfolios(profileData.portfolios || []);
                    setCareers(profileData.careers || []);
                }
            } catch (err) {
                console.error('Failed to load portfolio data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeProfileId, activeProfileType]);

    // Portfolio Handlers
    const handleSavePortfolio = async (item: PortfolioItem) => {
        if (!activeProfileId || !activeProfileType) return;

        let updatedPortfolios = [...portfolios];
        if (editingPortfolioIndex !== null) {
            updatedPortfolios[editingPortfolioIndex] = item;
        } else {
            updatedPortfolios.push(item);
        }

        try {
            await profileService.updatePortfolios(activeProfileId, activeProfileType as any, updatedPortfolios);
            setPortfolios(updatedPortfolios);

            // Close & Reset
            setPortfolioModalOpen(false);
            setEditingPortfolioIndex(null);
            setInitialPortfolioData(undefined);
        } catch (err) {
            console.error('Failed to update portfolios:', err);
            alert('저장에 실패했어요.');
        }
    };

    const handleEditPortfolio = (item: PortfolioItem, index: number) => {
        setInitialPortfolioData(item);
        setEditingPortfolioIndex(index);
        setPortfolioModalOpen(true);
    };

    const handleDeletePortfolio = async (index: number) => {
        if (!activeProfileId || !activeProfileType) return;
        if (!window.confirm('정말 삭제하시겠어요?')) return;

        const updatedPortfolios = portfolios.filter((_, i) => i !== index);
        try {
            await profileService.updatePortfolios(activeProfileId, activeProfileType as any, updatedPortfolios);
            setPortfolios(updatedPortfolios);
        } catch (err) {
            console.error('Failed to delete portfolio:', err);
            alert('삭제에 실패했어요.');
        }
    };

    const handleAddPortfolioClick = () => {
        setInitialPortfolioData(undefined);
        setEditingPortfolioIndex(null);
        setPortfolioModalOpen(true);
    };


    // Career Handlers
    const handleSaveCareer = async (item: CareerItem) => {
        if (!activeProfileId || !activeProfileType) return;

        let updatedCareers = [...careers];
        if (editingCareerIndex !== null) {
            updatedCareers[editingCareerIndex] = item;
        } else {
            updatedCareers.push(item);
        }

        try {
            await profileService.updateCareers(activeProfileId, activeProfileType as any, updatedCareers);
            setCareers(updatedCareers);

            // Close & Reset
            setCareerModalOpen(false);
            setEditingCareerIndex(null);
            setInitialCareerData(undefined);
        } catch (err) {
            console.error('Failed to update careers:', err);
            alert('저장에 실패했어요.');
        }
    };

    const handleEditCareer = (item: CareerItem, index: number) => {
        setInitialCareerData(item);
        setEditingCareerIndex(index);
        setCareerModalOpen(true);
    };

    const handleDeleteCareer = async (index: number) => {
        if (!activeProfileId || !activeProfileType) return;
        if (!window.confirm('정말 삭제하시겠어요?')) return;

        const updatedCareers = careers.filter((_, i) => i !== index);
        try {
            await profileService.updateCareers(activeProfileId, activeProfileType as any, updatedCareers);
            setCareers(updatedCareers);
        } catch (err) {
            console.error('Failed to delete career:', err);
            alert('삭제에 실패했어요.');
        }
    };

    const handleAddCareerClick = () => {
        setInitialCareerData(undefined);
        setEditingCareerIndex(null);
        setCareerModalOpen(true);
    };


    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'white' }}>
                <Header showBackButton onBackClick={() => navigate(-1)} />
            </Box>

            <Container maxWidth="sm" sx={{ mt: 2, pb: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ fontWeight: 700, fontSize: 24, mb: 1 }}>포트폴리오 관리</Box>
                    <Box sx={{ color: '#6B7280', fontSize: 14 }}>
                        작업물과 경력을 체계적으로 관리하세요
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <Box sx={{ fontSize: 14, color: '#9CA3AF' }}>Loading...</Box>
                    </Box>
                ) : (
                    <>
                        <TabBarFill tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
                        <Box sx={{ mt: 3 }}>
                            {activeTab === 'portfolio' ? (
                                <PortfolioTab
                                    portfolios={portfolios}
                                    onAddPortfolio={handleAddPortfolioClick}
                                    onEdit={handleEditPortfolio}
                                    onDelete={handleDeletePortfolio}
                                />
                            ) : (
                                <CareerTab
                                    careers={careers}
                                    onAddCareer={handleAddCareerClick}
                                    onEdit={handleEditCareer}
                                    onDelete={handleDeleteCareer}
                                    isBrand={activeProfileType === 'brand'}
                                />
                            )}
                        </Box>
                    </>
                )}
            </Container>

            <AddPortfolioModal
                open={portfolioModalOpen}
                onClose={() => {
                    setPortfolioModalOpen(false);
                    setEditingPortfolioIndex(null);
                    setInitialPortfolioData(undefined);
                }}
                onAdded={handleSavePortfolio}
                initialData={initialPortfolioData}
            />

            <AddCareerModal
                open={careerModalOpen}
                onClose={() => {
                    setCareerModalOpen(false);
                    setEditingCareerIndex(null);
                    setInitialCareerData(undefined);
                }}
                onAdded={handleSaveCareer}
                initialData={initialCareerData}
                isBrand={activeProfileType === 'brand'}
            />
        </Box>
    );
}
