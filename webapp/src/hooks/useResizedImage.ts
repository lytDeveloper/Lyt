/**
 * useResizedImage Hook
 *
 * 서버에서 가져온 큰 이미지를 프론트엔드에서 Canvas로 리사이즈
 * - 메모리 사용량 감소
 * - 렌더링 성능 향상
 * - 원본 이미지는 그대로 유지 (품질 필요 시 원본 사용 가능)
 */

import { useState, useEffect } from 'react';
import { resizeImageFromUrl, resizeImagesFromUrls } from '../utils/imageUtils';

interface UseResizedImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  enabled?: boolean;
}

/**
 * 단일 이미지 리사이즈 Hook
 * @param imageUrl - 원본 이미지 URL
 * @param options - 리사이즈 옵션
 * @returns 리사이즈된 이미지 URL (로딩 중에는 원본 URL 반환)
 */
export function useResizedImage(
  imageUrl: string | null | undefined,
  options: UseResizedImageOptions = {}
): string {
  const {
    maxWidth = 100,
    maxHeight = 100,
    quality = 0.7,
    enabled = true,
  } = options;

  const [resizedUrl, setResizedUrl] = useState<string>(imageUrl || '');

  useEffect(() => {
    if (!imageUrl || !enabled) {
      setResizedUrl(imageUrl || '');
      return;
    }

    let isMounted = true;

    resizeImageFromUrl(imageUrl, maxWidth, maxHeight, quality)
      .then((url) => {
        if (isMounted) {
          setResizedUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResizedUrl(imageUrl);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl, maxWidth, maxHeight, quality, enabled]);

  return resizedUrl;
}

/**
 * 여러 이미지 배치 리사이즈 Hook
 * @param imageUrls - 원본 이미지 URL 배열
 * @param options - 리사이즈 옵션
 * @returns Map<원본URL, 리사이즈URL>
 */
export function useResizedImages(
  imageUrls: (string | null | undefined)[],
  options: UseResizedImageOptions = {}
): Map<string, string> {
  const {
    maxWidth = 100,
    maxHeight = 100,
    enabled = true,
  } = options;

  const [resizedMap, setResizedMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setResizedMap(new Map());
      return;
    }

    const validUrls = imageUrls.filter((url): url is string => !!url);

    if (validUrls.length === 0) {
      setResizedMap(new Map());
      return;
    }

    let isMounted = true;

    resizeImagesFromUrls(validUrls, maxWidth, maxHeight)
      .then((map) => {
        if (isMounted) {
          setResizedMap(map);
        }
      })
      .catch(() => {
        // 실패 시 원본 URL 매핑
        if (isMounted) {
          const fallbackMap = new Map<string, string>();
          validUrls.forEach((url) => fallbackMap.set(url, url));
          setResizedMap(fallbackMap);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(imageUrls), maxWidth, maxHeight, enabled]);

  return resizedMap;
}

export default useResizedImage;
