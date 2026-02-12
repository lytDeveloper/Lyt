import { useState, useEffect, useRef, useMemo, type CSSProperties } from 'react';
import { Box } from '@mui/material';
import { getThumbnailUrl } from '../../utils/signedUrl';

interface LazyImageProps {
  /**
   * Full-quality image URL
   */
  src: string | undefined | null;

  /**
   * Low-quality placeholder (base64 or low-res URL)
   */
  placeholder?: string;

  /**
   * Alt text for accessibility
   */
  alt?: string;

  /**
   * Fallback background color when no image
   */
  fallbackColor?: string;

  /**
   * Component type: 'background' for Box with backgroundImage, 'img' for <img> tag
   */
  type?: 'background' | 'img';

  /**
   * Custom styles (for Box component)
   */
  sx?: Record<string, any>;

  /**
   * Custom styles (for img element)
   */
  style?: CSSProperties;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Callback when image loads
   */
  onLoad?: () => void;

  /**
   * IntersectionObserver threshold (0.0 to 1.0)
   * @default 0.1
   */
  threshold?: number;

  /**
   * Root margin for IntersectionObserver (loads images before entering viewport)
   * @default "50px"
   */
  rootMargin?: string;

  /**
   * Children (only for type='background')
   */
  children?: React.ReactNode;

  /**
   * Force cache-busting for Supabase URLs (adds ?t=timestamp)
   * @default true
   */
  cacheBust?: boolean;

  /**
   * Target width for thumbnail optimization (pixels, 2x retina support)
   * If provided, Supabase Storage URLs will be automatically resized using render/image API
   */
  targetWidth?: number;

  /**
   * Target height for thumbnail optimization (pixels, defaults to targetWidth for square images)
   * If provided, Supabase Storage URLs will be automatically resized using render/image API
   */
  targetHeight?: number;

  /**
   * Image quality for thumbnail optimization (1-100, default 75)
   * Only used when targetWidth/targetHeight is provided
   */
  thumbnailQuality?: number;

  /**
   * How the image should be resized to fit its container
   * 'cover': fills container, may crop (default)
   * 'contain': fits entire image, may show background
   */
  objectFit?: 'cover' | 'contain';
}

/**
 * LazyImage Component
 *
 * Optimized image loading component with:
 * - IntersectionObserver for lazy loading
 * - LQIP (Low Quality Image Placeholder) support
 * - Smooth fade-in transition
 * - Defensive null/undefined handling
 *
 * @example
 * // Background image (for cards)
 * <LazyImage
 *   src={coverImageUrl}
 *   placeholder={lqipBase64}
 *   type="background"
 *   fallbackColor="#E9E9ED"
 *   sx={{ width: 80, height: 80, borderRadius: '8px' }}
 * />
 *
 * @example
 * // Profile image
 * <LazyImage
 *   src={profileImageUrl}
 *   alt="User profile"
 *   type="img"
 *   fallbackColor="#E9E9ED"
 *   style={{ width: 64, height: 64, borderRadius: '50%' }}
 * />
 */
