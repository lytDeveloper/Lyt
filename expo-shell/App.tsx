import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, StatusBar, Image, Platform, BackHandler, ToastAndroid, AppState, AppStateStatus, Share, Linking } from 'react-native';
import { isFeatureEnabled } from './lib/featureFlags';
import { telemetry } from './lib/telemetry';
import { initBootType, updateOnAppState, getBootType, type NativeBootType } from './lib/bootTypeManager';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { supabase } from './lib/supabase';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://c246de5f75621f67b310495108d1c834@o4510695326351360.ingest.us.sentry.io/4510695419936769',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});


// - webapp 터미널에서 `npm run dev` 실행 시 나오는 'Network' 주소
// - 재택 PC 기준: 'http://192.168.123.176:5173'
// -----------------------------------------------------------------
const WEBAPP_DEV_URL = 'http://192.168.123.165:5173/';
const WEBAPP_DEV_COMPANY_URL = 'http://192.168.0.228:5173/';
// -----------------------------------------------------------------
// 🚨 (참고) Android에서는 http 통신을 위해 별도 설정이 필요할 수 있습니다.
// -----------------------------------------------------------------
// - 만약 Android에서 빈 화면이 뜬다면,
// - expo-shell/app.json 파일의 "android" 객체 안에
// - "usesCleartextTraffic": true
// - 위 한 줄을 추가해야 http:// (https 아님) 통신이 허용됩니다.
// -----------------------------------------------------------------

// 뒤로가기 Double Press 종료 설정
const BACK_PRESS_TIMEOUT = 2000; // 2초 내 두 번 누르면 종료
const CAN_GO_BACK_THROTTLE_MS = 100; // canGoBack 상태 업데이트 throttle

const PAYMENT_APP_SCHEMES = [
  'ispmobile://',
  'kftc-bankpay://',
  'kb-acp://',
  'liivbank://',
  'mpocket.online.ansimclick://',
  'lotteappcard://',
  'shinhan-sr-ansimclick://',
  'hdcardappcardansimclick://',
  'nhappcardansimclick://',
  'cloudpay://',
  'hanawalletmembers://',
  'supertoss://',
  'kakaotalk://',
  'payco://',
];

const handleIntentUrl = async (intentUrl: string) => {
  try {
    const schemeMatch = intentUrl.match(/scheme=([^;]+)/);
    const packageMatch = intentUrl.match(/package=([^;]+)/);

    if (schemeMatch) {
      const scheme = schemeMatch[1];
      const path = intentUrl.replace('intent://', '').split('#Intent')[0];
      const schemeUrl = `${scheme}://${path}`;

      const supported = await Linking.canOpenURL(schemeUrl);
      if (supported) {
        await Linking.openURL(schemeUrl);
        return;
      }
    }

    if (packageMatch && Platform.OS === 'android') {
      const packageName = packageMatch[1];
      await Linking.openURL(`market://details?id=${packageName}`);
    }
  } catch (error) {
    console.error('[handleIntentUrl] Error:', error);
  }
};

interface WebViewMessage {
  type: 'SESSION_UPDATE' | 'SIGNED_OUT' | 'HISTORY_STATE_REPORT' | 'SET_STATUS_BAR' | 'WEB_ROUTE_STATE' | 'SHARE_REQUEST';
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: any;
  };
  // HISTORY_STATE_REPORT fields (레거시 지원)
  historyLength?: number;
  currentPath?: string;
  canGoBack?: boolean;
  // WEB_ROUTE_STATE fields (신규)
  isRoot?: boolean;
  // SET_STATUS_BAR fields
  backgroundColor?: string;
  barStyle?: 'light-content' | 'dark-content';
  // SHARE_REQUEST fields
  title?: string;
  message?: string;
  url?: string;
}

