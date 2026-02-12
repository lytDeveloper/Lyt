import { supabase } from '../lib/supabase';
import { getContentType } from '../utils/fileUtils';
import {
  type ThumbnailSize,
  THUMBNAIL_SIZES,
  THUMBNAIL_SUFFIXES,
  DEFAULT_THUMBNAIL_SIZES,
  AVATAR_THUMBNAIL_SIZES,
} from '../constants/imageSizes';
import { createThumbnailBlob, createSquareThumbnailBlob } from '../utils/thumbnailGenerator';

export type StorageBucket = 'brand-images' | 'artist-images' | 'creative-images' | 'fan-images' | 'collaboration-images' | 'portfolio-covers';

export interface ImageUploadResult {
  publicUrl: string;
  fileName: string;
}

export interface ProfileImagesUploadResult {
  coverUrl: string;
  logoUrl: string;
  coverFileName: string;
  logoFileName: string;
}

/**
 * 썸네일 포함 업로드 결과
 */
export interface ImageUploadWithThumbnailsResult {
  publicUrl: string;
  fileName: string;
  thumbnailUrls: Partial<Record<ThumbnailSize, string>>;
}

/**
 * 썸네일 업로드 옵션
 */
export interface ThumbnailUploadOptions {
  /** 생성할 썸네일 크기 목록 (기본: SM, MD, LG) */
  thumbnailSizes?: ThumbnailSize[];
  /** 정사각형 크롭 여부 (아바타용, 기본: false) */
  square?: boolean;
  /** WebP 품질 (0-1, 기본: 0.8) */
  quality?: number;
  /** 파일명 접두사 (예: 'logo', 'cover') */
  prefix?: string;
}

export class ImageUploadService {
  /**
   * Upload a single image file to Supabase storage
   *
   * @param file - The image file to upload
   * @param bucket - The storage bucket name
   * @param fileName - Optional custom file name (defaults to generated name)
   * @returns Public URL and file name
   */
  static async uploadImage(
    file: File,
    bucket: StorageBucket,
    fileName?: string
  ): Promise<ImageUploadResult> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // Generate file name if not provided
      const extension = file.name.split('.').pop();
      const generatedFileName = fileName || `${user.id}/${Date.now()}.${extension}`;

      // Get Content-Type for the file
      const contentType = getContentType(file);

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(generatedFileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(generatedFileName);

      return {
        publicUrl,
        fileName: generatedFileName
      };
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  /**
   * 이미지와 썸네일을 함께 업로드
   * Supabase Image Transformation 비용 절감을 위해 미리 생성된 썸네일 업로드
   *
   * @param file - 원본 이미지 파일
   * @param bucket - 스토리지 버킷
   * @param options - 썸네일 옵션
   * @returns 원본 URL과 썸네일 URL들
   */
  static async uploadImageWithThumbnails(
    file: File,
    bucket: StorageBucket,
    options: ThumbnailUploadOptions = {}
  ): Promise<ImageUploadWithThumbnailsResult> {
    const {
      thumbnailSizes = DEFAULT_THUMBNAIL_SIZES,
      square = false,
      quality = 0.8,
      prefix = '',
    } = options;

    try {
      // 현재 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      const timestamp = Date.now();
      // _wt 마커: "with thumbnails" - 썸네일이 함께 업로드된 이미지임을 표시
      // getThumbnailUrl()에서 이 마커를 확인하여 pre-stored 썸네일 사용 여부 결정
      const basePath = prefix
        ? `${user.id}/${prefix}_${timestamp}_wt`
        : `${user.id}/${timestamp}_wt`;

      // 업로드할 파일들 준비 (병렬 처리)
      const uploadPromises: Promise<{ key: string; url: string }>[] = [];

      // 1. 원본 이미지 업로드
      const originalFileName = `${basePath}.webp`;
      uploadPromises.push(
        this.uploadSingleFile(file, bucket, originalFileName).then(url => ({
          key: 'original',
          url,
        }))
      );

      // 2. 썸네일 생성 및 업로드
      for (const size of thumbnailSizes) {
        const suffix = THUMBNAIL_SUFFIXES[size];
        const thumbnailFileName = `${basePath}${suffix}.webp`;
        const pixelSize = THUMBNAIL_SIZES[size];

        const thumbnailPromise = (async () => {
          // 썸네일 Blob 생성
          const blob = square
            ? await createSquareThumbnailBlob(file, pixelSize, quality)
            : await createThumbnailBlob(file, pixelSize, quality);

          // File 객체로 변환
          const thumbnailFile = new File([blob], thumbnailFileName, {
            type: 'image/webp',
          });

          // 업로드
          const url = await this.uploadSingleFile(thumbnailFile, bucket, thumbnailFileName);
          return { key: size, url };
        })();

        uploadPromises.push(thumbnailPromise);
      }

      // 모든 업로드 병렬 실행
      const results = await Promise.all(uploadPromises);

      // 결과 구성
      const thumbnailUrls: Partial<Record<ThumbnailSize, string>> = {};
      let publicUrl = '';

      for (const { key, url } of results) {
        if (key === 'original') {
          publicUrl = url;
        } else {
          thumbnailUrls[key as ThumbnailSize] = url;
        }
      }

      console.log(`[ImageUploadService] 업로드 완료: 원본 + ${thumbnailSizes.length}개 썸네일`);

      return {
        publicUrl,
        fileName: originalFileName,
        thumbnailUrls,
      };
    } catch (error) {
      console.error('Image upload with thumbnails failed:', error);
      throw error;
    }
  }

  /**
   * 단일 파일 업로드 헬퍼 (내부 사용)
   */
  private static async uploadSingleFile(
    file: File,
    bucket: StorageBucket,
    fileName: string
  ): Promise<string> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '31536000', // 1년 캐시 (CDN 최적화)
        upsert: false,
        contentType: 'image/webp',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * 아바타 이미지 업로드 (정사각형 썸네일 자동 생성)
   *
   * @param file - 원본 이미지 파일
   * @param bucket - 스토리지 버킷
   * @param prefix - 파일명 접두사 (예: 'logo', 'profile')
   * @returns 원본 URL과 아바타용 썸네일 URL들
   */
  static async uploadAvatarImage(
    file: File,
    bucket: StorageBucket,
    prefix: string = 'logo'
  ): Promise<ImageUploadWithThumbnailsResult> {
    return this.uploadImageWithThumbnails(file, bucket, {
      thumbnailSizes: AVATAR_THUMBNAIL_SIZES,
      square: true,
      prefix,
    });
  }

  /**
   * Upload logo image for a profile
   *
   * @param logoFile - Logo image file
   * @param bucket - Storage bucket name
   * @returns Public URL and file name
   */
  static async uploadLogoImage(
    logoFile: File,
    bucket: StorageBucket
  ): Promise<{ logoUrl: string, fileName: string }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // Generate logo file name
      const extension = logoFile.name.split('.').pop();
      const logoFileName = `${user.id}/logo_${Date.now()}.${extension}`;

      // Get Content-Type for the logo file
      const contentType = getContentType(logoFile);

      // Upload logo image
      const { error: logoError } = await supabase.storage
        .from(bucket)
        .upload(logoFileName, logoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType,
        });