export default function LazyImage({
  src,
  placeholder,
  alt = '',
  fallbackColor = '#E9E9ED',
  type = 'background',
  sx = {},
  style = {},
  className = '',
  onLoad,
  threshold = 0.1,
  rootMargin = '50px',
  children,
  cacheBust = true,
  targetWidth,
  targetHeight,
  thumbnailQuality = 75,
  objectFit = 'cover',
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(placeholder);
  const [hasRetried, setHasRetried] = useState(false);
  const [useOriginalUrl, setUseOriginalUrl] = useState(false);
  const elementRef = useRef<HTMLDivElement | HTMLImageElement>(null);

  // Compute original URL (without render/image transformation) for fallback
  const originalSrc = useMemo(() => {
    if (!src) return undefined;
    const trimmed = src.trim();
    if (!trimmed) return undefined;

    // Original behavior: cache-bust Supabase storage URLs
    const isSupabase = trimmed.includes('supabase.co/storage');
    const hasCacheBust = /[?&]t=/.test(trimmed);
    if (cacheBust && isSupabase && !hasCacheBust) {
      return `${trimmed}${trimmed.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }
    return trimmed;
  }, [src, cacheBust]);

  // Normalize and optimize Supabase storage URLs
  const normalizedSrc = useMemo(() => {
    // If render/image failed, use original URL
    if (useOriginalUrl) {
      return originalSrc;
    }

    if (!src) return undefined;
    const trimmed = src.trim();
    if (!trimmed) return undefined;

    // Apply thumbnail optimization if targetWidth is provided
    // 미리 저장된 썸네일 URL을 사용하므로 render/image API 호출 불필요
    if (targetWidth) {
      // objectFit에 따라 resize 옵션 결정: 'contain' -> 'contain', 'cover' -> 'cover'
      const resizeMode = objectFit === 'contain' ? 'contain' : 'cover';
      const optimized = getThumbnailUrl(trimmed, targetWidth, targetHeight, thumbnailQuality, true, resizeMode);
      // 미리 저장된 썸네일(render/image가 아닌 URL)은 캐시 버스팅 불필요
      // render/image 폴백인 경우에만 캐시 버스팅 적용
      if (optimized && optimized.includes('render/image')) {
        if (cacheBust && !/[?&]t=/.test(optimized)) {
          return `${optimized}${optimized.includes('?') ? '&' : '?'}t=${Date.now()}`;
        }
      }
      return optimized ?? trimmed;
    }

    // Original behavior: cache-bust Supabase storage URLs
    const isSupabase = trimmed.includes('supabase.co/storage');
    const hasCacheBust = /[?&]t=/.test(trimmed);
    if (cacheBust && isSupabase && !hasCacheBust) {
      const cacheBusted = `${trimmed}${trimmed.includes('?') ? '&' : '?'}t=${Date.now()}`;
      return cacheBusted;
    }
    return trimmed;
  }, [src, cacheBust, targetWidth, targetHeight, thumbnailQuality, useOriginalUrl, originalSrc]);

  // IntersectionObserver to detect when image enters viewport
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin]);

  // Load full image when in view
  useEffect(() => {
    if (!isInView || !normalizedSrc) return;

    const img = new Image();
    img.src = normalizedSrc;

    img.onload = () => {
      setCurrentSrc(normalizedSrc);
      setIsLoaded(true);
      onLoad?.();
    };

    img.onerror = () => {
      // If render/image API failed and we have an original URL to try
      if (!useOriginalUrl && originalSrc && normalizedSrc !== originalSrc) {
        console.warn(`[LazyImage] render/image failed, trying original URL: ${originalSrc}`);
        setUseOriginalUrl(true);
        return; // This will trigger re-render with originalSrc
      }
      console.warn(`[LazyImage] Failed to load image: ${normalizedSrc}`);
      setIsLoaded(true); // Still mark as loaded to show fallback
    };
  }, [isInView, normalizedSrc, onLoad, useOriginalUrl, originalSrc]);

  // Background image type (for cards, covers)
  if (type === 'background') {
    const hasValidSrc = normalizedSrc && currentSrc && currentSrc.trim();
    
    return (
      <Box
        ref={elementRef as React.RefObject<HTMLDivElement>}
        className={className}
        sx={{
          backgroundImage: hasValidSrc ? `url(${currentSrc})` : 'none',
          backgroundColor: hasValidSrc ? 'transparent' : fallbackColor,
          backgroundSize: objectFit === 'contain' ? 'contain' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transition: 'opacity 0.3s ease-in-out',
          opacity: isLoaded ? 1 : 0.7,
          ...sx,
        }}
      >
        {children}
      </Box>
    );
  }

  // Image tag type (for avatars, profiles)
  const hasValidSrc = normalizedSrc && currentSrc && currentSrc.trim();
  
  return (
    <img
      ref={elementRef as React.RefObject<HTMLImageElement>}
      src={hasValidSrc ? currentSrc : undefined}
      alt={alt}
      className={className}
      style={{
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoaded ? 1 : 0.7,
        backgroundColor: hasValidSrc ? 'transparent' : fallbackColor,
        objectFit: objectFit === 'contain' ? 'contain' : 'cover',
        objectPosition: 'center',
        ...style,
      }}
      loading="lazy" // Native lazy loading as fallback
      onError={(e) => {
        // If render/image API failed and we have an original URL to try
        if (!useOriginalUrl && originalSrc && normalizedSrc !== originalSrc) {
          console.warn(`[LazyImage] render/image failed, trying original URL: ${originalSrc}`);
          setUseOriginalUrl(true);
          setCurrentSrc(originalSrc);
          setIsLoaded(false);
          return;
        }
        // Retry once with a fresh cache buster if it's a Supabase URL
        if (!hasRetried && normalizedSrc && normalizedSrc.includes('supabase.co/storage')) {
          const retryUrl = `${normalizedSrc}${normalizedSrc.includes('?') ? '&' : '?'}t=${Date.now()}`;
          setHasRetried(true);
          setCurrentSrc(retryUrl);
          setIsLoaded(false);
          return;
        }
        // Hide broken image and show fallback background
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
}
