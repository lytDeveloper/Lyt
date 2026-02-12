import React, { useEffect, useState, useCallback } from 'react';
import DefaultImageConfirmDialog from '../components/common/DefaultImageConfirmDialog';

const DEFAULT_BASE_URL =
  'https://xianrhwkdarupnvaumti.supabase.co/storage/v1/object/public/assets/defaults';

export interface UseDefaultImagesOptions {
  /** 저장된 커버 파일 (스토어에서 가져온 값) */
  storedCoverFile?: File | null;
  /** 저장된 로고 파일 (스토어에서 가져온 값) */
  storedLogoFile?: File | null;
  /** 현재 커버 파일 (useImageUpload에서 가져온 값) */
  coverFile?: File | null;
  /** 현재 로고 파일 (useImageUpload에서 가져온 값) */
  logoFile?: File | null;
  /** 커버 파일 설정 함수 */
  setCoverFile?: (file: File | null) => void;
  /** 로고 파일 설정 함수 */
  setLogoFile?: (file: File | null) => void;
  /** 커버 이미지 사용 여부 (기본값: true) */
  useCover?: boolean;
  /** 로고 이미지 사용 여부 (기본값: true) */
  useLogo?: boolean;
}

export interface UseDefaultImagesReturn {
  /** 기본 이미지 로드 함수 */
  loadDefaultImages: () => Promise<{ coverFile?: File; logoFile?: File }>;
  /** 파일이 기본 이미지인지 확인하는 함수 */
  isDefaultImage: (file: File | null) => boolean;
  /** 기본 이미지 사용 확인 및 제출 처리 함수 */
  handleSubmitWithDefaults: (onSubmit: (finalFiles: { coverFile?: File | null; logoFile?: File | null }) => void) => Promise<void>;
  /** 기본 이미지 사용 확인 다이얼로그 컴포넌트 */
  ConfirmDialog: React.ReactNode;
}

/**
 * 기본 이미지 관련 로직을 처리하는 공통 훅
 * 
 * @example
 * ```tsx
 * const { handleSubmitWithDefaults } = useDefaultImages({
 *   storedCoverFile,
 *   storedLogoFile,
 *   coverFile,
 *   logoFile,
 *   setCoverFile,
 *   setLogoFile,
 *   useCover: true,
 *   useLogo: true,
 * });
 * 
 * const handleSubmit = async () => {
 *   await handleSubmitWithDefaults(() => {
 *     setImages(coverFile, logoFile);
 *     navigate('/next');
 *   });
 * };
 * ```
 */
