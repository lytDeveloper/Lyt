/**
 * 썸네일 생성 유틸리티
 *
 * Supabase Image Transformation 비용 절감을 위해
 * 업로드 전 클라이언트에서 여러 크기의 썸네일을 미리 생성
 */

import imageCompression from 'browser-image-compression';
import { THUMBNAIL_SIZES, type ThumbnailSize } from '../constants/imageSizes';

/**
 * 썸네일 생성 결과
 */
export interface ThumbnailResult {
  size: ThumbnailSize;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * 썸네일 Blob 생성 (비율 유지)
 *
 * @param file 원본 이미지 파일
 * @param maxSize 최대 너비/높이 (픽셀)
 * @param quality WebP 품질 (0-1, 기본값 0.8)
 * @returns 생성된 썸네일 Blob
 */
export async function createThumbnailBlob(
  file: File,
  maxSize: number,
  quality: number = 0.8
): Promise<Blob> {
  // GIF는 변환하지 않음 (애니메이션 유지)
  if (file.type === 'image/gif') {
    return file;
  }

  try {
    const compressedBlob = await imageCompression(file, {
      maxWidthOrHeight: maxSize,
      maxSizeMB: 0.5, // 썸네일은 500KB 이하로
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: quality,
      preserveExif: false,
    });

    return compressedBlob;
  } catch (error) {
    console.error(`[ThumbnailGenerator] 썸네일 생성 실패 (${maxSize}px):`, error);
    // 실패 시 원본 반환
    return file;
  }
}

/**
 * 정사각형 크롭 썸네일 생성 (아바타용)
 *
 * @param file 원본 이미지 파일
 * @param size 출력 크기 (너비=높이)
 * @param quality WebP 품질 (0-1, 기본값 0.8)
 * @returns 정사각형으로 크롭된 썸네일 Blob
 */
export async function createSquareThumbnailBlob(
  file: File,
  size: number,
  quality: number = 0.8
): Promise<Blob> {
  // GIF는 변환하지 않음
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 정사각형 크롭 계산 (중앙 기준)
      const srcSize = Math.min(img.width, img.height);
      const srcX = (img.width - srcSize) / 2;
      const srcY = (img.height - srcSize) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 고품질 리사이징 설정
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 중앙 크롭 후 리사이즈
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * 여러 크기의 썸네일 일괄 생성
 *
 * @param file 원본 이미지 파일
 * @param sizes 생성할 썸네일 크기 목록
 * @param options 옵션 (정사각형 크롭 여부, 품질)
 * @returns 크기별 썸네일 Map
 */
export async function createThumbnails(
  file: File,
  sizes: ThumbnailSize[],
  options: {
    square?: boolean; // 정사각형 크롭 (아바타용)
    quality?: number;
  } = {}
): Promise<Map<ThumbnailSize, Blob>> {
  const { square = false, quality = 0.8 } = options;
  const results = new Map<ThumbnailSize, Blob>();

  // 병렬 생성
  const promises = sizes.map(async (size) => {
    const pixelSize = THUMBNAIL_SIZES[size];
    const blob = square
      ? await createSquareThumbnailBlob(file, pixelSize, quality)
      : await createThumbnailBlob(file, pixelSize, quality);

    return { size, blob };
  });

  const thumbnails = await Promise.all(promises);

  for (const { size, blob } of thumbnails) {
    results.set(size, blob);
  }

  return results;
}

/**
 * 썸네일 파일 생성 (업로드용)
 *
 * @param file 원본 이미지 파일
 * @param sizes 생성할 썸네일 크기 목록
 * @param baseFileName 기본 파일명 (확장자 제외)
 * @param options 옵션
 * @returns 크기별 File 객체 Map
 */
export async function createThumbnailFiles(
  file: File,
  sizes: ThumbnailSize[],
  baseFileName: string,
  options: {
    square?: boolean;
    quality?: number;
  } = {}
): Promise<Map<ThumbnailSize, File>> {
  const thumbnails = await createThumbnails(file, sizes, options);
  const files = new Map<ThumbnailSize, File>();

  for (const [size, blob] of thumbnails) {
    const suffix = size.toLowerCase();
    const fileName = `${baseFileName}_${suffix}.webp`;
    const thumbnailFile = new File([blob], fileName, { type: 'image/webp' });
    files.set(size, thumbnailFile);
  }

  return files;
}
