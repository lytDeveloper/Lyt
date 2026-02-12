/**
 * Native Share Utility
 * 
 * WebView 환경에서는 navigator.share가 지원되지 않으므로,
 * React Native 앱으로 메시지를 보내 네이티브 공유 시트를 호출합니다.
 */

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

/**
 * WebView 환경인지 감지
 * React Native WebView에서는 특정 user agent 패턴이나
 * window.ReactNativeWebView가 존재함
 */
export function isWebViewEnvironment(): boolean {
  // React Native WebView 감지
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    
    // React Native WebView는 window.ReactNativeWebView를 주입함
    if (win.ReactNativeWebView) {
      return true;
    }
    
    // User agent 기반 감지 (fallback)
    const ua = navigator.userAgent || '';
    // 웹뷰 특징적인 패턴 감지
    if (ua.includes('wv') || ua.includes('WebView')) {
      return true;
    }
  }
  
  return false;
}

/**
 * 네이티브 앱으로 공유 요청 메시지 전송
 */
function postShareMessage(options: ShareOptions): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    
    if (win.ReactNativeWebView?.postMessage) {
      win.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SHARE_REQUEST',
        title: options.title || '',
        message: options.text || '',
        url: options.url || '',
      }));
      return true;
    }
  } catch (e) {
    console.error('Failed to post share message:', e);
  }
  
  return false;
}

/**
 * 크로스 플랫폼 공유 함수
 * 
 * 1. WebView 환경: React Native로 메시지 전송 → 네이티브 공유 시트
 * 2. 일반 브라우저 + navigator.share 지원: Web Share API 사용
 * 3. Fallback: 클립보드에 URL 복사
 */
export async function nativeShare(options: ShareOptions): Promise<{ success: boolean; method: 'native' | 'webshare' | 'clipboard' }> {
  const { title, text, url } = options;
  
  // 1. WebView 환경에서는 네이티브 공유 요청
  if (isWebViewEnvironment()) {
    const sent = postShareMessage(options);
    if (sent) {
      return { success: true, method: 'native' };
    }
  }
  
  // 2. Web Share API 사용 (일반 모바일 브라우저)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { success: true, method: 'webshare' };
    } catch (error) {
      // 사용자가 취소한 경우는 성공으로 처리
      if ((error as Error).name === 'AbortError') {
        return { success: true, method: 'webshare' };
      }
      console.error('Web Share API failed:', error);
    }
  }
  
  // 3. Fallback: 클립보드에 복사
  try {
    await navigator.clipboard.writeText(url || window.location.href);
    return { success: true, method: 'clipboard' };
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return { success: false, method: 'clipboard' };
  }
}