type NativeToWebMessage =
  | {
    type: 'PUSH_TOKEN';
    token: string;
    provider: 'fcm' | 'apns' | 'expo' | string;
    device_type: 'ios' | 'android' | string;
  }
  | {
    type: 'PUSH_RECEIVED';
    title?: string | null;
    body?: string | null;
    data?: Record<string, any>;
  }
  | {
    type: 'PUSH_OPEN';
    data?: Record<string, any>;
  }
  | {
    type: 'NAV_STATE_SYNC';
    canGoBack: boolean;
    canGoForward: boolean;
  }
  | {
    type: 'BOOT_TYPE_HINT';
    nativeBootType: NativeBootType;
    timestamp: number;
  }
  | {
    type: 'REQUEST_GO_BACK';
  };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Foreground에서는 시스템 푸시 억제
    // 인앱 알림 시스템(InAppNotificationBanner, Header count)이 대신 처리
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

function getEasProjectId(): string | undefined {
  // SDK 49+ recommended way
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyConst: any = Constants as any;
  return anyConst?.easConfig?.projectId || anyConst?.expoConfig?.extra?.eas?.projectId;
}

async function registerForPushNotificationsAsync(): Promise<{
  deviceTokens: Array<{ provider: string; token: string }>;
  deviceType: 'ios' | 'android' | string;
}> {
  const deviceType = Platform.OS;
  const deviceTokens: Array<{ provider: string; token: string }> = [];

  if (!Device.isDevice) {
    console.warn('[push] Must use physical device for push notifications');
    return { deviceTokens, deviceType };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[push] Permission not granted');
    return { deviceTokens, deviceType };
  }

  // 1) Device token (Android: FCM, iOS: APNs)
  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    if (devicePushToken?.data) {
      deviceTokens.push({ provider: devicePushToken.type || 'device', token: devicePushToken.data });
    }
  } catch (e) {
    console.warn('[push] getDevicePushTokenAsync failed:', e);
  }

  // 2) Expo Push Token (optional fallback / convenient for quick testing)
  try {
    const projectId = getEasProjectId();
    const expoPushToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (expoPushToken?.data) {
      deviceTokens.push({ provider: 'expo', token: expoPushToken.data });
    }
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync failed:', e);
  }

  return { deviceTokens, deviceType };
}

/**
 * 특정 채팅방(threadId)의 기존 알림들을 모두 dismiss
 * Background에서 쌓인 알림을 정리하여 "최신 것만 표시" 효과를 구현
 */
