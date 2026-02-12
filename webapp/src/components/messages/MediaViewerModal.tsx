/**
 * MediaViewerModal
 * Modal component for viewing images, audio, and video attachments within the chat room
 */

import { useState, useRef, useEffect } from 'react';
import { Dialog, Box, IconButton, Typography, Slider, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import DownloadIcon from '@mui/icons-material/Download';

export type MediaType = 'image' | 'audio' | 'video';

interface MediaViewerModalProps {
    open: boolean;
    onClose: () => void;
    type: MediaType;
    url: string;
    name?: string;
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function MediaViewerModal({ open, onClose, type, url, name }: MediaViewerModalProps) {
    const theme = useTheme();
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
        }
    }, [open]);

    const handlePlayPause = () => {
        const media = type === 'audio' ? audioRef.current : videoRef.current;
        if (!media) return;

        if (isPlaying) {
            media.pause();
        } else {
            media.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        const media = type === 'audio' ? audioRef.current : videoRef.current;
        if (media) {
            setCurrentTime(media.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        const media = type === 'audio' ? audioRef.current : videoRef.current;
        if (media) {
            setDuration(media.duration);
        }
    };

    const handleSeek = (_: Event, value: number | number[]) => {
        const media = type === 'audio' ? audioRef.current : videoRef.current;
        if (media) {
            media.currentTime = value as number;
            setCurrentTime(value as number);
        }
    };

    const handleVolumeChange = (_: Event, value: number | number[]) => {
        const media = type === 'audio' ? audioRef.current : videoRef.current;
        if (media) {
            const vol = value as number;
            media.volume = vol;
            setVolume(vol);
            setIsMuted(vol === 0);
        }
    };

    const toggleMute = () => {
        const media = type === 'audio' ? audioRef.current : videoRef.current;
        if (media) {
            media.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: theme.palette.background.paper,
                    borderRadius: 2,
                    maxHeight: '90vh',
                    m: 2,
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
            }}>
                <Typography
                    variant="subtitle1"
                    sx={{
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                        maxWidth: '80%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {name || (type === 'image' ? '이미지' : type === 'audio' ? '오디오' : '비디오')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={handleDownload} sx={{ color: theme.palette.text.primary }}>
                        <DownloadIcon />
                    </IconButton>
                    <IconButton onClick={onClose} sx={{ color: theme.palette.text.primary }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                minHeight: type === 'audio' ? 200 : 400,
            }}>
                {type === 'image' && (
                    <Box
                        component="img"
                        src={url}
                        alt={name || 'image'}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: 'calc(90vh - 120px)',
                            objectFit: 'contain',
                        }}
                    />
                )}

                {type === 'audio' && (
                    <Box sx={{ width: '100%', maxWidth: 500 }}>
                        <audio
                            ref={audioRef}
                            src={url}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleEnded}
                        />

                        {/* Audio waveform placeholder */}
                        <Box sx={{
                            height: 80,
                            bgcolor: theme.palette.grey[100],
                            borderRadius: 2,
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Typography variant="body2" color="text.secondary">
                                🎵 오디오 파일
                            </Typography>
                        </Box>

                        {/* Progress bar */}
                        <Slider
                            value={currentTime}
                            max={duration || 100}
                            onChange={handleSeek}
                            sx={{
                                color: theme.palette.primary.main,
                                '& .MuiSlider-thumb': { width: 12, height: 12 },
                            }}
                        />

                        {/* Time display */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                {formatTime(currentTime)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatTime(duration)}
                            </Typography>
                        </Box>

                        {/* Controls */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <IconButton onClick={toggleMute}>
                                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                            </IconButton>
                            <Slider
                                value={isMuted ? 0 : volume}
                                max={1}
                                step={0.1}
                                onChange={handleVolumeChange}
                                sx={{ width: 80 }}
                            />
                            <IconButton
                                onClick={handlePlayPause}
                                sx={{
                                    bgcolor: theme.palette.primary.main,
                                    color: '#fff',
                                    width: 56,
                                    height: 56,
                                    '&:hover': { bgcolor: theme.palette.primary.dark },
                                }}
                            >
                                {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                            </IconButton>
                        </Box>
                    </Box>
                )}

                {type === 'video' && (
                    <Box sx={{ width: '100%', position: 'relative' }}>
                        <video
                            ref={videoRef}
                            src={url}
                            controls
                            style={{
                                width: '100%',
                                maxHeight: 'calc(90vh - 120px)',
                                borderRadius: 8,
                            }}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleEnded}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                        />
                    </Box>
                )}
            </Box>
        </Dialog>
    );
}
