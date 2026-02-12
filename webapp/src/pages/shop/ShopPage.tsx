import { useState } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    Chip,
    useTheme,
    Tabs,
    Tab,
} from '@mui/material';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import { useQuery } from '@tanstack/react-query';

import { shopService, type ShopCategory, type ShopProduct } from '../../services/shopService';
import ShopProductModal from '../../components/shop/ShopProductModal';
import Header from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';

const CATEGORY_MAP: Record<ShopCategory, { label: string; icon: React.ReactElement }> = {
    decoration: { label: '프로필 꾸미기', icon: <StarsRoundedIcon /> },
    chat_ticket: { label: '채팅방 개설권', icon: <ForumRoundedIcon /> },
    explore_boost: { label: '탐색 대포', icon: <RocketLaunchRoundedIcon /> },
};

export default function ShopPage() {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState<ShopCategory>('decoration');
    const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: products = [], isLoading } = useQuery({
        queryKey: ['shop', 'products', activeTab],
        queryFn: () => shopService.getProductsByCategory(activeTab),
    });

    const handleProductClick = (product: ShopProduct) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    return (
        <Box sx={{
            pb: `${BOTTOM_NAV_HEIGHT}px`,
            minHeight: '100vh',
            bgcolor: '#F9FAFB',
            position: 'relative',
            maxWidth: '768px',
            margin: '0 auto'
        }}>
            {/* Header */}
            <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'white' }}>
                <Header />
            </Box>

            {/* Tabs */}
            <Box sx={{ bgcolor: 'white', px: 2, mb: 2 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant="fullWidth"
                    sx={{
                        '& .MuiTabs-indicator': {
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                        },
                    }}
                >
                    {Object.entries(CATEGORY_MAP).map(([key, { label, icon }]) => (
                        <Tab
                            key={key}
                            value={key}
                            icon={icon}
                            iconPosition="top"
                            label={label}
                            sx={{
                                fontSize: '12px',
                                fontWeight: 600,
                                py: 2,
                                minHeight: 72,
                            }}
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Product List */}
            <Container sx={{ py: 1 }}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2,
                }}>
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <Paper key={i} sx={{ p: 2, height: 200, borderRadius: '16px' }} elevation={0}>
                                <Box sx={{ width: '100%', height: 100, bgcolor: '#f0f0f0', borderRadius: '8px', mb: 2 }} />
                                <Box sx={{ width: '60%', height: 20, bgcolor: '#f0f0f0', borderRadius: '4px', mb: 1 }} />
                                <Box sx={{ width: '40%', height: 15, bgcolor: '#f0f0f0', borderRadius: '4px' }} />
                            </Paper>
                        ))
                    ) : (
                        products.map((product) => (
                            <Paper
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '20px',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    border: '1px solid transparent',
                                    '&:hover': {
                                        boxShadow: '0px 10px 20px rgba(0,0,0,0.05)',
                                        transform: 'translateY(-4px)',
                                        borderColor: theme.palette.primary.light,
                                    },
                                }}
                            >
                                {/* Thumbnail Placeholder/Image with Badge Overlay */}
                                <Box sx={{
                                    position: 'relative',
                                    width: '100%',
                                    aspectRatio: '1/1',
                                    bgcolor: '#F3F4F6',
                                    borderRadius: '12px',
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}>
                                    {/* Badge - overlaid on top-left */}
                                    {product.badgeText && (
                                        <Chip
                                            label={product.badgeText}
                                            size="small"
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                left: 8,
                                                height: 20,
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                bgcolor: theme.palette.primary.main,
                                                color: 'white',
                                                borderRadius: '4px',
                                                zIndex: 1,
                                            }}
                                        />
                                    )}
                                    {activeTab === 'decoration' && (
                                        <StarsRoundedIcon sx={{ fontSize: 64, color: '#D1D5DB' }} />
                                    )}
                                    {activeTab === 'chat_ticket' && (
                                        <ForumRoundedIcon sx={{ fontSize: 64, color: '#D1D5DB' }} />
                                    )}
                                    {activeTab === 'explore_boost' && (
                                        <RocketLaunchRoundedIcon sx={{ fontSize: 64, color: '#D1D5DB' }} />
                                    )}
                                </Box>

                                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5, color: '#111827' }}>
                                    {product.name}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: '#6B7280', mb: 1.5, flex: 1 }}>
                                    {product.description}
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: theme.palette.primary.main }}>
                                        ₩{product.price.toLocaleString()}
                                    </Typography>
                                    {product.originalPrice && (
                                        <Typography sx={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'line-through' }}>
                                            ₩{product.originalPrice.toLocaleString()}
                                        </Typography>
                                    )}
                                </Box>
                            </Paper>
                        ))
                    )}
                </Box>
            </Container>

            {/* Modals */}
            <ShopProductModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={selectedProduct}
            />

            <BottomNavigationBar />
        </Box>
    );
}
