import { supabase } from '../lib/supabase';
import {
  THUMBNAIL_SIZES,
  THUMBNAIL_SUFFIXES,
  type ThumbnailSize,
} from '../constants/imageSizes';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BUCKET_NAME = 'homepage-images';

/**
 * 타겟 너비에 맞는 썸네일 크기 선택
 * 타겟 너비보다 크거나 같은 가장 작은 썸네일 선택
 */
function selectThumbnailSize(targetWidth: number): ThumbnailSize | null {
  const sizes: Array<{ key: ThumbnailSize; value: number }> = [
    { key: 'XS', value: THUMBNAIL_SIZES.XS },
    { key: 'SM', value: THUMBNAIL_SIZES.SM },
    { key: 'MD', value: THUMBNAIL_SIZES.MD },
    { key: 'LG', value: THUMBNAIL_SIZES.LG },
    { key: 'XL', value: THUMBNAIL_SIZES.XL },
  ];

  for (const { key, value } of sizes) {
    if (value >= targetWidth) {
      return key;
    }
  }

  return null; // 너무 큰 요청은 폴백
}

/**
 * 썸네일 파일 경로 생성
 * 예: logo_123456789.webp → logo_123456789_sm.webp
 */
function generateThumbnailPath(originalPath: string, size: ThumbnailSize): string {
  const suffix = THUMBNAIL_SUFFIXES[size];

  // 확장자 앞에 접미사 삽입
  const extensionMatch = originalPath.match(/^(.+)(\.[^.]+)$/);
  if (extensionMatch) {
    const [, name, ext] = extensionMatch;
    return `${name}${suffix}${ext}`;
  }

  return `${originalPath}${suffix}`;
}

/**
 * Supabase Storage public URL을 썸네일 URL로 변환
 *
 * 1. 새 이미지(.webp): 미리 저장된 썸네일 파일 URL 반환 (비용 절감)
 * 2. 기존 이미지(.jpg, .png 등): render/image API로 폴백 (기존 이미지 호환)
 *
 * @param url - 원본 이미지 URL
 * @param width - 썸네일 너비 (기본 96px, 2x 레티나 대응)
 * @param height - 썸네일 높이 (기본 width와 동일)
 * @param quality - 이미지 품질 (1-100, 기본 75) - 폴백용
 * @param useFallback - render/image 폴백 사용 여부 (기본 true)
 * @param resize - 리사이즈 모드 ('cover' | 'contain', 기본 'cover')
 * @returns 변환된 썸네일 URL 또는 원본 URL
 */
export function getThumbnailUrl(
  url: string | null | undefined,
  width: number = 96,
  height?: number,
  quality: number = 75,
  useFallback: boolean = true,
  resize: 'cover' | 'contain' = 'cover'
): string | null {
  if (!url) return null;

  // URL에서 쿼리 파라미터 제거 (mapProject에서 추가한 ?t=... 등)
  const urlWithoutQuery = url.split('?')[0];
  const baseUrl = urlWithoutQuery.substring(0, urlWithoutQuery.indexOf('/storage/v1'));

  // Supabase Storage URL인지 확인 (쿼리 파라미터 제거 후)
  const storagePattern = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
  const match = urlWithoutQuery.match(storagePattern);

  if (!match) {
    // Supabase Storage URL이 아니면 원본 반환
    return url;
  }

  const [, bucket, path] = match;
  const h = height ?? width;

  // _wt 마커가 있는 이미지만 미리 저장된 썸네일 사용
  // _wt = "with thumbnails" - uploadImageWithThumbnails()로 업로드된 이미지
  // 마커가 없는 이미지(기존 업로드)는 render/image 폴백 사용
  // 단, resize='contain'인 경우 미리 저장된 썸네일(cover 방식)을 사용하지 않고 render/image API 사용
  const hasPreStoredThumbnails = /_wt\.webp$/i.test(path);

  if (hasPreStoredThumbnails && resize === 'cover') {
    // 적절한 썸네일 크기 선택
    const thumbnailSize = selectThumbnailSize(width);

    if (thumbnailSize) {
      // 미리 저장된 썸네일 URL 생성
      const thumbnailPath = generateThumbnailPath(path, thumbnailSize);
      return `${baseUrl}/storage/v1/object/public/${bucket}/${thumbnailPath}`;
    }
  }

  // 폴백: render/image API 사용 (기존 이미지 또는 너무 큰 크기 요청 시)
  if (useFallback) {
    return `${baseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=${width}&height=${h}&resize=${resize}&quality=${quality}`;
  }

  // 폴백 비활성화 시 원본 반환
  return url;
}

/**
 * render/image API를 직접 사용하는 썸네일 URL 생성
 * 기존 이미지 호환용 (마이그레이션 전까지 사용)
 *
 * @deprecated 새 이미지는 미리 생성된 썸네일 사용 권장
 */
export function getRenderImageUrl(
  url: string | null | undefined,
  width: number = 96,
  height?: number,
  quality: number = 75
): string | null {
  if (!url) return null;

  const storagePattern = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
  const match = url.match(storagePattern);

  if (!match) return url;

  const [, bucket, path] = match;
  const h = height ?? width;
  const baseUrl = url.substring(0, url.indexOf('/storage/v1'));

  return `${baseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=${width}&height=${h}&resize=cover&quality=${quality}`;
}

// 이미지 변환 기본 옵션 (Supabase Image Transformation 비용 절감을 위해 비활성화)
// 새로 업로드되는 이미지는 클라이언트에서 미리 압축되므로 서버 변환 불필요
// const DEFAULT_IMAGE_TRANSFORM = { width: 1200, quality: 80 };

