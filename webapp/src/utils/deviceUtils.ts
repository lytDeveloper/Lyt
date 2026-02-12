/**
 * deviceUtils.ts
 * iOS 감지 및 플랫폼별 Glass 스타일 유틸리티
 *
 * iOS WebView에서 backdrop-filter: blur()는 GPU 집약적이므로,
 * iOS에서는 blur 강도를 줄이고 gradient + border로 보완합니다.
 */

// iOS 디바이스 감지
export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
};

// 플랫폼별 blur 강도 반환
export const getBlurAmount = (): number => {
  return isIOS() ? 4 : 12;
};

// Glass 스타일 타입 정의
export interface GlassStyle {
  backdropFilter: string;
  WebkitBackdropFilter: string;
  background: string;
  border?: string;
  boxShadow?: string;
}

/**
 * iOS용 Glass Fallback 스타일
 * - blur 강도 축소 (4px)
 * - gradient로 유리 표면의 빛 굴절 흉내
 * - border + inner highlight로 깊이감 추가
 */
export const getIOSGlassStyle = (options?: {
  blur?: number;
  opacity?: number;
  includeBorder?: boolean;
  includeShadow?: boolean;
}): GlassStyle => {
  const {
    blur = 4,
    opacity = 0.22,
    includeBorder = true,
    includeShadow = true,
  } = options || {};

  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    background: `linear-gradient(
      180deg,
      rgba(255, 255, 255, ${opacity}),
      rgba(255, 255, 255, ${opacity * 0.55})
    )`,
    ...(includeBorder && {
      border: '1px solid rgba(255, 255, 255, 0.25)',
    }),
    ...(includeShadow && {
      boxShadow: `
        inset 0 1px 0 rgba(255, 255, 255, 0.25),
        0 8px 24px rgba(0, 0, 0, 0.15)
      `,
    }),
  };
};

/**
 * Android용 Glass 스타일 (기존 유지)
 */
export const getAndroidGlassStyle = (options?: {
  blur?: number;
  opacity?: number;
}): GlassStyle => {
  const { blur = 12, opacity = 0.7 } = options || {};

  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    background: `rgba(255, 255, 255, ${opacity})`,
  };
};

/**
 * 플랫폼에 따라 적절한 Glass 스타일 반환
 * @param options - Glass 스타일 옵션
 * @returns 플랫폼에 맞는 Glass 스타일 객체
 */
export const getGlassStyle = (options?: {
  iosBlur?: number;
  androidBlur?: number;
  iosOpacity?: number;
  androidOpacity?: number;
  includeBorder?: boolean;
  includeShadow?: boolean;
}): GlassStyle => {
  const {
    iosBlur = 4,
    androidBlur = 12,
    iosOpacity = 0.22,
    androidOpacity = 0.7,
    includeBorder = true,
    includeShadow = true,
  } = options || {};

  if (isIOS()) {
    return getIOSGlassStyle({
      blur: iosBlur,
      opacity: iosOpacity,
      includeBorder,
      includeShadow,
    });
  }

  return getAndroidGlassStyle({
    blur: androidBlur,
    opacity: androidOpacity,
  });
};

/**
 * CSS-in-JS에서 사용할 수 있는 Glass 스타일 스프레드 함수
 * MUI sx prop이나 styled-components에서 사용
 *
 * @example
 * // MUI sx prop에서 사용
 * <Box sx={{ ...getGlassSx() }} />
 *
 * // styled-components에서 사용
 * const GlassBox = styled(Box)(({ theme }) => ({
 *   ...getGlassSx(),
 * }));
 */
export const getGlassSx = (options?: Parameters<typeof getGlassStyle>[0]) => {
  const style = getGlassStyle(options);
  return {
    backdropFilter: style.backdropFilter,
    WebkitBackdropFilter: style.WebkitBackdropFilter,
    background: style.background,
    ...(style.border && { border: style.border }),
    ...(style.boxShadow && { boxShadow: style.boxShadow }),
  };
};

/**
 * body에 is-ios 클래스 추가 (CSS에서 조건부 스타일링용)
 * 앱 초기화 시 한 번 호출
 */
export const addIOSBodyClass = (): void => {
  if (typeof document === 'undefined') return;
  if (isIOS()) {
    document.body.classList.add('is-ios');
  }
};

/**
 * 다크 테마용 Glass 스타일
 */
export const getDarkGlassStyle = (options?: {
  blur?: number;
  opacity?: number;
}): GlassStyle => {
  const blur = isIOS() ? 4 : (options?.blur ?? 12);
  const opacity = options?.opacity ?? 0.8;

  if (isIOS()) {
    return {
      backdropFilter: `blur(${blur}px)`,
      WebkitBackdropFilter: `blur(${blur}px)`,
      background: `linear-gradient(
        180deg,
        rgba(0, 0, 0, ${opacity}),
        rgba(0, 0, 0, ${opacity * 0.8})
      )`,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: `
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 8px 24px rgba(0, 0, 0, 0.3)
      `,
    };
  }

  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    background: `rgba(0, 0, 0, ${opacity})`,
  };
};
