// React Native WebView 타입 정의
interface Window {
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
}

