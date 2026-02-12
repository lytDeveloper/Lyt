import { Box, Typography } from '@mui/material';

interface ReviewTemplateCardProps {
    template: string;
    count: number;
}

/**
 * 리뷰 템플릿 문구와 받은 개수를 표시하는 카드 컴포넌트
 * 밝은 회색 배경에 문구 왼쪽, 개수 오른쪽 정렬
 */
export default function ReviewTemplateCard({ template, count }: ReviewTemplateCardProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2.5,
                py: 1.5,
                bgcolor: '#F3F4F6',
                borderRadius: '12px',
                width: '100%',
            }}
        >
            <Typography
                sx={{
                    fontSize: 14,
                    color: '#374151',
                    fontWeight: 400,
                }}
            >
                {template}
            </Typography>
            <Typography
                sx={{
                    fontSize: 16,
                    color: '#6B7280',
                    fontWeight: 500,
                    ml: 2,
                    flexShrink: 0,
                }}
            >
                {count}
            </Typography>
        </Box>
    );
}