async function dismissNotificationsByThreadId(threadId: string): Promise<void> {
  try {
    const presentedNotifications = await Notifications.getPresentedNotificationsAsync();

    for (const notification of presentedNotifications) {
      const notifData = notification.request.content.data as Record<string, any>;
      // 같은 채팅방의 메시지 알림이면 dismiss
      if (notifData?.type === 'message' && notifData?.related_id === threadId) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  } catch (e) {
    console.warn('[push] Failed to dismiss notifications:', e);
  }
}

function WebViewContainer() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pendingMessagesRef = useRef<NativeToWebMessage[]>([]);

  // ========== 뒤로가기 상태 관리 ==========
  const [canGoBack, setCanGoBack] = useState(false);
  const [webIsRoot, setWebIsRoot] = useState(true); // Web에서 보고한 루트 경로 여부
  const [currentPath, setCurrentPath] = useState('/'); // 현재 경로 (Home 중심 네비게이션용)
  const lastBackPressedRef = useRef<number>(0);
  const canGoBackThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCanGoBackRef = useRef<boolean>(false);
  const WEBAPP_URL = Constants.expoConfig?.extra?.webviewUrl || 'https://bridge-app-git-staging-culgamyuns-projects.vercel.app?_vercel_share=KIqK99rjkimOEdLxPzVE9k7A1sQGDP9w';

  const handleShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const { url } = request;
    console.log('[WebView] Navigation request:', url);

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return true;
    }

    if (url.startsWith('intent://')) {
      handleIntentUrl(url);
      return false;
    }

    if (PAYMENT_APP_SCHEMES.some((scheme) => url.startsWith(scheme))) {
      Linking.openURL(url).catch((err) => {
        console.error('[WebView] Failed to open payment app:', err);
      });
      return false;
    }

    Linking.openURL(url).catch((err) => {
      console.error('[WebView] Failed to open external link:', err);
    });
    return false;
  }, []);

  // ========== Boot Type 관리 ==========
  const [nativeBootType, setNativeBootType] = useState<NativeBootType>('cold');
  const bootTypeInitializedRef = useRef(false);

  const sendToWebView = useCallback((message: NativeToWebMessage) => {
    const json = JSON.stringify(message);
    // injectJavaScript string escaping
    const escaped = JSON.stringify(json);

    if (!webViewRef.current) {
      pendingMessagesRef.current.push(message);
      return;
    }

    webViewRef.current.injectJavaScript(`
      (function () {
        try {
          var raw = ${escaped};
          // injectJavaScript로 실행되는 코드는 window에만 이벤트 발송 (document 중복 제거)
          window.dispatchEvent(new MessageEvent('message', { data: raw }));
        } catch (e) {
          // swallow
        }
      })();
      true;
    `);
  }, []);

  // ========== Boot Type 초기화 ==========
  useEffect(() => {
    if (!isFeatureEnabled('BOOT_TYPE_DETECTION')) return;
    if (bootTypeInitializedRef.current) return;

    bootTypeInitializedRef.current = true;
    initBootType().then((type) => {
      setNativeBootType(type);
      telemetry('native_boot_type', { type, bootType: type });
    });
  }, []);

  useEffect(() => {
    // React Native에서 세션 변경 감지
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('React Native Auth event:', event, session);

        // 세션이 변경되면 WebView에 알림 (선택사항)
        if (webViewRef.current && session) {
          webViewRef.current.injectJavaScript(`
            console.log('Session synced from React Native');
          `);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1) Register for push + send tokens to web
    registerForPushNotificationsAsync()
      .then(({ deviceTokens, deviceType }) => {
        if (!mounted) return;
        deviceTokens.forEach(({ provider, token }) => {
          const normalizedProvider =
            provider === 'fcm' || provider === 'apns' || provider === 'expo' ? provider : provider;
          sendToWebView({
            type: 'PUSH_TOKEN',
            token,
            provider: normalizedProvider,
            device_type: deviceType,
          });
        });
      })
      .catch((e) => console.warn('[push] registerForPushNotificationsAsync error:', e));

    // 2) Foreground receive
    const receivedSub = Notifications.addNotificationReceivedListener(async (notification) => {
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      const data = (notification.request.content.data || {}) as Record<string, any>;

      // 같은 채팅방의 기존 알림 dismiss (Background에서 쌓인 알림 정리 - 최신 것만 표시)
      if (data.type === 'message' && data.related_id) {
        await dismissNotificationsByThreadId(data.related_id);
      }

      sendToWebView({ type: 'PUSH_RECEIVED', title, body, data });
    });

    // 3) Tap/open
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data || {}) as Record<string, any>;
      sendToWebView({ type: 'PUSH_OPEN', data });
    });

    return () => {
      mounted = false;
      receivedSub.remove();
      responseSub.remove();
    };
  }, [sendToWebView]);

  // ========== BackHandler (Android) & 제스처 제어 ==========
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Feature flag check - disabled시 기본 WebView 동작 사용
    if (!isFeatureEnabled('SAFE_WEBVIEW_NAV')) {
      telemetry('safe_webview_nav_disabled', { platform: 'android' });
      return;
    }

    telemetry('safe_webview_nav_enabled', { platform: 'android' });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // 1. 차단 경로 체크 (로그인/온보딩 등) - 뒤로가기 완전 차단
      const BLOCK_BACK_PATHS = ['/login', '/auth/callback', '/onboarding'];
      if (BLOCK_BACK_PATHS.some(p => currentPath.startsWith(p))) {
        telemetry('back_handler_blocked', { path: currentPath });
        return true; // 이벤트 소비 (뒤로가기 차단)
      }

      // 2. Home 경로 - 앱 종료 로직
      if (currentPath === '/home' || currentPath === '/home/') {
        const now = Date.now();
        if (now - lastBackPressedRef.current < BACK_PRESS_TIMEOUT) {
          telemetry('double_press_exit', { path: currentPath });
          return false; // 시스템에 전달 (앱 종료)
        }
        lastBackPressedRef.current = now;
        telemetry('back_handler_triggered', { path: currentPath, action: 'toast_home' });
        ToastAndroid.show('뒤로 가기를 한 번 더 누르면 종료됩니다.', ToastAndroid.SHORT);
        return true;
      }

      // 3. 탭 루트 경로 (Home 제외) - Home으로 이동
      const NON_HOME_TABS = ['/explore', '/lounge', '/messages', '/manage', '/profile'];
      if (NON_HOME_TABS.includes(currentPath) || NON_HOME_TABS.some(tab => currentPath === tab + '/')) {
        telemetry('back_handler_triggered', { path: currentPath, action: 'navigate_home' });
        sendToWebView({ type: 'REQUEST_GO_BACK' });
        return true;
      }

      // 4. 서브 페이지 - Web에 REQUEST_GO_BACK 메시지 전송 (React Router가 처리)
      // SPA에서 canGoBack은 신뢰할 수 없으므로, Web에서 직접 판단하도록 위임
      telemetry('back_handler_triggered', { path: currentPath, canGoBack, webIsRoot, action: 'request_go_back' });
      sendToWebView({ type: 'REQUEST_GO_BACK' });
      return true; // 이벤트 소비 (Web에서 처리)
    });

    return () => backHandler.remove();
  }, [canGoBack, webIsRoot, currentPath, sendToWebView]);

  // ========== AppState 리스너 (Stage 2: background/foreground 감지) ==========
  useEffect(() => {
    if (!isFeatureEnabled('ENHANCED_NAV_SYNC')) return;

    const appStateRef = { current: AppState.currentState };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // Boot Type 업데이트 (background -> active = resume)
      if (isFeatureEnabled('BOOT_TYPE_DETECTION')) {
        const newBootType = updateOnAppState(nextAppState);
        if (newBootType !== nativeBootType) {
          setNativeBootType(newBootType);
          telemetry('native_boot_type_changed', {
            type: newBootType,
            bootType: newBootType,
            previousState,
          });
        }
      }

      telemetry('app_state_changed', {
        appState: nextAppState,
        previousState,
        canGoBack,
      });

      // 앱이 다시 활성화될 때 WebView에 상태 동기화 요청
      if (
        previousState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // WebView에 NAV_STATE_SYNC 메시지 전송
        sendToWebView({
          type: 'NAV_STATE_SYNC',
          canGoBack,
          canGoForward: false, // 현재 미사용
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [canGoBack, sendToWebView, nativeBootType]);

  // ========== iOS gesture 변경 telemetry ==========
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (!isFeatureEnabled('TELEMETRY_ENABLED')) return;

    const allowed = isFeatureEnabled('SAFE_WEBVIEW_NAV') ? canGoBack : true;
    telemetry('ios_gesture_toggled', { canGoBack, allowed });
  }, [canGoBack]);

  // WebView에서 메시지 수신
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      console.log('Received message from WebView:', message);

      if (message.type === 'SESSION_UPDATE' && message.session) {
        // 웹에서 받은 세션을 React Native Supabase에 저장
        const { error } = await supabase.auth.setSession({
          access_token: message.session.access_token,
          refresh_token: message.session.refresh_token,
        });

        if (error) {
          console.error('Error setting session:', error);
        } else {
          console.log('Session synced successfully to React Native');
        }
      } else if (message.type === 'SIGNED_OUT') {
        // 로그아웃 처리
        await supabase.auth.signOut();
        console.log('Signed out from React Native');
      } else if (message.type === 'HISTORY_STATE_REPORT') {
        // 레거시: Web에서 보낸 히스토리 상태로 canGoBack 동기화
        // 신규 WEB_ROUTE_STATE로 대체 예정
        const webCanGoBack = message.canGoBack ?? false;
        console.log('History state from Web:', {
          path: message.currentPath,
          length: message.historyLength,
          canGoBack: webCanGoBack
        });
        // 레거시 호환: canGoBack은 navState에서 받으므로 여기선 무시
        // setCanGoBack(webCanGoBack);
      } else if (message.type === 'WEB_ROUTE_STATE') {
        // 신규: Web에서 보낸 루트 경로 여부
        const isRoot = message.isRoot ?? true;
        console.log('Web route state:', {
          path: message.currentPath,
          isRoot,
        });
        setWebIsRoot(isRoot);
        // currentPath 동기화
        if (typeof message.currentPath === 'string') {
          setCurrentPath(message.currentPath);
        }
      } else if (message.type === 'SET_STATUS_BAR') {
        // 상태바 색상 설정
        if (message.backgroundColor) {
          StatusBar.setBackgroundColor(message.backgroundColor, true);
        }
        if (message.barStyle) {
          StatusBar.setBarStyle(message.barStyle, true);
        }
        console.log('Status bar updated:', {
          backgroundColor: message.backgroundColor,
          barStyle: message.barStyle,
        });
      } else if (message.type === 'SHARE_REQUEST') {
        // 네이티브 공유 시트 호출
        try {
          const shareContent: { message?: string; title?: string; url?: string } = {};

          // Android는 message 필드 사용, iOS는 url 필드 지원
          if (Platform.OS === 'android') {
            // Android: URL을 message에 포함
            shareContent.message = message.url || message.message || '';
            if (message.title) {
              shareContent.title = message.title;
            }
          } else {
            // iOS: url 필드 별도 지원
            if (message.url) {
              shareContent.url = message.url;
            }
            if (message.message) {
              shareContent.message = message.message;
            }
            if (message.title) {
              shareContent.title = message.title;
            }
          }

          const result = await Share.share(shareContent as any);
          console.log('Share result:', result);
        } catch (shareError) {
          console.error('Share failed:', shareError);
        }
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  // Throttled navigation state handler
  const handleNavChange = useCallback((navState: any) => {
    try {
      console.log('WebView NAV:', { url: navState?.url, canGoBack: navState?.canGoBack });

      const newCanGoBack = navState?.canGoBack ?? false;

      // URL에서 pathname 추출하여 루트 경로 여부 직접 판단
      // Web 메시지에 의존하지 않아 동기화 문제 해결
      let pathname = '/';
      try {
        if (navState?.url) {
          const url = new URL(navState.url);
          pathname = url.pathname;
        }
      } catch (e) {
        // URL 파싱 실패 시 기본값 사용
      }

      // 탭 루트 + 차단 경로를 합쳐서 "논리적 루트"로 판단
      const TAB_ROOT_PATHS = ['/home', '/explore', '/lounge', '/messages', '/profile'];
      const BLOCK_BACK_PATHS = ['/login', '/auth/callback', '/onboarding'];
      const isLogicalRoot = TAB_ROOT_PATHS.includes(pathname) ||
        BLOCK_BACK_PATHS.some(p => pathname.startsWith(p));

      // canGoBack과 isRoot 동시에 업데이트 (동기화 보장)
      // Throttle canGoBack updates to prevent rapid state changes during fast navigation
      if (canGoBackThrottleRef.current) {
        pendingCanGoBackRef.current = newCanGoBack;
        return;
      }

      setCanGoBack(newCanGoBack);
      setWebIsRoot(isLogicalRoot);
      setCurrentPath(pathname);

      canGoBackThrottleRef.current = setTimeout(() => {
        canGoBackThrottleRef.current = null;
        // Apply pending update if different from current
        if (pendingCanGoBackRef.current !== newCanGoBack) {
          setCanGoBack(pendingCanGoBackRef.current);
        }
      }, CAN_GO_BACK_THROTTLE_MS);
    } catch (_) { }
  }, []);

  const handleWebError = (syntheticEvent: any) => {
    try {
      const { nativeEvent } = syntheticEvent;
      console.log('WebView ERROR:', nativeEvent);
    } catch (_) { }
  };

  const handleLoadEnd = () => {
    // WebView 로드 완료 시, 대기중이던 메시지 flush
    if (pendingMessagesRef.current.length > 0) {
      const pending = [...pendingMessagesRef.current];
      pendingMessagesRef.current = [];
      // 약간의 지연을 두어 React Router 초기화 대기 (특히 PUSH_OPEN 메시지 처리)
      setTimeout(() => {
        pending.forEach(sendToWebView);
      }, 300);
    }

    // Boot Type 힌트를 WebView에 전송
    if (isFeatureEnabled('BOOT_TYPE_DETECTION')) {
      const currentBootType = getBootType();
      sendToWebView({
        type: 'BOOT_TYPE_HINT',
        nativeBootType: currentBootType,
        timestamp: Date.now(),
      });
    }

    // 스플래시 시간 결정
    const splashStart = Date.now();
    let splashDelay = 2000; // 기본값 (cold start)

    if (isFeatureEnabled('SPLASH_OPTIMIZATION') && isFeatureEnabled('BOOT_TYPE_DETECTION')) {
      const currentBootType = getBootType();
      // cold: 2초, recovered/resume: 최소 500ms (WebView 렌더링 완료 보장)
      splashDelay = currentBootType === 'cold' ? 2000 : 500;
    }

    setTimeout(() => {
      setIsLoading(false);
      telemetry('splash_timing', {
        bootType: getBootType(),
        splashDuration: Date.now() - splashStart,
        requestedDelay: splashDelay,
      });
    }, splashDelay);
  };

  return (
    <View style={[styles.container, {
      paddingTop: insets.top,
      paddingBottom: 0,
    }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* 로딩 화면 - 전체 화면 스플래시 */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Image
            source={require('./assets/splash.png')}
            style={styles.splashImage}
            resizeMode="cover"
          />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: WEBAPP_URL }}
        style={[styles.webview, { opacity: isLoading ? 0 : 1 }]}
        // iOS 인라인 비디오 재생 허용 (전체화면 전환 방지)
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // 웹뷰 로딩 성능 향상을 위한 옵션
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        webviewDebuggingEnabled={true}
        // contentInset 대신 container paddingTop으로 safe area 처리
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        // iOS 뒤로가기 제스처 제어
        // - 차단 경로(/login, /onboarding)에서만 제스처 비활성화
        // - 나머지 경로는 항상 허용 (SPA의 pushState를 WebView가 히스토리로 인식함)
        allowsBackForwardNavigationGestures={
          isFeatureEnabled('SAFE_WEBVIEW_NAV')
            ? !currentPath.startsWith('/login') &&
            !currentPath.startsWith('/auth/callback') &&
            !currentPath.startsWith('/onboarding')
            : true
        }
        // WebView 메시지 수신
        onMessage={handleWebViewMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // Custom User-Agent: LytAppWebView 토큰으로 Vercel Firewall bypass
        // Google OAuth 호환을 위해 표준 Chrome UA도 유지
        userAgent="LytAppWebView/1.0 Mozilla/5.0 (Linux; Android 10; Android SDK built for x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        // 네비게이션/에러 로깅
        onNavigationStateChange={handleNavChange}
        onError={handleWebError}
        onLoadEnd={handleLoadEnd}
        // WebView 프로세스 종료 시 자동 복구 (iOS)
        onContentProcessDidTerminate={() => {
          console.warn('[WebView] Content process terminated, reloading...');
          webViewRef.current?.reload();
        }}
      />
    </View>
  );
}

export default Sentry.wrap(function App() {
  return (
    <SafeAreaProvider>
      <WebViewContainer />
    </SafeAreaProvider>
  );
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#3366FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
