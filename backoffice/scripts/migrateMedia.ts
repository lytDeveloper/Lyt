/**
 * 미디어 파일 마이그레이션 스크립트
 *
 * 기존 이미지/비디오를 WebP/WebM 형식으로 변환하고 DB 업데이트
 *
 * 사용법:
 * 1. 환경 변수 설정: SUPABASE_SERVICE_KEY=your-service-role-key
 * 2. 드라이런 테스트: npx tsx backoffice/scripts/migrateMedia.ts --dry-run
 * 3. 실제 실행: npx tsx backoffice/scripts/migrateMedia.ts
 */

import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';
import * as fs from 'fs';
import * as path from 'path';

// 환경 변수
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경 변수가 설정되지 않았습니다.');
  console.error('사용법: SUPABASE_SERVICE_KEY=your-key npx tsx backoffice/scripts/migrateMedia.ts');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

// Supabase 클라이언트 (서비스 키 사용)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface MigrationLog {
  timestamp: string;
  totalFiles: number;
  successCount: number;
  failCount: number;
  files: {
    originalUrl: string;
    newUrl?: string;
    error?: string;
    table: string;
    field: string;
    recordId: string;
  }[];
}

const migrationLog: MigrationLog = {
  timestamp: new Date().toISOString(),
  totalFiles: 0,
  successCount: 0,
  failCount: 0,
  files: [],
};

/**
 * URL에서 파일 다운로드
 */
