/**
 * 이미지 압축 유틸리티
 * browser-image-compression 라이브러리 사용
 * backoffice 패턴 참고
 */

import imageCompression from 'browser-image-compression';

// 압축 설정 (모바일 최적화)
export const IMAGE_COMPRESSION_CONFIG = {
  quality: 0.8, // WebP 품질 80%
  maxSizeMB: 1, // 목표 파일 크기 1MB
  maxWidthOrHeight: 1920, // 최대 해상도 1920px
  useWebWorker: true,
  fileType: 'image/webp' as const,
  preserveExif: false, // EXIF 메타데이터 제거
};

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * 이미지를 WebP로 변환하고 압축
 * @param file 원본 이미지 파일
 * @param options 압축 옵션 (선택)
 * @returns 압축된 파일과 압축 정보
 */
export async function compressImage(
  file: File,
  options?: {
    quality?: number;
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
  }
): Promise<CompressionResult> {
  const originalSize = file.size;

  // GIF는 애니메이션 유지를 위해 압축하지 않음
  if (file.type === 'image/gif') {
    console.log(`[ImageCompression] GIF 파일은 압축하지 않음: ${file.name}`);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }

  // 이미 1MB 이하인 경우 압축 생략
  if (originalSize <= 1 * 1024 * 1024) {
    console.log(`[ImageCompression] 이미 작은 파일, 압축 생략: ${file.name} (${(originalSize / 1024).toFixed(0)}KB)`);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }

  console.log(`[ImageCompression] 압축 시작: ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);

  try {
    const compressionOptions = {
      ...IMAGE_COMPRESSION_CONFIG,
      initialQuality: options?.quality ?? IMAGE_COMPRESSION_CONFIG.quality,
      maxWidthOrHeight: options?.maxWidthOrHeight ?? IMAGE_COMPRESSION_CONFIG.maxWidthOrHeight,
      maxSizeMB: options?.maxSizeMB ?? IMAGE_COMPRESSION_CONFIG.maxSizeMB,
    };

    const compressedBlob = await imageCompression(file, compressionOptions);
    const compressedSize = compressedBlob.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    // Blob을 File로 변환 (확장자를 .webp로 변경)
    const originalName = file.name.replace(/\.[^.]+$/, '');
    const compressedFile = new File([compressedBlob], `${originalName}.webp`, {
      type: 'image/webp',
    });

    console.log(
      `[ImageCompression] 압축 완료: ${(compressedSize / 1024 / 1024).toFixed(2)}MB (압축률 ${compressionRatio.toFixed(1)}%)`
    );

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('[ImageCompression] 압축 실패, 원본 파일 반환:', error);
    // 압축 실패 시 원본 파일 반환
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }
}
