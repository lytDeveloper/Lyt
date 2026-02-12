import { Box, Typography, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../stores/profileStore';
import { useProfileData } from '../../hooks/useMyProfileData';
import { getBadgeAsset } from '../../constants/badgeAssets';
import Header from '../../components/common/Header';

export default function MyBadges() {
    const navigate = useNavigate();
    const { profileId, type: profileType } = useProfileStore();
    const { data: profileDataResult } = useProfileData(profileId, profileType);

    const badges = profileDataResult?.badges || [];

    return (
        <Box sx={{ pb: 4, minHeight: '100vh', bgcolor: '#ffffff' }}>
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1100,
                backgroundColor: 'transparent',
                backdropFilter: 'blur(3px) saturate(180%)',
                WebkitBackdropFilter: 'blur(3px) saturate(180%)',
            }}>
                <Header showBackButton={true} onBackClick={() => navigate(-1)} />
            </Box>

            <Container maxWidth="sm" sx={{ mt: 3, px: 3 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#111827' }}>
                        나의 성취 배지
                    </Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: 14 }}>
                        다양한 활동을 하면서 배지를 획득해보세요!
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2
                }}>
                    {badges.map((badge) => {
                        const badgeAsset = getBadgeAsset(badge.id);
                        return (
                            <Box key={badge.id}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        borderRadius: '24px',
                                        textAlign: 'center',
                                        border: '1px solid #F3F4F6',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.03)',
                                        transition: 'transform 0.2s ease',
                                        '&:active': {
                                            transform: 'scale(0.98)'
                                        }
                                    }}
                                >
                                    {/* Badge Image Area */}
                                    <Box sx={{
                                        position: 'relative',
                                        width: '80px',
                                        height: '80px',
                                        mb: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {/* Shadow/Glow effect for obtained badges */}
                                        {badge.obtained && (
                                            <Box sx={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                bgcolor: 'rgba(37, 99, 235, 0.1)',
                                                filter: 'blur(15px)',
                                                zIndex: 0
                                            }} />
                                        )}

                                        <Box sx={{
                                            width: '70%',
                                            height: '70%',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            zIndex: 1,
                                            filter: badge.obtained ? 'none' : 'grayscale(100%)',
                                            opacity: badge.obtained ? 1 : 0.3,
                                            bgcolor: badge.obtained ? 'transparent' : 'rgba(0,0,0,0.05)'
                                        }}>
                                            {badgeAsset ? (
                                                <Box
                                                    component="img"
                                                    src={badgeAsset}
                                                    alt={badge.name}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            ) : (
                                                <Typography sx={{ fontSize: '32px' }}>{badge.icon}</Typography>
                                            )}
                                        </Box>

                                        {/* Dark Mask for unearned badges */}
                                        {!badge.obtained && (
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                borderRadius: '50%',
                                                bgcolor: 'rgba(0,0,0,0.1)',
                                                zIndex: 2
                                            }} />
                                        )}
                                    </Box>

                                    <Typography sx={{
                                        fontWeight: 800,
                                        fontSize: 15,
                                        color: badge.obtained ? '#111827' : '#9CA3AF',
                                        mb: 1
                                    }}>
                                        {badge.name}
                                    </Typography>

                                    <Typography sx={{
                                        fontSize: 12,
                                        color: badge.obtained ? '#4B5563' : '#D1D5DB',
                                        lineHeight: 1.4,
                                        wordBreak: 'keep-all'
                                    }}>
                                        {badge.description}
                                    </Typography>
                                </Paper>
                            </Box>
                        );
                    })}
                </Box>
            </Container>
        </Box>
    );
}
