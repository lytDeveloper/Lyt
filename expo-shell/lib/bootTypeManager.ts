/**
 * Boot Type Manager for expo-shell
 * AsyncStorage를 사용하여 앱 프로세스 상태를 추적하고
 * cold/recovered/resume을 판별합니다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateStatus } from 'react-native';

export type NativeBootType = 'cold' | 'recovered' | 'resume';

const BOOT_STATE_KEY = '@bridge_boot_state_v1';
const FIVE_MINUTES = 5 * 60 * 1000;

interface BootState {
    lastActiveTimestamp: number;
}

let currentBootType: NativeBootType = 'cold';
let isInitialized = false;

/**
 * 앱 시작 시 boot type 초기화
 * - 5분 이내 재시작: recovered
 * - 그 외: cold
 */
export async function initBootType(): Promise<NativeBootType> {
    if (isInitialized) {
        return currentBootType;
    }

    try {
        const raw = await AsyncStorage.getItem(BOOT_STATE_KEY);
        const stored: BootState | null = raw ? JSON.parse(raw) : null;

        if (stored && (Date.now() - stored.lastActiveTimestamp) < FIVE_MINUTES) {
            currentBootType = 'recovered';
        } else {
            currentBootType = 'cold';
        }

        isInitialized = true;
        await saveBootState();
        return currentBootType;
    } catch {
        isInitialized = true;
        return 'cold';
    }
}

/**
 * AppState 변경 시 호출
 * - background → active: resume으로 전환
 */
export function updateOnAppState(nextState: AppStateStatus): NativeBootType {
    if (nextState === 'active' && isInitialized) {
        // 백그라운드에서 복귀하면 resume
        // (초기화 후에만 resume으로 변경, 초기화 전에는 cold/recovered 유지)
        currentBootType = 'resume';
        saveBootState().catch(() => { });
    }
    return currentBootType;
}

/**
 * 현재 boot type 반환
 */
export function getBootType(): NativeBootType {
    return currentBootType;
}

/**
 * 현재 상태 저장
 */
async function saveBootState(): Promise<void> {
    try {
        await AsyncStorage.setItem(BOOT_STATE_KEY, JSON.stringify({
            lastActiveTimestamp: Date.now(),
        }));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Boot state 초기화 (테스트/디버그용)
 */
export async function resetBootState(): Promise<void> {
    try {
        await AsyncStorage.removeItem(BOOT_STATE_KEY);
        currentBootType = 'cold';
        isInitialized = false;
    } catch {
        // Ignore
    }
}
