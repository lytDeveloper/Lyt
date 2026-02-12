import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPPORTED_BUCKETS = ['homepage-images', 'project-files'] as const;
type SupportedBucket = typeof SUPPORTED_BUCKETS[number];

/**
 * Public URL에서 버킷 이름 추출
 */
function extractBucketName(url: string): SupportedBucket | null {
  for (const bucket of SUPPORTED_BUCKETS) {
    if (url.includes(`/storage/v1/object/public/${bucket}/`) ||
      url.includes(`/storage/v1/object/sign/${bucket}`)) {
      return bucket;
    }
  }
  return null;
}

/**
 * Public URL에서 storage path 및 버킷 추출
 */
function extractStorageInfo(url: string | null | undefined): { path: string; bucket: SupportedBucket } | null {
  if (!url) return null;

  const bucket = extractBucketName(url);
  if (!bucket) {
    // 외부 URL이거나 지원되지 않는 버킷
    return null;
  }

  // 이미 서명 URL인 경우
  if (url.includes(`storage/v1/object/sign/${bucket}`)) return null;

  // public URL인 경우 path 추출
  const publicPrefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
  if (url.startsWith(publicPrefix)) {
    return { path: url.slice(publicPrefix.length), bucket };
  }

  return null;
}

/**
 * Public URL에서 storage path 추출 (레거시 호환용)
 */
function extractStoragePath(url: string | null | undefined): string | null {
  const info = extractStorageInfo(url);
  return info?.path ?? null;
}

/**
 * URL에서 서명 URL 생성
 */
async function getSignedImageUrl(url: string | null | undefined, ttlSeconds = 3600): Promise<string | null> {
  if (!url) return null;

  const storageInfo = extractStorageInfo(url);

  console.log('[useSignedImage] URL 처리:', {
    original: url,
    storageInfo
  });

  if (!storageInfo) {
    console.log('[useSignedImage] storageInfo가 null이므로 원본 URL 반환');
    return url;
  }

  const { path, bucket } = storageInfo;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, ttlSeconds);

    if (error || !data?.signedUrl) {
      console.error('[useSignedImage] 서명 URL 생성 실패:', {
        path,
        bucket,
        error,
        data
      });
      return url;
    }

    console.log('[useSignedImage] 서명 URL 생성 성공:', {
      original: url,
      bucket,
      signed: data.signedUrl
    });

    return data.signedUrl;
  } catch (error) {
    console.error('[useSignedImage] 서명 URL 생성 예외:', error);
    return url;
  }
}

/**
 * Private Supabase Storage 버킷의 이미지 URL을 서명 URL로 변환하는 훅
 * 
 * @example
 * const signedUrl = useSignedImage(magazine.cover_image_url);
 * return <img src={signedUrl || ''} />;
 */
export function useSignedImage(url: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (url) {
      getSignedImageUrl(url).then((signed) => {
        if (isMounted) setSignedUrl(signed);
      });
    } else {
      setSignedUrl(null);
    }

    return () => {
      isMounted = false;
    };
  }, [url]);

  return signedUrl;
}

/**
 * 여러 이미지 URL을 서명 URL로 일괄 변환하는 훅
 */
export function useSignedImages(urls: (string | null | undefined)[]): (string | null)[] {
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    let isMounted = true;

    Promise.all(urls.map((url) => (url ? getSignedImageUrl(url) : Promise.resolve(null))))
      .then((results) => {
        if (isMounted) setSignedUrls(results);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(urls)]);

  return signedUrls;
}

/**
 * 객체의 이미지 필드들에 대해 서명 URL을 생성하는 훅
 * 편집 모달 등에서 사용
 * 
 * @example
 * const { signedUrls, generateSignedUrls } = useSignedUrlMap();
 * 
 * // 모달 열 때 호출
 * await generateSignedUrls({
 *   cover: magazine.cover_image_url,
 *   gallery_0: magazine.images?.[0],
 * });
 * 
 * // 사용
 * <img src={signedUrls['cover'] || originalUrl} />
 */
export function useSignedUrlMap() {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const generateSignedUrls = useCallback(async (urlMap: Record<string, string | null | undefined>) => {
    const entries = Object.entries(urlMap);
    const results: Record<string, string> = {};

    await Promise.all(
      entries.map(async ([key, url]) => {
        if (url) {
          const signed = await getSignedImageUrl(url);
          if (signed) results[key] = signed;
        }
      })
    );

    setSignedUrls(results);
    return results;
  }, []);

  const clearSignedUrls = useCallback(() => {
    setSignedUrls({});
  }, []);

  return { signedUrls, generateSignedUrls, clearSignedUrls };
}

export { getSignedImageUrl, extractStoragePath };

