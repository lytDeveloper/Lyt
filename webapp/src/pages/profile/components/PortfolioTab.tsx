import { useState } from 'react';
import { Box, Typography, Button, Paper, Chip, IconButton, Menu, MenuItem, useTheme } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import type { PortfolioItem } from '../../../services/profileService';
import WriteIconImg from '../../../assets/icon/emptyState/write.png';
interface PortfolioTabProps {
    portfolios: PortfolioItem[];
    onAddPortfolio: () => void;
    onEdit: (item: PortfolioItem, index: number) => void;
    onDelete: (index: number) => void;
}

export default function PortfolioTab({ portfolios, onAddPortfolio, onEdit, onDelete }: PortfolioTabProps) {
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

    // Menu State
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedMenuIndex, setSelectedMenuIndex] = useState<number | null>(null);

    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
        setAnchorEl(event.currentTarget);
        setSelectedMenuIndex(index);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedMenuIndex(null);
    };

    const handleEditClick = () => {
        if (selectedMenuIndex !== null) {
            onEdit(portfolios[selectedMenuIndex], selectedMenuIndex);
        }
        handleMenuClose();
    };

    const handleDeleteClick = () => {
        if (selectedMenuIndex !== null) {
            onDelete(selectedMenuIndex);
        }
        handleMenuClose();
    };

    const theme = useTheme();

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                    작업물 <span style={{ color: theme.palette.text.secondary }}>{portfolios.length}</span>
                </Typography>
                <Button
                    onClick={onAddPortfolio}
                    sx={{ fontSize: 14, fontWeight: 600, color: theme.palette.primary.main, textTransform: 'none' }}
                >
                    + 추가하기
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {portfolios.map((item, index) => (
                    <Paper
                        key={index}
                        elevation={0}
                        sx={{
                            p: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '16px',
                            display: 'flex',
                            gap: 2
                        }}
                    >
                        {/* Left Image Placeholder */}
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '8px',
                                bgcolor: theme.palette.bgColor.default,
                                backgroundImage: item.coverImage ? `url(${item.coverImage})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                flexShrink: 0
                            }}
                        />

                        {/* Right Content */}
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 0.5 }}>
                                    {item.title}
                                </Typography>
                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, index)}>
                                    <MoreVertIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                                </IconButton>
                            </Box>

                            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 0.5 }}>
                                {item.performed_YM}
                            </Typography>

                            <Typography sx={{ fontSize: 13, color: theme.palette.subText.default, mb: 1 }}>
                                {item.category}
                            </Typography>

                            <Box sx={{ mb: 1 }}>
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: theme.palette.text.secondary,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: expandedDescriptions.has(index) ? 'unset' : 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {item.description}
                                </Typography>
                                {item.description && item.description.length > 100 && (
                                    <Button
                                        onClick={() => {
                                            const newExpanded = new Set(expandedDescriptions);
                                            if (newExpanded.has(index)) {
                                                newExpanded.delete(index);
                                            } else {
                                                newExpanded.add(index);
                                            }
                                            setExpandedDescriptions(newExpanded);
                                        }}
                                        sx={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            color: theme.palette.primary.main,
                                            textTransform: 'none',
                                            minWidth: 'auto',
                                            p: 0,
                                            mt: 0.5,
                                            '&:hover': {
                                                backgroundColor: 'transparent',
                                                textDecoration: 'underline',
                                            },
                                        }}
                                    >
                                        {expandedDescriptions.has(index) ? '접기' : '더 보기'}
                                    </Button>
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(item.skills || []).map((skill, idx) => (
                                    <Chip
                                        key={idx}
                                        label={skill}
                                        size="small"
                                        sx={{
                                            bgcolor: theme.palette.bgColor.default,
                                            color: theme.palette.subText.default,
                                            fontSize: 11,
                                            height: 22
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Paper>
                ))}

                {portfolios.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Box
                            component="img"
                            src={WriteIconImg}
                            alt="Empty State"
                            sx={{ width: 70, height: 70, mb: 2 }}
                        />
                        <Typography sx={{ fontWeight: 600 }}>
                            등록된 작업물이 없어요.
                        </Typography>
                        <Typography sx={{ fontWeight: 400, fontSize: 14, color: theme.palette.text.secondary }}>
                            추가하기 버튼을 눌러 작업물을 등록해보세요.
                        </Typography>
                    </Box>
                )}
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        borderRadius: '12px',
                        border: `1px solid ${theme.palette.divider}`,
                        minWidth: 120,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }
                }}
            >
                <MenuItem onClick={handleEditClick} sx={{ fontSize: 14, gap: 1 }}>
                    <EditNoteOutlinedIcon sx={{ fontSize: 16 }} /> 수정
                </MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{ fontSize: 14, gap: 1, color: theme.palette.status.Error }}>
                    <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} /> 삭제
                </MenuItem>
            </Menu>
        </Box >
    );
}
