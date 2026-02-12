import { useState, useEffect, memo } from 'react';
import { Box, Skeleton } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { getSignedImageUrl } from '../../utils/signedUrl';

interface SignedImageProps {
  /** 원본 이미지 URL (public URL 또는 storage path) */
  src: string | null | undefined;
  /** 이미지 alt 텍스트 */
  alt?: string;
  /** 로딩 중 표시할 fallback 컴포넌트 */
  fallback?: React.ReactNode;
  /** 이미지가 없거나 로드 실패 시 표시할 컴포넌트 */
  emptyFallback?: React.ReactNode;
  /** MUI sx 스타일 */
  sx?: SxProps<Theme>;
  /** 이미지 로드 완료 콜백 */
  onLoad?: () => void;
  /** 이미지 로드 실패 콜백 */
  onError?: () => void;
  /** 추가 img 속성 */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}

/**
 * Private Supabase Storage 버킷의 이미지를 서명 URL로 자동 변환하여 표시하는 컴포넌트
 * 
 * @example
 * // 기본 사용
 * <SignedImage src={magazine.cover_image_url} alt="커버" sx={{ width: 200, height: 150 }} />
 * 
 * @example
 * // 커스텀 fallback
 * <SignedImage 
 *   src={imageUrl} 
 *   fallback={<LightningLoader />}
 *   emptyFallback={<Typography>이미지 없음</Typography>}
 * />
 */
function SignedImage({
  src,
  alt = '',
  fallback,
  emptyFallback,
  sx,
  onLoad,
  onError,
  imgProps,
}: SignedImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);

    if (src) {
      getSignedImageUrl(src)
        .then((url) => {
          if (isMounted) {
            setSignedUrl(url);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        });
    } else {
      setSignedUrl(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [src]);

  // 로딩 중
  if (loading) {
    return (
      fallback || (
        <Skeleton
          variant="rectangular"
          sx={{ borderRadius: 1, ...sx }}
        />
      )
    );
  }

  // 이미지 없음 또는 에러
  if (!signedUrl || error) {
    return emptyFallback || null;
  }

  return (
    <Box
      component="img"
      src={signedUrl}
      alt={alt}
      sx={sx}
      onLoad={onLoad}
      onError={() => {
        setError(true);
        onError?.();
      }}
      {...imgProps}
    />
  );
}

export default memo(SignedImage);

