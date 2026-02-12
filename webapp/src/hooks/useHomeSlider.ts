import { useState, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import type { SliderImage } from '../services/homepageService';

interface UseHomeSliderOptions {
  /** 슬라이더 아이템 목록 */
  items: SliderImage[];
  /** 컨테이너 너비 (px) */
  containerWidth: number;
}

interface UseHomeSliderReturn {
  /** 슬라이더 요소 참조 */
  sliderRef: RefObject<HTMLDivElement | null>;
  /** 현재 활성 슬라이드 인덱스 */
  activeSlideIndex: number;
  /** 비디오 로드 여부 결정 (성능 최적화용) */
  shouldLoadVideo: (index: number) => boolean;
}

/**
 * 홈페이지 이미지/비디오 슬라이더 로직을 캡슐화하는 훅
 *
 * 기능:
 * - 무한 루프 스크롤 (첫/마지막 슬라이드 clone)
 * - 스크롤 종료 시 인덱스 업데이트
 * - scrollend / scroll 이벤트 폴리필
 */
export function useHomeSlider({
  items,
  containerWidth,
}: UseHomeSliderOptions): UseHomeSliderReturn {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const isScrolling = useRef(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // items 변경 시 인덱스 초기화
  useEffect(() => {
    setActiveSlideIndex(0);
  }, [items]);

  // 초기 스크롤 위치 세팅 (첫 페인트 전에 맞춰서 clone-last 깜빡임 제거)
  useLayoutEffect(() => {
    if (!items || items.length === 0) return;
    const slider = sliderRef.current;
    if (!slider) return;

    const sliderElement: HTMLElement = slider;
    const getSlideWidth = () => sliderElement.clientWidth || containerWidth;

    try {
      const slideWidth = getSlideWidth();
      sliderElement.style.scrollBehavior = 'auto';
      (sliderElement as HTMLDivElement).scrollLeft = slideWidth;
      // 다음 프레임부터는 부드러운 스크롤 복구
      requestAnimationFrame(() => {
        sliderElement.style.scrollBehavior = 'smooth';
      });
    } catch (error) {
      console.error('슬라이더 초기화 오류:', error);
    }
  }, [items, containerWidth]);

  // 슬라이더 스크롤 이벤트 핸들링
  useEffect(() => {
    if (!items || items.length === 0) return;
    const slider = sliderRef.current;
    if (!slider) return;

    const sliderElement: HTMLElement = slider;
    const getSlideWidth = () => sliderElement.clientWidth || containerWidth;
    const totalSlides = items.length;

    // 스크롤 종료 핸들러
    const handleScrollEnd = () => {
      if (isScrolling.current) return;
      try {
        const slideWidth = getSlideWidth();
        const scrollLeft = (sliderElement as HTMLDivElement).scrollLeft;
        const currentSlide = Math.round(scrollLeft / slideWidth);
        const realIndex =
          ((currentSlide - 1 + totalSlides) % totalSlides + totalSlides) %
          totalSlides;
        setActiveSlideIndex(realIndex);

        // 마지막 clone 슬라이드 → 첫 번째 슬라이드로 점프
        if (currentSlide >= totalSlides + 1) {
          isScrolling.current = true;
          sliderElement.style.scrollBehavior = 'auto';
          (sliderElement as HTMLDivElement).scrollLeft = slideWidth;
          requestAnimationFrame(() => {
            sliderElement.style.scrollBehavior = 'smooth';
            isScrolling.current = false;
          });
        }
        // 첫 번째 clone 슬라이드 → 마지막 슬라이드로 점프
        else if (currentSlide <= 0) {
          isScrolling.current = true;
          sliderElement.style.scrollBehavior = 'auto';
          (sliderElement as HTMLDivElement).scrollLeft = totalSlides * slideWidth;
          requestAnimationFrame(() => {
            sliderElement.style.scrollBehavior = 'smooth';
            isScrolling.current = false;
          });
        }
      } catch (error) {
        console.error('슬라이더 스크롤 엔드 오류:', error);
      }
    };

    // scroll 이벤트를 scrollend로 폴백
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        handleScrollEnd();
      }, 150);
    };

    // scrollend 지원 여부 확인
    const supportsScrollEnd: boolean = 'onscrollend' in sliderElement;
    if (supportsScrollEnd) {
      sliderElement.addEventListener('scrollend', handleScrollEnd);
    } else {
      sliderElement.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      const currentSlider = sliderRef.current;
      if (!currentSlider) return;
      if (supportsScrollEnd) {
        currentSlider.removeEventListener('scrollend', handleScrollEnd);
      } else {
        currentSlider.removeEventListener('scroll', handleScroll);
      }
    };
  }, [items, containerWidth]);

  // 비디오 로드 여부 결정 (성능 최적화)
  const shouldLoadVideo = (index: number): boolean => {
    // 현재 슬라이드와 인접 슬라이드만 비디오 로드
    const diff = Math.abs(index - activeSlideIndex);
    return diff <= 1 || diff >= items.length - 1;
  };

  return {
    sliderRef,
    activeSlideIndex,
    shouldLoadVideo,
  };
}

export default useHomeSlider;
