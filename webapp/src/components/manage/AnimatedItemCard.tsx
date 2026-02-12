import { useState, useEffect, type ReactNode } from 'react';
import { Fade, Collapse, Box } from '@mui/material';

interface AnimatedItemCardProps {
  isVisible: boolean;
  onExited?: () => void; // 애니메이션 완료 후 콜백
  children: ReactNode;
}

/**
 * ItemCard를 감싸서 Fade + Collapse 애니메이션 처리
 * - Fade (200ms): 카드가 투명해짐
 * - Collapse (300ms): 공간이 축소되며 아래 카드가 올라옴
 */
export default function AnimatedItemCard({
  isVisible,
  onExited,
  children,
}: AnimatedItemCardProps) {
  const [showCollapse, setShowCollapse] = useState(isVisible);

  useEffect(() => {
    if (!isVisible) {
      // Fade가 먼저 진행된 후 Collapse 시작
      const timer = setTimeout(() => {
        setShowCollapse(false);
      }, 150); // Fade 시간의 약 75%
      return () => clearTimeout(timer);
    } else {
      setShowCollapse(true);
    }
  }, [isVisible]);

  return (
    <Collapse
      in={showCollapse}
      timeout={300}
      onExited={onExited}
      unmountOnExit
    >
      <Fade in={isVisible} timeout={200}>
        <Box>{children}</Box>
      </Fade>
    </Collapse>
  );
}