async function downloadFile(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`다운로드 실패: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * 이미지를 WebP로 변환
 */
async function convertImageToWebP(blob: Blob): Promise<Blob> {
  const file = new File([blob], 'image.jpg', { type: blob.type });

  const compressedFile = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 2000,
    initialQuality: 0.75,
    fileType: 'image/webp',
    useWebWorker: false, // Node.js 환경에서는 Web Worker 사용 불가
    preserveExif: false,
  });

  return compressedFile;
}

/**
 * Supabase Storage에 파일 업로드
 */
async function uploadToSupabase(
  blob: Blob,
  bucket: string,
  filePath: string
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, {
      cacheControl: '604800',
      upsert: false,
      contentType: blob.type,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}

/**
 * 이미지 URL 마이그레이션
 */
async function migrateImageUrl(
  originalUrl: string,
  bucket: string,
  recordId: string
): Promise<string | null> {
  try {
    console.log(`  📥 다운로드: ${originalUrl}`);
    const blob = await downloadFile(originalUrl);

    console.log(`  🔄 WebP 변환 중... (${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
    const webpBlob = await convertImageToWebP(blob);

    const filePath = `migrated/${recordId}/${Date.now()}.webp`;
    console.log(`  📤 업로드: ${bucket}/${filePath}`);
    const newUrl = await uploadToSupabase(webpBlob, bucket, filePath);

    const compressionRatio = ((blob.size - webpBlob.size) / blob.size) * 100;
    console.log(
      `  ✅ 완료: ${(webpBlob.size / 1024 / 1024).toFixed(2)}MB (압축률 ${compressionRatio.toFixed(1)}%)`
    );

    return newUrl;
  } catch (error) {
    console.error(`  ❌ 실패:`, error);
    return null;
  }
}

/**
 * homepage_slider_images 테이블 마이그레이션
 */
async function migrateSliderImages() {
  console.log('\n📊 [1/3] homepage_slider_images 마이그레이션 시작...\n');

  const { data: sliders, error } = await supabase
    .from('homepage_slider_images')
    .select('id, image_url, video_url');

  if (error) {
    console.error('❌ 데이터 조회 실패:', error);
    return;
  }

  for (const slider of sliders || []) {
    // 이미지 URL 마이그레이션
    if (slider.image_url && slider.image_url.includes('homepage-images')) {
      console.log(`\n🖼️  슬라이더 이미지: ${slider.id}`);
      migrationLog.totalFiles++;

      const newUrl = await migrateImageUrl(slider.image_url, 'homepage-images', slider.id);

      if (newUrl && !isDryRun) {
        const { error: updateError } = await supabase
          .from('homepage_slider_images')
          .update({ image_url: newUrl })
          .eq('id', slider.id);

        if (updateError) {
          console.error(`  ❌ DB 업데이트 실패:`, updateError);
          migrationLog.failCount++;
          migrationLog.files.push({
            originalUrl: slider.image_url,
            error: updateError.message,
            table: 'homepage_slider_images',
            field: 'image_url',
            recordId: slider.id,
          });
        } else {
          migrationLog.successCount++;
          migrationLog.files.push({
            originalUrl: slider.image_url,
            newUrl,
            table: 'homepage_slider_images',
            field: 'image_url',
            recordId: slider.id,
          });
        }
      } else if (newUrl) {
        console.log(`  🔍 [DRY RUN] DB 업데이트 생략`);
        migrationLog.successCount++;
      } else {
        migrationLog.failCount++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 비디오 URL은 이미 URL 형식이므로 스킵
    // (실제 비디오 파일 변환은 수동으로 처리하거나 별도 스크립트 필요)
  }
}

/**
 * magazines 테이블 마이그레이션
 */
async function migrateMagazines() {
  console.log('\n📊 [2/3] magazines 마이그레이션 시작...\n');

  const { data: magazines, error } = await supabase
    .from('magazines')
    .select('id, cover_image_url, images, content_blocks');

  if (error) {
    console.error('❌ 데이터 조회 실패:', error);
    return;
  }

  for (const magazine of magazines || []) {
    // 커버 이미지
    if (magazine.cover_image_url && magazine.cover_image_url.includes('homepage-images')) {
      console.log(`\n🖼️  매거진 커버: ${magazine.id}`);
      migrationLog.totalFiles++;

      const newUrl = await migrateImageUrl(magazine.cover_image_url, 'homepage-images', magazine.id);

      if (newUrl && !isDryRun) {
        const { error: updateError } = await supabase
          .from('magazines')
          .update({ cover_image_url: newUrl })
          .eq('id', magazine.id);

        if (updateError) {
          console.error(`  ❌ DB 업데이트 실패:`, updateError);
          migrationLog.failCount++;
        } else {
          migrationLog.successCount++;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 갤러리 이미지
    if (magazine.images && Array.isArray(magazine.images)) {
      const newImages: string[] = [];

      for (let i = 0; i < magazine.images.length; i++) {
        const imageUrl = magazine.images[i];
        if (imageUrl && imageUrl.includes('homepage-images')) {
          console.log(`\n🖼️  매거진 갤러리 ${magazine.id} [${i + 1}/${magazine.images.length}]`);
          migrationLog.totalFiles++;

          const newUrl = await migrateImageUrl(imageUrl, 'homepage-images', `${magazine.id}_gallery_${i}`);

          if (newUrl) {
            newImages.push(newUrl);
            migrationLog.successCount++;
          } else {
            newImages.push(imageUrl); // 실패 시 원본 유지
            migrationLog.failCount++;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          newImages.push(imageUrl);
        }
      }

      if (newImages.length > 0 && !isDryRun) {
        await supabase
          .from('magazines')
          .update({ images: newImages })
          .eq('id', magazine.id);
      }
    }
  }
}

/**
 * server_notifications 테이블 마이그레이션
 */
async function migrateNotifications() {
  console.log('\n📊 [3/3] server_notifications 마이그레이션 시작...\n');

  const { data: notifications, error } = await supabase
    .from('server_notifications')
    .select('id, image_urls');

  if (error) {
    console.error('❌ 데이터 조회 실패:', error);
    return;
  }

  for (const notification of notifications || []) {
    if (notification.image_urls && Array.isArray(notification.image_urls)) {
      const newImageUrls: string[] = [];

      for (let i = 0; i < notification.image_urls.length; i++) {
        const imageEntry = notification.image_urls[i];
        // image_urls는 JSON 객체 배열일 수 있음
        const imageUrl = typeof imageEntry === 'string' ? imageEntry : imageEntry?.url;

        if (imageUrl && imageUrl.includes('project-files')) {
          console.log(`\n🖼️  알림 이미지 ${notification.id} [${i + 1}/${notification.image_urls.length}]`);
          migrationLog.totalFiles++;

          const newUrl = await migrateImageUrl(imageUrl, 'project-files', `${notification.id}_${i}`);

          if (newUrl) {
            if (typeof imageEntry === 'string') {
              newImageUrls.push(newUrl);
            } else {
              newImageUrls.push({ ...imageEntry, url: newUrl });
            }
            migrationLog.successCount++;
          } else {
            newImageUrls.push(imageEntry);
            migrationLog.failCount++;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          newImageUrls.push(imageEntry);
        }
      }

      if (newImageUrls.length > 0 && !isDryRun) {
        await supabase
          .from('server_notifications')
          .update({ image_urls: newImageUrls })
          .eq('id', notification.id);
      }
    }
  }
}

/**
 * 마이그레이션 로그 저장
 */
function saveMigrationLog() {
  const logFileName = `migration-log-${Date.now()}.json`;
  const logPath = path.join(__dirname, logFileName);

  fs.writeFileSync(logPath, JSON.stringify(migrationLog, null, 2));
  console.log(`\n📄 마이그레이션 로그 저장: ${logPath}`);
}

/**
 * 메인 실행
 */
async function main() {
  console.log('\n🚀 미디어 파일 마이그레이션 시작\n');
  console.log(`모드: ${isDryRun ? '🔍 DRY RUN (실제 업데이트 없음)' : '✅ 실제 실행'}\n`);

  if (!isDryRun) {
    console.log('⚠️  경고: 실제 데이터베이스를 수정합니다!');
    console.log('⚠️  백업을 먼저 수행했는지 확인하세요.');
    console.log('⚠️  5초 후 시작합니다...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  try {
    await migrateSliderImages();
    await migrateMagazines();
    await migrateNotifications();

    console.log('\n\n✅ 마이그레이션 완료!\n');
    console.log(`📊 통계:`);
    console.log(`  총 파일: ${migrationLog.totalFiles}개`);
    console.log(`  성공: ${migrationLog.successCount}개`);
    console.log(`  실패: ${migrationLog.failCount}개`);
    console.log(
      `  성공률: ${((migrationLog.successCount / migrationLog.totalFiles) * 100).toFixed(1)}%`
    );

    saveMigrationLog();
  } catch (error) {
    console.error('\n❌ 마이그레이션 중 오류 발생:', error);
    saveMigrationLog();
    process.exit(1);
  }
}

main();