/**
 * Supabase public URL에서 storage path 추출
 * 
 * 예시:
 * - https://xxx.supabase.co/storage/v1/object/public/homepage-images/magazines/abc.jpg
 *   -> magazines/abc.jpg
 * - magazines/abc.jpg (이미 path인 경우)
 *   -> magazines/abc.jpg
 */
export function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;

  // 이미 서명 URL인 경우 null 반환 (재생성 불필요)
  if (url.includes(`storage/v1/object/sign/${BUCKET_NAME}`)) return null;

  // public URL인 경우 path 추출
  const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`;
  if (url.startsWith(publicPrefix)) {
    return url.slice(publicPrefix.length);
  }

  // 외부 URL(http로 시작)인 경우 null 반환
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return null;
  }

  // 이미 path인 경우 그대로 반환
  return url;
}

/**
 * URL이 homepage-images 버킷의 이미지인지 확인하고 서명 URL 반환
 * 외부 URL이거나 이미 서명 URL인 경우 원본 반환
 */
export async function getSignedImageUrl(url: string | null | undefined, ttlSeconds = 3600): Promise<string | null> {
  if (!url) return null;

  const path = extractStoragePath(url);

  // path가 null이면 서명 불필요 (외부 URL 또는 이미 서명 URL)
  if (!path) return url;

  try {
    return await getSignedUrl(path, ttlSeconds);
  } catch (error) {
    console.error('서명 URL 생성 실패:', error);
    return url; // 실패 시 원본 URL 반환
  }
}

/**
 * 이미지 변환 옵션 타입
 */
export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Supabase Storage 서명 URL 생성 헬퍼 (단일 파일)
 *
 * TTL은 초 단위이며 기본 1시간(3600초)입니다.
 *
 * 주의: Supabase Image Transformation 비용 절감을 위해
 * 기본적으로 transform 옵션은 비활성화됩니다.
 * 명시적으로 transform 옵션을 전달한 경우에만 변환이 적용됩니다.
 *
 * @param path - 파일 경로
 * @param ttlSeconds - URL 유효 시간 (초)
 * @param transform - 이미지 변환 옵션 (명시적으로 전달 시에만 적용)
 */
export async function getSignedUrl(
  path: string,
  ttlSeconds = 3600,
  transform?: ImageTransformOptions | false
): Promise<string> {
  if (!path) {
    throw new Error('유효한 파일 경로가 필요합니다.');
  }

  // transform이 명시적으로 전달된 경우에만 적용 (비용 절감)
  // false가 전달되면 변환 안 함, undefined면 변환 안 함, 객체면 변환 적용
  const transformOptions = typeof transform === 'object' ? transform : undefined;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, ttlSeconds, {
      transform: transformOptions,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? '서명 URL 생성에 실패했어요.');
  }

  return data.signedUrl;
}

/**
 * 여러 파일의 서명 URL을 한 번에 생성 (일괄 처리)
 * Supabase createSignedUrls API를 활용하여 API 호출 수를 최소화합니다.
 *
 * @param paths - 서명할 파일 경로 배열 (null/undefined 허용)
 * @param ttlSeconds - URL 유효 시간 (초, 기본 1시간)
 * @returns { normalizedPath: signedUrl } 형태의 Map
 *
 * 사용 예시:
 * const paths = ['slider/a.png', 'slider/b.mp4', null];
 * const signedMap = await getSignedUrls(paths);
 * const url = signedMap.get('slider/a.png');
 */
export async function getSignedUrls(
  paths: (string | null | undefined)[],
  ttlSeconds = 3600
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // null/undefined 필터링 및 path 정규화
  const pathEntries: Array<{ original: string; normalized: string }> = [];

  for (const p of paths) {
    if (!p) continue;
    const normalized = extractStoragePath(p);
    if (normalized) {
      pathEntries.push({ original: p, normalized });
    }
  }

  // 유효한 경로가 없으면 빈 Map 반환
  if (pathEntries.length === 0) {
    return result;
  }

  // 중복 제거 (같은 파일을 여러 번 요청하는 경우)
  const uniquePaths = [...new Set(pathEntries.map(e => e.normalized))];

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrls(uniquePaths, ttlSeconds);

    if (error) {
      console.error('일괄 서명 URL 생성 오류:', error);
      return result;
    }

    // 결과 매핑: path -> signedUrl
    (data || []).forEach((item) => {
      if (item.signedUrl && item.path) {
        result.set(item.path, item.signedUrl);
      }
    });
  } catch (error) {
    console.error('일괄 서명 URL 생성 실패:', error);
  }

  return result;
}

/**
 * 배열 형태로 서명 URL 반환 (순서 보장)
 * 입력 배열의 순서를 유지하며, 각 요소에 대해 서명 URL을 반환합니다.
 *
 * @param paths - 원본 URL/경로 배열
 * @param ttlSeconds - URL 유효 시간 (초)
 * @returns 서명된 URL 배열 (null인 경우 null 유지, 외부 URL은 원본 유지)
 */
export async function getSignedUrlsArray(
  paths: (string | null | undefined)[],
  ttlSeconds = 3600
): Promise<(string | null)[]> {
  const signedMap = await getSignedUrls(paths, ttlSeconds);

  return paths.map(originalPath => {
    if (!originalPath) return null;

    const normalizedPath = extractStoragePath(originalPath);

    // 외부 URL이거나 이미 서명 URL인 경우 원본 반환
    if (!normalizedPath) return originalPath;

    // 서명 URL이 있으면 반환, 없으면 원본 반환
    return signedMap.get(normalizedPath) || originalPath;
  });
}
