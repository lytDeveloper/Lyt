import { Dialog, Typography, IconButton, Box, Button, Checkbox, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useRef, useEffect } from 'react';
import type { ServerNotificationRow } from '../hooks/useServerNotifications';

interface Props {
    open: boolean;
    ads: ServerNotificationRow[];
    onClose: () => void;
    onDontShowToday: () => void;
}

interface SlideItem {
    id: string;
    url: string | null;
    title: string;
    body: string;
    link_url: string | null;
}

export default function GlobalAdsModal({ open, ads, onClose, onDontShowToday }: Props) {
    const [dontShowToday, setDontShowToday] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();

    // Flatten logic
    const slideItems: SlideItem[] = (ads || []).flatMap<SlideItem>((ad) => {
        const parseEntry = (value: string): SlideItem => {
            try {
                const parsed = JSON.parse(value) as { url?: string; title?: string; body?: string; link_url?: string };
                if (parsed && typeof parsed === 'object' && parsed.url) {
                    return {
                        id: ad.id,
                        url: parsed.url ?? null,
                        title: parsed.title ?? ad.title,
                        body: parsed.body ?? ad.body,
                        link_url: parsed.link_url ?? ad.link_url,
                    };
                }
            } catch {
                // 기존 문자열 형태를 위한 fallback
            }
            return {
                id: ad.id,
                url: value ?? null,
                title: ad.title,
                body: ad.body,
                link_url: ad.link_url,
            };
        };

        if (ad.image_urls && ad.image_urls.length > 0) {
            return ad.image_urls.map((value): SlideItem => parseEntry(value));
        }
        return [{
            id: ad.id,
            url: null,
            title: ad.title,
            body: ad.body,
            link_url: ad.link_url
        }];
    });

    useEffect(() => {
        // 모달이 다시 열릴 때마다 체크박스를 초기화하여 이전 상태가 남지 않도록 함
        if (open) {
            setDontShowToday(false);
        }
    }, [open]);

    const handleClose = () => {
        if (dontShowToday) {
            onDontShowToday();
        } else {
            onClose();
        }
    };

    const handleScroll = () => {
        const slider = sliderRef.current;
        if (!slider) return;
        const scrollLeft = slider.scrollLeft;
        const width = slider.clientWidth;
        const index = Math.round(scrollLeft / width);
        setCurrentSlide(index);
    };

    useEffect(() => {
        if (!open || slideItems.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => {
                const next = (prev + 1) % slideItems.length;
                const slider = sliderRef.current;
                const width = slider?.clientWidth || 0;
                if (slider && width) {
                    slider.scrollTo({ left: next * width, behavior: 'smooth' });
                }
                return next;
            });
        }, 3000);

        return () => {
            clearInterval(timer);
        };
    }, [open, slideItems.length]);

    if (!slideItems || slideItems.length === 0) return null;
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    maxWidth: '340px', // Approximately 87% of narrow mobile width
                    width: '87%',
                    m: 2,
                    p: 0,
                    backgroundColor: '#fff',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Image Slider Area (Top 69% approx) */}
            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '3/4', backgroundColor: '#f0f0f0' }}>
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        zIndex: 10,
                        backgroundColor: theme.palette.transparent.black,
                        // border: `0.1px solid ${theme.palette.transparent.black}`,
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        color: theme.palette.primary.contrastText,
                        padding: '6px',
                    }}
                >
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <Box
                    ref={sliderRef}
                    onScroll={handleScroll}
                    sx={{
                        display: 'flex',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollSnapType: 'x mandatory',
                        width: '100%',
                        height: '100%',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}
                >
                    {slideItems.map((item, index) => (
                        <Box
                            key={`${item.id}-${index}`}
                            sx={{
                                flex: '0 0 100%',
                                scrollSnapAlign: 'start',
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                            }}
                            onClick={() => {
                                if (item.link_url) {
                                    window.open(item.link_url, '_blank');
                                }
                            }}
                        >
                            {item.url ? (
                                <img
                                    src={item.url}
                                    alt={item.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: item.link_url ? 'pointer' : 'default' }}
                                />
                            ) : (
                                <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', cursor: item.link_url ? 'pointer' : 'default' }}>
                                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>{item.title}</Typography>
                                    <Typography variant="body1">{item.body}</Typography>
                                </Box>
                            )}

                            {(item.url && item.title) && (
                                <Box sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                                    p: 3,
                                    pt: 8,
                                    pointerEvents: 'none'
                                }}>
                                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>{item.title}</Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{item.body}</Typography>
                                </Box>
                            )}
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Bottom Area */}
            <Box sx={{ p: 2 }}>
                {/* Slider Indicators */}
                {slideItems.length > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2, mt: 1 }}>
                        {slideItems.map((_, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: currentSlide === idx ? '#2F54EB' : '#E0E0E0',
                                    transition: 'background-color 0.3s'
                                }}
                            />
                        ))}
                    </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pl: 0.5 }}>
                    <Checkbox
                        checked={dontShowToday}
                        onChange={(e) => setDontShowToday(e.target.checked)}
                        sx={{
                            p: 0,
                            mr: 1,
                            color: '#E0E0E0',
                            '&.Mui-checked': { color: '#BDBDBD' }
                        }}
                    />
                    <Typography
                        variant="body2"
                        sx={{ color: '#616161', fontSize: '13px', cursor: 'pointer' }}
                        onClick={() => setDontShowToday(!dontShowToday)}
                    >
                        오늘 하루 그만보기
                    </Typography>
                </Box>

                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleClose}
                    sx={{
                        borderRadius: 6,
                        py: 1,
                        width: '90%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mx: 'auto',
                        backgroundColor: '#2F54EB',
                        fontSize: '15px',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: 'none',
                    }}
                >
                    확인
                </Button>
            </Box>
        </Dialog>
    );
}
