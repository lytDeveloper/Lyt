import { createContext, useContext, useRef, useCallback, type ReactNode, type RefObject } from 'react';

interface ScrollToTopContextType {
  scrollContainerRef: RefObject<HTMLElement | null> | null;
  setScrollContainerRef: (ref: RefObject<HTMLElement | null>) => void;
  scrollToTop: () => void;
}

const ScrollToTopContext = createContext<ScrollToTopContextType | undefined>(undefined);

interface ScrollToTopProviderProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export function ScrollToTopProvider({ children, scrollContainerRef: externalRef }: ScrollToTopProviderProps) {
  const internalRef = useRef<RefObject<HTMLElement | null> | null>(externalRef || null);

  const setScrollContainerRef = useCallback((ref: RefObject<HTMLElement | null>) => {
    internalRef.current = ref;
  }, []);

  const scrollToTop = useCallback(() => {
    const containerRef = externalRef || internalRef.current;
    
    if (containerRef?.current) {
      // 커스텀 스크롤 컨테이너가 있는 경우
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      // window/document scroll 사용 (여러 방법 시도하여 WebView 호환성 확보)
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
      
      // WebView 호환성을 위한 추가 시도
      if (document.documentElement) {
        document.documentElement.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
      if (document.body) {
        document.body.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    }
  }, [externalRef]);

  return (
    <ScrollToTopContext.Provider
      value={{
        scrollContainerRef: externalRef || internalRef.current,
        setScrollContainerRef,
        scrollToTop,
      }}
    >
      {children}
    </ScrollToTopContext.Provider>
  );
}

export function useScrollToTop() {
  const context = useContext(ScrollToTopContext);
  if (context === undefined) {
    // Context가 없으면 기본 window scroll 사용
    return {
      scrollToTop: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement?.scrollTo({ top: 0, behavior: 'smooth' });
        document.body?.scrollTo({ top: 0, behavior: 'smooth' });
      },
    };
  }
  return context;
}
