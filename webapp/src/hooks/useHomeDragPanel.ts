import { useState, useEffect, useCallback } from 'react';
import {
  useMotionValue,
  useDragControls,
  animate,
  type MotionValue,
  type DragControls,
  type PanInfo,
} from 'framer-motion';
import { PANEL_DRAG_CONFIG } from '../constants/homeConstants';

type PanelState = 'collapsed' | 'expanded';

interface UseHomeDragPanelOptions {
  /** 확장 시 Y 위치 (음수, 위쪽으로 이동) */
  expandedY: number;
  /** 축소 시 Y 위치 (기본: 0) */
  collapsedY?: number;
}

interface UseHomeDragPanelReturn {
  /** 패널 상태 */
  panelState: PanelState;
  /** 패널 Y 위치 (MotionValue) */
  panelY: MotionValue<number>;
  /** 드래그 컨트롤 */
  dragControls: DragControls;
  /** 스크롤 가능한 콘텐츠 참조 (ref callback) */
  scrollableContentRef: (node: HTMLDivElement | null) => void;
  /** 드래그 리스너 활성화 여부 (computed) */
  dragListener: boolean;
  /** 드래그 종료 핸들러 */
  handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => Promise<void>;
  /** 콘텐츠 영역 포인터 다운 핸들러 */
  handleContentPointerDown: (event: React.PointerEvent) => void;
  /** 핸들바 드래그 시작 마크 */
  markHandleBarDrag: () => void;
  /** 포인터 다운 핸들러 (방향 감지 시작) */
  handlePointerDown: (event: React.PointerEvent) => void;
  /** 포인터 이동 핸들러 (방향 기반 제스처 라우팅) */
  handlePointerMove: (event: React.PointerEvent) => void;
  /** 포인터 업 핸들러 (상태 리셋) */
  handlePointerUp: () => void;
}

/**
 * 홈페이지 드래그 가능한 패널의 로직을 캡슐화하는 훅
 *
 * 기능:
 * - 패널 상태 관리 (collapsed/expanded)
 * - 드래그 제스처 처리
 * - 스프링 애니메이션
 * - 스크롤 영역에서의 드래그 시작 조건
 */
export function useHomeDragPanel({
  expandedY,
  collapsedY = 0,
}: UseHomeDragPanelOptions): UseHomeDragPanelReturn {
  const [panelState, setPanelState] = useState<PanelState>('collapsed');
  const [isAtTop, setIsAtTop] = useState(true);
  const [isHandleBarDrag, setIsHandleBarDrag] = useState(false);
  const panelY = useMotionValue(0);
  const dragControls = useDragControls();

  // Scroll element state (for proper listener attachment)
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  // Ref callback to capture scroll element
  const scrollableContentRef = useCallback((node: HTMLDivElement | null) => {
    setScrollEl(node);
  }, []);

  // 스크롤 위치 추적 (scrollEl이 설정된 후 실행)
  useEffect(() => {
    if (!scrollEl) return;

    const handleScroll = () => {
      const scrollTop = scrollEl.scrollTop;
      const atTop = scrollTop < 5; // 5px threshold
      setIsAtTop(atTop);
    };

    handleScroll(); // 초기 체크
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [scrollEl]); // scrollEl 변경 시 재실행

  // 패널이 collapsed되면 최상단 상태로 리셋
  useEffect(() => {
    if (panelState === 'collapsed') {
      setIsAtTop(true);
      // 스크롤도 최상단으로 리셋
      if (scrollEl) {
        scrollEl.scrollTop = 0;
      }
    }
  }, [panelState, scrollEl]);

  // 드래그 리스너 활성화 (항상 true)
  const dragListener = true;

  //console.log('[useHomeDragPanel] State - panelState:', panelState, 'isAtTop:', isAtTop, 'dragListener:', dragListener);

  /**
   * 드래그 종료 시 패널 상태 전환 로직
   */
  const handleDragEnd = async (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ): Promise<void> => {
    const { DRAG_THRESHOLD, VELOCITY_THRESHOLD } = PANEL_DRAG_CONFIG;
    let target = panelState === 'collapsed' ? collapsedY : expandedY;

    const isExpanding = panelState === 'collapsed' && (info.offset.y < -DRAG_THRESHOLD || info.velocity.y < -VELOCITY_THRESHOLD);

    // Collapse는 콘텐츠가 최상단일 때만 허용 (단, 핸들바에서 드래그한 경우는 예외)
    const isCollapsing = panelState === 'expanded' && (isHandleBarDrag || isAtTop) && (info.offset.y > DRAG_THRESHOLD || info.velocity.y > VELOCITY_THRESHOLD);

    // Reset handle bar drag flag
    setIsHandleBarDrag(false);

    if (isExpanding) {
      target = expandedY;
      // expand 애니메이션 시작 전에 상태 변경 → 스크롤 즉시 활성화
      setPanelState('expanded');
    } else if (isCollapsing) {
      target = collapsedY;
    }

    // 애니메이션 실행
    await animate(panelY, target, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.5,
      restDelta: 0.01,
      restSpeed: 0.01,
    });

    // collapse는 애니메이션 완료 후 상태 변경 (스크롤 비활성화)
    if (isCollapsing) {
      setPanelState('collapsed');
    }
  };

  /**
   * 콘텐츠 영역 포인터 다운 핸들러
   * - 스크롤이 내려가 있을 때만 전파 차단
   */
  const handleContentPointerDown = (event: React.PointerEvent): void => {
    if (panelState === 'expanded' && scrollEl) {
      if (scrollEl.scrollTop > 0) {
        event.stopPropagation();
      }
    }
  };

  /**
   * 핸들바 드래그 시작 마크
   */
  const markHandleBarDrag = () => {
    setIsHandleBarDrag(true);
  };

  /**
   * 포인터 방향 감지를 위한 핸들러들
   */
  const [pointerStart, setPointerStart] = useState<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 핸들바에서 시작한 드래그는 무시 (핸들바가 자체 처리)
    if ((e.target as HTMLElement).closest('[data-handlebar="true"]')) {
      return;
    }

    setPointerStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStart || panelState !== 'expanded') return;

    const deltaY = e.clientY - pointerStart.y;
    const deltaX = e.clientX - pointerStart.x;

    // 최소 이동 거리 체크 (3px - 더 민감하게)
    if (Math.abs(deltaY) > 3 || Math.abs(deltaX) > 3) {
      // 세로 방향 제스처 확인
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // 위로 드래그 → 항상 스크롤 허용, Framer drag 차단
        if (deltaY < 0) {
          e.stopPropagation();
        }
        // 아래로 드래그 && 스크롤이 내려가 있음 → 스크롤만, Framer drag 차단
        else if (!isAtTop) {
          e.stopPropagation();
        }
        // 아래로 드래그 && 최상단 → collapse 허용 (차단 안 함)
      }
    }
  }, [pointerStart, panelState, isAtTop]);

  const handlePointerUp = useCallback(() => {
    setPointerStart(null);
  }, []);

  return {
    panelState,
    panelY,
    dragControls,
    scrollableContentRef,
    dragListener,
    handleDragEnd,
    handleContentPointerDown,
    markHandleBarDrag,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

export default useHomeDragPanel;