export function useDefaultImages(options: UseDefaultImagesOptions): UseDefaultImagesReturn {
  const {
    storedCoverFile = null,
    storedLogoFile = null,
    coverFile = null,
    logoFile = null,
    setCoverFile,
    setLogoFile,
    useCover = true,
    useLogo = true,
  } = options;

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingOnSubmit, setPendingOnSubmit] = useState<((finalFiles: { coverFile?: File | null; logoFile?: File | null }) => void) | null>(null);

  const fetchAsFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/png' });
  };

  const loadDefaultImages = async (): Promise<{ coverFile?: File; logoFile?: File }> => {
    const promises: Promise<File>[] = [];

    if (useCover) {
      promises.push(fetchAsFile(`${DEFAULT_BASE_URL}/cover.png`, 'default-cover.png'));
    }

    if (useLogo) {
      promises.push(fetchAsFile(`${DEFAULT_BASE_URL}/profile.png`, 'default-profile.png'));
    }

    const results = await Promise.all(promises);

    const result: { coverFile?: File; logoFile?: File } = {};
    let index = 0;

    if (useCover) {
      result.coverFile = results[index++];
    }

    if (useLogo) {
      result.logoFile = results[index++];
    }

    return result;
  };

  const isDefaultImage = (file: File | null): boolean => {
    return file?.name === 'default-cover.png' || file?.name === 'default-profile.png';
  };

  // 컴포넌트 마운트 시 기본 이미지 자동 로드
  useEffect(() => {
    const loadDefaultsOnMount = async () => {
      // 저장된 이미지가 모두 있으면 기본 이미지를 로드하지 않음
      const hasStoredCover = useCover ? !!storedCoverFile : true;
      const hasStoredLogo = useLogo ? !!storedLogoFile : true;

      if (hasStoredCover && hasStoredLogo) {
        return;
      }

      // 하나라도 없으면 기본 이미지 로드
      const needsCover = useCover && !storedCoverFile;
      const needsLogo = useLogo && !storedLogoFile;

      if (needsCover || needsLogo) {
        try {
          const defaults = await loadDefaultImages();

          // 기본 이미지를 훅의 상태에 설정 (스토어에는 저장하지 않음)
          if (needsCover && defaults.coverFile && setCoverFile) {
            setCoverFile(defaults.coverFile);
          }
          if (needsLogo && defaults.logoFile && setLogoFile) {
            setLogoFile(defaults.logoFile);
          }
        } catch (error) {
          console.error('기본 이미지 로딩 실패:', error);
        }
      }
    };

    loadDefaultsOnMount();
  }, []); // 마운트 시 한 번만 실행

  const handleSubmitWithDefaults = async (onSubmit: (finalFiles: { coverFile?: File | null; logoFile?: File | null }) => void): Promise<void> => {
    // 저장된 이미지가 모두 있으면 사용자가 선택한 이미지이므로 바로 진행
    const hasStoredCover = useCover ? !!storedCoverFile : true;
    const hasStoredLogo = useLogo ? !!storedLogoFile : true;

    if (hasStoredCover && hasStoredLogo) {
      onSubmit({
        coverFile: useCover ? (coverFile || storedCoverFile) : undefined,
        logoFile: useLogo ? (logoFile || storedLogoFile) : undefined,
      });
      return;
    }

    // 기본 이미지인 상태로 진행하려는 경우 confirm 확인
    const checkCover = useCover
      ? (!storedCoverFile && (!coverFile || isDefaultImage(coverFile)))
      : true;
    const checkLogo = useLogo
      ? (!storedLogoFile && (!logoFile || isDefaultImage(logoFile)))
      : true;

    const isUsingDefaults = checkCover && checkLogo;

    if (isUsingDefaults) {
      setPendingOnSubmit(() => onSubmit);
      setIsConfirmOpen(true);
      return;
    }

    await proceedWithSubmit(onSubmit);
  };

  const proceedWithSubmit = async (onSubmit: (finalFiles: { coverFile?: File | null; logoFile?: File | null }) => void) => {

    // 기본 이미지가 이미 로드되어 있으면 그것을 사용, 없으면 새로 로드
    let finalCoverFile = coverFile;
    let finalLogoFile = logoFile;

    const needsCover = useCover && !finalCoverFile;
    const needsLogo = useLogo && !finalLogoFile;

    if (needsCover || needsLogo) {
      try {
        const defaults = await loadDefaultImages();
        if (needsCover && defaults.coverFile) {
          finalCoverFile = defaults.coverFile;
          // UI에 반영하기 위해 setCoverFile 호출
          if (setCoverFile) {
            setCoverFile(defaults.coverFile);
          }
        }
        if (needsLogo && defaults.logoFile) {
          finalLogoFile = defaults.logoFile;
          // UI에 반영하기 위해 setLogoFile 호출
          if (setLogoFile) {
            setLogoFile(defaults.logoFile);
          }
        }
      } catch (error) {
        console.error('기본 이미지 로딩 실패:', error);
        window.confirm('기본 이미지 로딩에 실패했어요. 다시 시도해주세요.');
        return;
      }
    }

    // onSubmit 콜백에 최종 파일들을 전달
    onSubmit({
      coverFile: useCover ? finalCoverFile : undefined,
      logoFile: useLogo ? finalLogoFile : undefined,
    });
  };

  const handleConfirm = useCallback(() => {
    if (pendingOnSubmit) {
      proceedWithSubmit(pendingOnSubmit);
      setPendingOnSubmit(null);
    }
    setIsConfirmOpen(false);
  }, [pendingOnSubmit]);

  const handleCancel = useCallback(() => {
    setPendingOnSubmit(null);
    setIsConfirmOpen(false);
  }, []);

  return {
    loadDefaultImages,
    isDefaultImage,
    handleSubmitWithDefaults,
    ConfirmDialog: (
      <DefaultImageConfirmDialog
        open={isConfirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
      />
    ),
  };
}

