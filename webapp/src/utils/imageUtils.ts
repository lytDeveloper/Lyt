/**
 * Image processing and handling utilities
 * Centralized image-related helper functions
 */

// --- Image Validation ---

/**
 * Validate image file
 * @param file - File to validate
 * @param options - Validation options
 * @returns Error message or null if valid
 */
export function validateImage(
  file: File | null,
  options: {
    required?: boolean;
    maxSize?: number; // in MB
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<string | null> {
  const { required = false, maxSize = 10 } = options;

  return new Promise((resolve) => {
    if (!file) {
      resolve(required ? '이미지를 선택해주세요.' : null);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      resolve('이미지 파일만 업로드 가능해요.');
      return;
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      resolve(`이미지 크기는 ${maxSize}MB 이하여야 해요.`);
      return;
    }

    // Check dimensions if specified
    if (options.minWidth || options.minHeight || options.maxWidth || options.maxHeight) {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (options.minWidth && img.width < options.minWidth) {
          resolve(`이미지 너비는 최소 ${options.minWidth}px 이상이어야 해요.`);
          return;
        }

        if (options.minHeight && img.height < options.minHeight) {
          resolve(`이미지 높이는 최소 ${options.minHeight}px 이상이어야 해요.`);
          return;
        }

        if (options.maxWidth && img.width > options.maxWidth) {
          resolve(`이미지 너비는 최대 ${options.maxWidth}px 이하여야 해요.`);
          return;
        }

        if (options.maxHeight && img.height > options.maxHeight) {
          resolve(`이미지 높이는 최대 ${options.maxHeight}px 이하여야 해요.`);
          return;
        }

        resolve(null);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('이미지를 로드할 수 없어요.');
      };

      img.src = url;
    } else {
      resolve(null);
    }
  });
}

// --- Image Processing ---

/**
 * Create object URL from file
 * @param file - File to create URL from
 * @returns Object URL or empty string
 */
export function createImageUrl(file: File | null): string {
  if (!file) return '';
  return URL.createObjectURL(file);
}

/**
 * Revoke object URL
 * @param url - URL to revoke
 */
export function revokeImageUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 * @param file - Image file to resize
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Resized image as Blob
 */
export function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        file.type,
        0.9
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
 * Convert image to specific format
 * @param file - Image file to convert
 * @param format - Target format (e.g., 'image/jpeg', 'image/png')
 * @param quality - Quality (0-1) for lossy formats
 * @returns Converted image as Blob
 */
export function convertImageFormat(
  file: File,
  format: string = 'image/jpeg',
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        format,
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
 * Get image dimensions
 * @param file - Image file
 * @returns Promise with width and height
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
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Compress image while maintaining aspect ratio
 * @param file - Image file to compress
 * @param quality - Compression quality (0-1)
 * @returns Compressed image as File
 */
export async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  const blob = await convertImageFormat(file, 'image/jpeg', quality);
  return new File([blob], file.name, { type: 'image/jpeg' });
}

/**
 * Create thumbnail from image
 * @param file - Image file
 * @param size - Thumbnail size (square)
 * @returns Thumbnail as Blob
 */
export async function createThumbnail(file: File, size: number = 150): Promise<Blob> {
  return resizeImage(file, size, size);
}

// --- Image File Helpers ---

/**
 * Check if file is an image
 * @param file - File to check
 * @returns True if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Get file extension from filename
 * @param filename - Filename
 * @returns File extension (lowercase)
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate unique filename with timestamp
 * @param originalName - Original filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.replace(`.${extension}`, '');
  return `${nameWithoutExt}_${timestamp}.${extension}`;
}

// --- 프론트엔드 이미지 리사이즈 (표시용) ---

// 리사이즈된 이미지 캐시 (메모리 절약)
const resizedImageCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

/**
 * URL에서 가져온 이미지를 Canvas로 리사이즈하여 압축된 dataURL 반환
 * 큰 이미지를 가져와도 표시용으로 축소하여 메모리/렌더링 최적화
 *
 * @param imageUrl - 원본 이미지 URL
 * @param maxWidth - 최대 너비 (기본 200px)
 * @param maxHeight - 최대 높이 (기본 200px)
 * @param quality - JPEG 품질 (0-1, 기본 0.7)
 * @returns 리사이즈된 이미지 dataURL
 */
export async function resizeImageFromUrl(
  imageUrl: string,
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.7
): Promise<string> {
  if (!imageUrl) return '';

  // 캐시 키 생성
  const cacheKey = `${imageUrl}_${maxWidth}_${maxHeight}_${quality}`;
  if (resizedImageCache.has(cacheKey)) {
    return resizedImageCache.get(cacheKey)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS 허용

    img.onload = () => {
      let { width, height } = img;

      // 이미 작은 이미지는 리사이즈 불필요
      if (width <= maxWidth && height <= maxHeight) {
        resolve(imageUrl);
        return;
      }

      // 비율 유지하며 크기 계산
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);

      // Canvas로 리사이즈
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageUrl); // fallback
        return;
      }

      // 안티앨리어싱 품질 향상
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);

      // JPEG로 변환 (WebP보다 호환성 좋음)
      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      // 캐시에 저장 (크기 제한)
      if (resizedImageCache.size >= MAX_CACHE_SIZE) {
        const firstKey = resizedImageCache.keys().next().value;
        if (firstKey) resizedImageCache.delete(firstKey);
      }
      resizedImageCache.set(cacheKey, dataUrl);

      resolve(dataUrl);
    };

    img.onerror = () => {
      // 로드 실패 시 원본 URL 반환
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}

/**
 * 여러 이미지 URL을 배치로 리사이즈
 * @param imageUrls - 원본 이미지 URL 배열
 * @param maxWidth - 최대 너비
 * @param maxHeight - 최대 높이
 * @returns Map<원본URL, 리사이즈URL>
 */
export async function resizeImagesFromUrls(
  imageUrls: string[],
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const validUrls = imageUrls.filter((url) => !!url);

  if (validUrls.length === 0) return result;

  // 병렬 처리
  const resized = await Promise.all(
    validUrls.map((url) => resizeImageFromUrl(url, maxWidth, maxHeight))
  );

  validUrls.forEach((url, index) => {
    result.set(url, resized[index]);
  });

  return result;
}

/**
 * 이미지 리사이즈 캐시 초기화
 */
export function clearResizedImageCache(): void {
  resizedImageCache.clear();
}
