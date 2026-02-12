// React 18 런타임은 DOM에 `fetchPriority`(camelCase)를 넘기면 경고를 띄운다.
// 표준 속성은 `fetchpriority`(소문자)인데, 타입 정의가 이를 모르는 경우가 있어 전역 React 네임스페이스를 보강한다.
declare namespace React {
  interface ImgHTMLAttributes<T> {
    fetchpriority?: 'high' | 'low' | 'auto';
  }
}

export {};


