/**
 * 업로드 파이프라인 공통 타입 정의
 */

export interface UploadOptions {
  bucket: string;
  folder?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface ProcessingResult {
  blob: Blob;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  format: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 지원하는 이미지 MIME 타입
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

// 지원하는 비디오 MIME 타입
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
] as const;

// 파일 크기 제한
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_DURATION = 180; // 180초 (3분)
export const MAX_IMAGE_DIMENSION = 4000; // 4000px

// 압축 설정 (모바일 최적화 - 최대 압축)
export const IMAGE_COMPRESSION_CONFIG = {
  quality: 0.75, // WebP 품질 75%
  maxSizeMB: 1, // 목표 파일 크기 1MB
  maxWidthOrHeight: 2000, // 최대 해상도 2000px
  useWebWorker: true,
  fileType: 'image/webp' as const,
  preserveExif: false, // EXIF 메타데이터 제거
};

export const VIDEO_COMPRESSION_CONFIG = {
  crf: 15, // VP8 CRF (10-63, 낮을수록 고품질)
  maxHeight: 540, // 480p로 해상도 낮춤
  fps: 24, // 24fps로 낮춤
  audioBitrate: '64k', // 오디오 비트레이트 낮춤
  videoCodec: 'libvpx', // VP8 (VP9보다 메모리 사용량 적음)
  audioCodec: 'libopus', // Opus 오디오 코덱 (메모리 사용량 적음)
  threads: 1, // 단일 스레드
};
