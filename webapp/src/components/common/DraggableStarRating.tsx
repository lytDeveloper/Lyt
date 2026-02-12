import { useRef, useState, useCallback } from 'react';
import { Box, SvgIcon } from '@mui/material';

interface DraggableStarRatingProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
    size?: 'small' | 'medium' | 'large';
    readOnly?: boolean;
}

const SIZES = {
    small: 18,
    medium: 22,
    large: 28,
};

const GAPS = {
    small: 2,
    medium: 3,
    large: 4,
};

/**
 * 드래그 가능한 0.5점 단위 별점 컴포넌트
 * - 터치/마우스 드래그로 부드럽게 별점 조절
 * - 0.5점 단위로 스냅
 */
export default function DraggableStarRating({
    value,
    onChange,
    max = 5,
    size = 'medium',
    readOnly = false,
}: DraggableStarRatingProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const starSize = SIZES[size];
    const gap = GAPS[size];

    // 위치로부터 별점 계산 (0.5 단위 스냅)
    const calculateRating = useCallback(
        (clientX: number) => {
            if (!containerRef.current) return value;

            const rect = containerRef.current.getBoundingClientRect();
            const x = clientX - rect.left;
            const totalWidth = rect.width;

            // 비율 계산
            let ratio = x / totalWidth;
            ratio = Math.max(0, Math.min(1, ratio)); // 0~1 범위로 클램프

            // 0.5 단위로 스냅
            const rawRating = ratio * max;
            const snappedRating = Math.round(rawRating * 2) / 2;

            return Math.max(1, Math.min(max, snappedRating));
        },
        [max, value]
    );

    const handleStart = (clientX: number) => {
        if (readOnly) return;
        setIsDragging(true);
        const newRating = calculateRating(clientX);
        onChange(newRating);
    };

    const handleMove = (clientX: number) => {
        if (readOnly || !isDragging) return;
        const newRating = calculateRating(clientX);
        onChange(newRating);
    };

    const handleEnd = () => {
        setIsDragging(false);
    };

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleStart(e.clientX);
        document.addEventListener('mousemove', onDocumentMouseMove);
        document.addEventListener('mouseup', onDocumentMouseUp);
    };

    const onDocumentMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX);
    };

    const onDocumentMouseUp = () => {
        handleEnd();
        document.removeEventListener('mousemove', onDocumentMouseMove);
        document.removeEventListener('mouseup', onDocumentMouseUp);
    };

    // Touch Events
    const onTouchStart = (e: React.TouchEvent) => {
        handleStart(e.touches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX);
    };

    const onTouchEnd = () => {
        handleEnd();
    };

    // 별 렌더링
    const renderStars = () => {
        const stars = [];

        for (let i = 1; i <= max; i++) {
            const fillPercentage = Math.min(1, Math.max(0, value - (i - 1)));

            stars.push(
                <Box
                    key={i}
                    sx={{
                        position: 'relative',
                        width: starSize,
                        height: starSize,
                    }}
                >
                    {/* 빈 별 (배경) */}
                    <SvgIcon
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: starSize,
                            height: starSize,
                            color: '#E0E0E0',
                        }}
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </SvgIcon>

                    {/* 채워진 별 (클리핑) */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${fillPercentage * 100}%`,
                            height: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        <SvgIcon
                            sx={{
                                width: starSize,
                                height: starSize,
                                color: '#FFB800',
                            }}
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </SvgIcon>
                    </Box>
                </Box>
            );
        }

        return stars;
    };

    return (
        <Box
            ref={containerRef}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: `${gap}px`,
                cursor: readOnly ? 'default' : 'pointer',
                userSelect: 'none',
                touchAction: 'none', // 터치 스크롤 방지
            }}
        >
            {renderStars()}
        </Box>
    );
}
