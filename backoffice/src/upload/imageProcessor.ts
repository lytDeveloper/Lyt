/**
 * 이미지 처리 (WebP 변환)
 * browser-image-compression 라이브러리 사용
 */

import imageCompression from 'browser-image-compression';
import type { ProcessingResult } from './types';
import { IMAGE_COMPRESSION_CONFIG } from './types';

/**
 * 이미지를 WebP로 변환하고 압축
 */
export async function processImage(
  file: File,
  options?: {
    quality?: number;
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
    onProgress?: (progress: number) => void;
  }
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const originalSize = file.size;

  console.log(`[ImageProcessor] 이미지 처리 시작: ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);

  try {
    // 압축 옵션 설정
    const compressionOptions = {
      ...IMAGE_COMPRESSION_CONFIG,
      initialQuality: options?.quality ?? IMAGE_COMPRESSION_CONFIG.quality,
      maxWidthOrHeight: options?.maxWidthOrHeight ?? IMAGE_COMPRESSION_CONFIG.maxWidthOrHeight,
      maxSizeMB: options?.maxSizeMB ?? IMAGE_COMPRESSION_CONFIG.maxSizeMB,
      onProgress: (progress: number) => {
        // 0-80% 범위로 매핑 (업로드를 위해 20% 남겨둠)
        const mappedProgress = Math.floor(progress * 0.8);
        options?.onProgress?.(mappedProgress);
      },
    };

    // 이미지 압축 실행
    const compressedBlob = await imageCompression(file, compressionOptions);
    const processedSize = compressedBlob.size;
    const compressionRatio = ((originalSize - processedSize) / originalSize) * 100;

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[ImageProcessor] 처리 완료: ${(processedSize / 1024 / 1024).toFixed(2)}MB (압축률 ${compressionRatio.toFixed(1)}%, ${elapsedTime}초 소요)`
    );

    return {
      blob: compressedBlob,
      originalSize,
      processedSize,
      compressionRatio,
      format: 'webp',
    };
  } catch (error) {
    console.error('[ImageProcessor] 이미지 처리 실패:', error);
    throw new Error(`이미지 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * GIF 애니메이션 처리
 * 참고: browser-image-compression은 GIF 애니메이션을 첫 프레임만 변환합니다.
 * 애니메이션을 유지하려면 원본 파일을 그대로 반환하는 것을 권장합니다.
 */
export async function processAnimatedGif(file: File): Promise<ProcessingResult> {
  console.log(`[ImageProcessor] GIF 애니메이션 감지: ${file.name}`);
  console.log('[ImageProcessor] 애니메이션 유지를 위해 원본 파일 사용');

  const originalSize = file.size;

  return {
    blob: file,
    originalSize,
    processedSize: originalSize,
    compressionRatio: 0,
    format: 'gif',
  };
}

/**
 * 파일이 애니메이션 GIF인지 확인
 */
export function isAnimatedGif(file: File): boolean {
  return file.type === 'image/gif';
}
