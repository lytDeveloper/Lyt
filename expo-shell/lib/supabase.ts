// 🚨 polyfill은 다른 import보다 가장 위에 있어야 합니다.
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Expo 환경 변수(process.env)를 사용합니다.
// EXPO_PUBLIC_... 접두사는 .env_guide.md에서 정의했습니다.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in .env file');
}

// React Native 환경에서는 세션 저장을 위해 AsyncStorage를 명시적으로 지정해야 합니다.
// SecureStore를 동적으로 로드하고, 없으면 메모리 스토리지로 폴백
let SecureStore: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch (_) {
  SecureStore = null;
}

const memoryStore: Record<string, string | undefined> = {};
const memoryAdapter = {
  getItem: async (key: string) => memoryStore[key] ?? null,
  setItem: async (key: string, value: string) => {
    memoryStore[key] = value;
  },
  removeItem: async (key: string) => {
    delete memoryStore[key];
  },
};

const secureStoreAdapter = SecureStore?.getItemAsync
  ? {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    }
  : memoryAdapter;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // WebView가 아닌 React Native에서는 false가 권장됩니다.
  },
});

