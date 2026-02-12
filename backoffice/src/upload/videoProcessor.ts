/**
 * 비디오 처리 (WebM VP9 인코딩)
 * @ffmpeg/ffmpeg 라이브러리 사용
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ProcessingResult } from './types';
import { VIDEO_COMPRESSION_CONFIG } from './types';

// FFmpeg 싱글톤 인스턴스
let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;

/**
 * FFmpeg 인스턴스 가져오기 (lazy loading)
 */
async function getFFmpegInstance(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  // 이미 로딩 중이면 대기
  if (isLoading) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (ffmpegInstance) {
          clearInterval(checkInterval);
          resolve(ffmpegInstance);
        }
      }, 100);
    });
    return ffmpegInstance!;
  }

  isLoading = true;
  console.log('[VideoProcessor] FFmpeg 초기화 시작...');

  try {
    const ffmpeg = new FFmpeg();

    // 모든 이벤트 로깅
    ffmpeg.on('log', ({ type, message }) => {
      console.log(`[FFmpeg Log] ${type}:`, message);
    });

    ffmpeg.on('progress', ({ progress, time }) => {
      console.log(`[FFmpeg Progress] ${progress}%, time: ${time}`);
    });

    // Single-threaded 버전 사용 (메모리 사용량 적음)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    console.log('[VideoProcessor] FFmpeg 코어 다운로드 시작... (Single-threaded 버전)');
    console.log('[VideoProcessor] CDN:', baseURL);

    // Single-threaded 버전은 2개 파일만 필요
    console.log('[VideoProcessor] ffmpeg-core.js 다운로드 중...');
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    console.log('[VideoProcessor] ffmpeg-core.js 다운로드 완료');

    console.log('[VideoProcessor] ffmpeg-core.wasm 다운로드 중...');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    console.log('[VideoProcessor] ffmpeg-core.wasm 다운로드 완료');

    console.log('[VideoProcessor] FFmpeg.load() 호출 중...');
    console.log('[VideoProcessor] ⏱️ 시작 시각:', new Date().toLocaleTimeString());

    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    console.log('[VideoProcessor] ⏱️ 완료 시각:', new Date().toLocaleTimeString());

    ffmpegInstance = ffmpeg;
    isLoading = false;
    console.log('[VideoProcessor] FFmpeg 초기화 완료');

    return ffmpeg;
  } catch (error) {
    isLoading = false;
    console.error('[VideoProcessor] FFmpeg 초기화 실패:', error);

    // 더 자세한 에러 메시지
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    if (errorMsg.includes('타임아웃')) {
      throw new Error('FFmpeg 다운로드 시간이 너무 오래 걸립니다. 네트워크 상태를 확인하거나 나중에 다시 시도하세요.');
    } else if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
      throw new Error('FFmpeg 다운로드 실패. 인터넷 연결을 확인하세요.');
    } else {
      throw new Error(`비디오 처리 엔진 로드 실패: ${errorMsg}`);
    }
  }
}

/**
 * 비디오를 WebM VP9로 인코딩
 */
export async function processVideo(
  file: File,
  options?: {
    crf?: number;
    maxHeight?: number;
    fps?: number;
    audioBitrate?: string;
    onProgress?: (progress: number) => void;
  }
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const originalSize = file.size;

  console.log(`[VideoProcessor] 비디오 처리 시작: ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);

  try {
    const ffmpeg = await getFFmpegInstance();

    // 입력 파일 준비
    const inputFileName = 'input' + getFileExtension(file.name);
    const outputFileName = 'output.webm';

    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // FFmpeg 명령어 구성
    const crf = options?.crf ?? VIDEO_COMPRESSION_CONFIG.crf;
    const maxHeight = options?.maxHeight ?? VIDEO_COMPRESSION_CONFIG.maxHeight;
    const fps = options?.fps ?? VIDEO_COMPRESSION_CONFIG.fps;
    const audioBitrate = options?.audioBitrate ?? VIDEO_COMPRESSION_CONFIG.audioBitrate;

    // 오디오 처리 방식 결정 
    const audioArgs = VIDEO_COMPRESSION_CONFIG.audioCodec === 'libopus'
      ? ['-c:a', 'libopus']
      : ['-c:a', VIDEO_COMPRESSION_CONFIG.audioCodec, '-b:a', audioBitrate];

    const args = [
      '-i', inputFileName,
      '-c:v', VIDEO_COMPRESSION_CONFIG.videoCodec, // VP8 비디오 코덱 (메모리 효율적)
      '-crf', crf.toString(), // 품질 (낮을수록 고품질)
      '-b:v', '1024k', 
      '-vf', `scale=-2:${maxHeight}`, // 단순 스케일 (480p 고정)
      '-r', fps.toString(), // FPS
      ...audioArgs, // 오디오 설정
      '-deadline', 'realtime', // 인코딩 속도 우선
      '-cpu-used', '2', // 최대 속도 (0-5)
      '-auto-alt-ref', '0',
      '-lag-in-frames', '0',
      '-an',
      outputFileName,
    ];

    console.log('[VideoProcessor] FFmpeg 명령어:', args.join(' '));

    // 진행률 추적 (exec 전에 등록)
    let lastProgress = 0;
    ffmpeg.on('progress', ({ progress, time }) => {
      // 0-80% 범위로 매핑 (업로드를 위해 20% 남겨둠)
      const mappedProgress = Math.floor(progress * 80);

      // 5% 간격으로만 로그 출력 (과도한 로그 방지)
      if (mappedProgress - lastProgress >= 5 || mappedProgress === 80) {
        console.log(`[VideoProcessor] 진행률: ${mappedProgress}% (time: ${time}µs)`);
        lastProgress = mappedProgress;
      }

      options?.onProgress?.(mappedProgress);
    });

    // 인코딩 실행
    console.log('[VideoProcessor] 인코딩 시작...');
    await ffmpeg.exec(args);
    console.log('[VideoProcessor] 인코딩 완료');

    // 출력 파일 읽기
    const data = await ffmpeg.readFile(outputFileName);
    // FileData는 Uint8Array 또는 string일 수 있음, 새 Uint8Array로 복사
    const uint8Array = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data);
    const blob = new Blob([uint8Array], { type: 'video/webm' });
    const processedSize = blob.size;
    const compressionRatio = ((originalSize - processedSize) / originalSize) * 100;

    // 임시 파일 정리
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[VideoProcessor] 처리 완료: ${(processedSize / 1024 / 1024).toFixed(2)}MB (압축률 ${compressionRatio.toFixed(1)}%, ${elapsedTime}초 소요)`
    );

    return {
      blob,
      originalSize,
      processedSize,
      compressionRatio,
      format: 'webm',
    };
  } catch (error) {
    console.error('[VideoProcessor] 비디오 처리 실패:', error);
    throw new Error(`비디오 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 파일 확장자 추출 (점 포함)
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot !== -1 ? fileName.substring(lastDot) : '';
}

/**
 * FFmpeg 인스턴스 정리 (메모리 해제)
 */
export function cleanupFFmpeg(): void {
  if (ffmpegInstance) {
    console.log('[VideoProcessor] FFmpeg 인스턴스 정리');
    ffmpegInstance = null;
  }
}
