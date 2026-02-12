import { Global, css } from '@emotion/react';

/**
 * 전역적으로 프리텐다드(Pretendard) 폰트를 적용하는 컴포넌트입니다.
 * App.tsx 또는 main.tsx 등 최상위 컴포넌트에서 한 번 호출해주시면 됩니다.
 * 
 * 참고: index.html에 이미 프리텐다드 CDN이 적용되어 있다면 이 컴포넌트는
 * font-family 우선순위를 강제하는 역할을 합니다.
 */
const PretendardFont = () => {
  return (
    <Global
      styles={css`
        :root {
          --font-family-base: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
        }

        body, html, button, input, textarea, select {
          font-family: var(--font-family-base);
        }
        
        /* Toastify 등 포탈로 렌더링되는 요소들을 위한 보완 */
        .Toastify__toast {
          font-family: var(--font-family-base) !important;
        }
      `}
    />
  );
};

export default PretendardFont;

