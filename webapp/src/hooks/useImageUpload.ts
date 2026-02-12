import { useState, useMemo, useRef, useEffect, type ChangeEvent } from 'react';
import { compressImage } from '../utils/imageCompression';

export interface UseImageUploadOptions {
  initialCoverFile?: File | null;
  initialLogoFile?: File | null;
  onCoverChange?: (file: File | null) => void;
  onLogoChange?: (file: File | null) => void;
  /** 이미지 압축 비활성화 (기본: false = 압축 활성화) */
  disableCompression?: boolean;
}

export interface UseImageUploadReturn {
  // File state
  coverFile: File | null;
  logoFile: File | null;
  setCoverFile: (file: File | null) => void;
  setLogoFile: (file: File | null) => void;

  // Preview URLs
  coverUrl: string;
  logoUrl: string;

  // File input refs
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;

  // Handlers
  handleSelectCover: () => void;
  handleSelectLogo: () => void;
  handleCoverChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleLogoChange: (e: ChangeEvent<HTMLInputElement>) => void;

  // Reset functions
  resetCover: () => void;
  resetLogo: () => void;
  resetAll: () => void;
}

/**
 * Custom hook for managing image uploads (cover and logo)
 * Handles file state, preview URLs, refs, and event handlers
 *
 * 이미지는 선택 시 자동으로 WebP 형식으로 압축됩니다.
 * 실제 업로드 시 썸네일 자동 생성이 필요하면 imageUploadService.uploadImageWithThumbnails()를 사용하세요.
 *
 * @example
 * ```tsx
 * // 1. 훅으로 파일 상태 관리
 * const { coverFile, logoFile, ... } = useImageUpload();
 *
 * // 2. 업로드 시 썸네일 자동 생성
 * import { ImageUploadService } from '../services/imageUploadService';
 *
 * const handleSubmit = async () => {
 *   if (coverFile) {
 *     const result = await ImageUploadService.uploadImageWithThumbnails(
 *       coverFile,
 *       'brand-images',
 *       { prefix: 'cover', thumbnailSizes: ['SM', 'MD', 'LG'] }
 *     );
 *     // result.publicUrl - 원본 URL
 *     // result.thumbnailUrls - 썸네일 URL들
 *   }
 * };
 * ```
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    initialCoverFile = null,
    initialLogoFile = null,
    onCoverChange,
    onLogoChange,
    disableCompression = false,
  } = options;

  const [coverFile, setCoverFile] = useState<File | null>(initialCoverFile);
  const [logoFile, setLogoFile] = useState<File | null>(initialLogoFile);

  // Sync file states when initial props change
  useEffect(() => {
    setCoverFile(initialCoverFile);
  }, [initialCoverFile]);

  useEffect(() => {
    setLogoFile(initialLogoFile);
  }, [initialLogoFile]);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Create preview URLs with memoization
  const coverUrl = useMemo(() => {
    if (coverFile) {
      return URL.createObjectURL(coverFile);
    }
    return '';
  }, [coverFile]);

  const logoUrl = useMemo(() => {
    if (logoFile) {
      return URL.createObjectURL(logoFile);
    }
    return '';
  }, [logoFile]);

  // Cleanup object URLs on unmount or when files change
  useEffect(() => {
    return () => {
      if (coverUrl) {
        URL.revokeObjectURL(coverUrl);
      }
      if (logoUrl) {
        URL.revokeObjectURL(logoUrl);
      }
    };
  }, [coverUrl, logoUrl]);

  // Click handlers to trigger file input
  const handleSelectCover = () => {
    coverInputRef.current?.click();
  };

  const handleSelectLogo = () => {
    logoInputRef.current?.click();
  };

  // File change handlers (with automatic compression)
  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0] ?? null;

    if (!originalFile) {
      setCoverFile(null);
      onCoverChange?.(null);
      return;
    }

    // 압축 비활성화된 경우 원본 사용
    if (disableCompression) {
      setCoverFile(originalFile);
      onCoverChange?.(originalFile);
      return;
    }

    // 이미지 압축 적용
    try {
      const { file: compressedFile } = await compressImage(originalFile);
      setCoverFile(compressedFile);
      onCoverChange?.(compressedFile);
    } catch {
      // 압축 실패 시 원본 사용
      setCoverFile(originalFile);
      onCoverChange?.(originalFile);
    }
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0] ?? null;

    if (!originalFile) {
      setLogoFile(null);
      onLogoChange?.(null);
      return;
    }

    // 압축 비활성화된 경우 원본 사용
    if (disableCompression) {
      setLogoFile(originalFile);
      onLogoChange?.(originalFile);
      return;
    }

    // 이미지 압축 적용
    try {
      const { file: compressedFile } = await compressImage(originalFile);
      setLogoFile(compressedFile);
      onLogoChange?.(compressedFile);
    } catch {
      // 압축 실패 시 원본 사용
      setLogoFile(originalFile);
      onLogoChange?.(originalFile);
    }
  };

  // Reset functions
  const resetCover = () => {
    setCoverFile(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
    onCoverChange?.(null);
  };

  const resetLogo = () => {
    setLogoFile(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    onLogoChange?.(null);
  };

  const resetAll = () => {
    resetCover();
    resetLogo();
  };

  return {
    coverFile,
    logoFile,
    setCoverFile,
    setLogoFile,
    coverUrl,
    logoUrl,
    coverInputRef,
    logoInputRef,
    handleSelectCover,
    handleSelectLogo,
    handleCoverChange,
    handleLogoChange,
    resetCover,
    resetLogo,
    resetAll
  };
}