      if (logoError) throw new Error(`로고 이미지 업로드 실패: ${logoError.message}`);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(logoFileName);

      return {
        logoUrl: publicUrl,
        fileName: logoFileName
      };
    } catch (error) {
      console.error('로고 이미지 업로드 실패:', error);
      throw error;
    }
  }



  /**
   * Upload cover and logo images for a profile(둘 다 업로드)
   *
   * @param coverFile - Cover image file
   * @param logoFile - Logo image file
   * @param bucket - Storage bucket name
   * @returns Public URLs and file names for both images
   */
  static async uploadProfileImages(
    coverFile: File,
    logoFile: File,
    bucket: StorageBucket
  ): Promise<ProfileImagesUploadResult> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // Generate file names
      const coverExtension = coverFile.name.split('.').pop();
      const logoExtension = logoFile.name.split('.').pop();
      const coverFileName = `${user.id}/cover_${Date.now()}.${coverExtension}`;
      const logoFileName = `${user.id}/logo_${Date.now()}.${logoExtension}`;

      // Get Content-Type for both files
      const coverContentType = getContentType(coverFile);
      const logoContentType = getContentType(logoFile);

      // Upload cover image
      const { error: coverError } = await supabase.storage
        .from(bucket)
        .upload(coverFileName, coverFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: coverContentType,
        });

      if (coverError) throw new Error(`커버 이미지 업로드 실패: ${coverError.message}`);

      // Upload logo image
      const { error: logoError } = await supabase.storage
        .from(bucket)
        .upload(logoFileName, logoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: logoContentType,
        });

      if (logoError) {
        // Rollback cover image if logo upload fails
        await this.deleteImage(bucket, coverFileName);
        throw new Error(`로고 이미지 업로드 실패: ${logoError.message}`);
      }

      // Get public URLs
      const { data: { publicUrl: coverPublicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(coverFileName);

      const { data: { publicUrl: logoPublicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(logoFileName);

      return {
        coverUrl: coverPublicUrl,
        logoUrl: logoPublicUrl,
        coverFileName,
        logoFileName
      };
    } catch (error) {
      console.error('Profile images upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete an image from storage
   *
   * @param bucket - Storage bucket name
   * @param fileName - File name to delete
   */
  static async deleteImage(bucket: StorageBucket, fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) throw error;
    } catch (error) {
      console.error('Image deletion failed:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images from storage
   *
   * @param bucket - Storage bucket name
   * @param fileNames - Array of file names to delete
   */
  static async deleteImages(bucket: StorageBucket, fileNames: string[]): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(fileNames);

      if (error) throw error;
    } catch (error) {
      console.error('Images deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user ID
   * Utility method for generating file paths
   */
  static async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('사용자 인증이 필요합니다.');
    }
    return user.id;
  }
}

// Export singleton instance
export const imageUploadService = ImageUploadService;
