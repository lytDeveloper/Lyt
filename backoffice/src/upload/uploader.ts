/**
 * 통합 업로더 - MIME 기반 라우팅 및 Supabase 업로드
 */

import { supabase } from '../lib/supabase';
import type { UploadOptions, ProcessingResult } from './types';
import { isImageFile, isVideoFile, validateImage, validateVideo } from './validators';
import { processImage, isAnimatedGif, processAnimatedGif } from './imageProcessor';
import { processVideo } from './videoProcessor';

/**
 * 파일 업로드 (이미지/비디오 자동 감지 및 처리)
 */
export async function uploadFile(
  file: File,
  adminUserId: string,
  options: UploadOptions
): Promise<string> {
  console.log(`[Uploader] 파일 업로드 시작: ${file.name} (${file.type})`);

  try {
    // 1. 파일 타입 감지
    const isImage = isImageFile(file);
    const isVideo = isVideoFile(file);

    if (!isImage && !isVideo) {
      throw new Error('지원하지 않는 파일 형식입니다. 이미지 또는 비디오만 업로드 가능합니다.');
    }

    // 2. 파일 검증
    const validation = isImage ? await validateImage(file) : await validateVideo(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'));
    }

    // 3. 파일 처리 (압축/인코딩)
    let processingResult: ProcessingResult;

    if (isImage) {
      // 애니메이션 GIF는 원본 유지
      if (isAnimatedGif(file)) {
        processingResult = await processAnimatedGif(file);
      } else {
        processingResult = await processImage(file, {
          onProgress: (progress) => {
            options.onProgress?.(progress);
          },
        });
      }
    } else {
      processingResult = await processVideo(file, {
        onProgress: (progress) => {
          options.onProgress?.(progress);
        },
      });
    }

    // 4. Supabase Storage 업로드
    options.onProgress?.(80); // 업로드 시작
    const fileUrl = await uploadToSupabase(
      processingResult.blob,
      adminUserId,
      options.bucket,
      options.folder,
      processingResult.format
    );

    options.onProgress?.(100); // 완료
    console.log(`[Uploader] 업로드 완료: ${fileUrl}`);

    return fileUrl;
  } catch (error) {
    console.error('[Uploader] 업로드 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    options.onError?.(new Error(errorMessage));
    throw error;
  }
}

/**
 * Supabase Storage에 파일 업로드
 */
async function uploadToSupabase(
  blob: Blob,
  adminUserId: string,
  bucket: string,
  folder: string | undefined,
  format: string
): Promise<string> {
  const timestamp = Date.now();
  const fileExt = format === 'webp' ? 'webp' : format === 'webm' ? 'webm' : 'gif';
  const folderPath = folder ? `${folder}/${adminUserId}` : adminUserId;
  const fileName = `${folderPath}/${timestamp}.${fileExt}`;

  console.log(`[Uploader] Supabase 업로드: ${bucket}/${fileName}`);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, blob, {
      cacheControl: '604800', // 7일
      upsert: false,
      contentType: blob.type,
    });

  if (uploadError) {
    console.error('[Uploader] Supabase 업로드 실패:', uploadError);
    throw new Error(`업로드 실패: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return publicUrl;
}

/**
 * 여러 파일 업로드 (병렬 처리)
 */
export async function uploadMultipleFiles(
  files: File[],
  adminUserId: string,
  options: UploadOptions
): Promise<string[]> {
  console.log(`[Uploader] 다중 파일 업로드 시작: ${files.length}개`);

  const uploadPromises = files.map((file, index) =>
    uploadFile(file, adminUserId, {
      ...options,
      onProgress: (progress) => {
        // 각 파일의 진행률을 전체 진행률로 변환
        const totalProgress = Math.floor(((index + progress / 100) / files.length) * 100);
        options.onProgress?.(totalProgress);
      },
    })
  );

  const urls = await Promise.all(uploadPromises);
  console.log(`[Uploader] 다중 파일 업로드 완료: ${urls.length}개`);

  return urls;
}

/**
 * 기존 API 호환 - 홈페이지 이미지 업로드
 */
export async function uploadHomepageImage(
  file: File,
  adminUserId: string,
  section?: string
): Promise<string> {
  return uploadFile(file, adminUserId, {
    bucket: 'homepage-images',
    folder: section,
  });
}

/**
 * 기존 API 호환 - 매거진 이미지 업로드
 */
export async function uploadMagazineImage(file: File, adminUserId: string): Promise<string> {
  return uploadFile(file, adminUserId, {
    bucket: 'homepage-images',
    folder: 'magazines',
  });
}
