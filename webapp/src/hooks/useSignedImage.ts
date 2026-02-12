import { useState, useEffect } from 'react';
import { getSignedImageUrl } from '../utils/signedUrl';

/**
 * Private Supabase Storage 버킷의 이미지 URL을 서명 URL로 변환하는 훅
 * CSS background-image 등에서 사용할 때 유용
 * 
 * @example
 * const signedUrl = useSignedImage(magazine.cover_image_url);
 * return <Box sx={{ backgroundImage: signedUrl ? `url(${signedUrl})` : 'none' }} />;
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
 * 
 * @example
 * const signedUrls = useSignedImages(magazine.images);
 * return signedUrls.map((url, i) => <img key={i} src={url || ''} />);
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
 * 객체 배열의 특정 이미지 필드들을 서명 URL로 변환하는 훅
 * 
 * @example
 * const signedMagazines = useSignedObjectImages(
 *   magazines,
 *   ['cover_image_url', 'thumbnail_url']
 * );
 */
export function useSignedObjectImages<T extends Record<string, unknown>>(
  items: T[],
  imageFields: (keyof T)[]
): T[] {
  const [signedItems, setSignedItems] = useState<T[]>(items);

  useEffect(() => {
    let isMounted = true;

    const processItems = async () => {
      const results = await Promise.all(
        items.map(async (item) => {
          const signedFields: Partial<T> = {};
          
          await Promise.all(
            imageFields.map(async (field) => {
              const url = item[field] as string | null | undefined;
              if (url) {
                const signed = await getSignedImageUrl(url);
                signedFields[field] = signed as T[keyof T];
              }
            })
          );

          return { ...item, ...signedFields };
        })
      );

      if (isMounted) {
        setSignedItems(results);
      }
    };

    processItems();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), JSON.stringify(imageFields)]);

  return signedItems;
}

