/**
 * 파일 검증 유틸리티
 */

import type { ValidationResult } from './types';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION,
  MAX_IMAGE_DIMENSION,
} from './types';

/**
 * 이미지 해상도 추출
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 로드할 수 없습니다.'));
    };

    img.src = url;
  });
}

/**
 * 비디오 메타데이터 추출 (지속시간, 해상도)
 */
export function getVideoMetadata(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('비디오를 로드할 수 없습니다.'));
    };

    video.src = url;
  });
}

/**
 * 이미지 파일 검증
 */
export async function validateImage(file: File): Promise<ValidationResult> {
  const errors: string[] = [];

  // MIME 타입 검증
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
    errors.push(`지원하지 않는 이미지 형식입니다. (${file.type})`);
  }

  // 파일 크기 검증
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (MAX_IMAGE_SIZE / (1024 * 1024)).toFixed(0);
    errors.push(`이미지 파일 크기는 ${sizeMB}MB 이하여야 합니다.`);
  }

  // 해상도 검증
  try {
    const { width, height } = await getImageDimensions(file);
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      errors.push(`이미지 해상도는 ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px 이하여야 합니다.`);
    }
  } catch (error) {
    errors.push('이미지 파일이 손상되었거나 읽을 수 없습니다.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 비디오 파일 검증
 */
export async function validateVideo(file: File): Promise<ValidationResult> {
  const errors: string[] = [];

  // MIME 타입 검증
  if (!SUPPORTED_VIDEO_TYPES.includes(file.type as any)) {
    errors.push(`지원하지 않는 비디오 형식입니다. (${file.type})`);
  }

  // 파일 크기 검증
  if (file.size > MAX_VIDEO_SIZE) {
    const sizeMB = (MAX_VIDEO_SIZE / (1024 * 1024)).toFixed(0);
    errors.push(`비디오 파일 크기는 ${sizeMB}MB 이하여야 합니다.`);
  }

  // 지속시간 검증
  try {
    const { duration } = await getVideoMetadata(file);
    if (duration > MAX_VIDEO_DURATION) {
      const maxMinutes = Math.floor(MAX_VIDEO_DURATION / 60);
      errors.push(`비디오 길이는 ${maxMinutes}분 이하여야 합니다.`);
    }
  } catch (error) {
    errors.push('비디오 파일이 손상되었거나 읽을 수 없습니다.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 파일이 이미지인지 확인
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 파일이 비디오인지 확인
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}
