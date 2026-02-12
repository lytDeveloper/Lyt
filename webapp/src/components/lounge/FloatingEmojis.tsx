/**
 * FloatingEmojis Component (Phase 4)
 *
 * Purpose: 플로팅 이모지 리액션 애니메이션
 *
 * Design Spec:
 * - 8가지 이모지: ❤️🔥👏🎉💯✨🚀💪
 * - 하단→상단 떠오름 (150px 상승)
 * - 가로 위치 랜덤 (10-90% range)
 * - 2초 fade-out 애니메이션
 * - 응원 규모에 따라 자동 트리거
 *
 * Features:
 * - 클릭 시 이모지 선택 팝오버
 * - 자동 cleanup (2초 후 제거)
 * - 순수 UI 애니메이션 (DB 저장 없음)
 *
 * Usage:
 * <FloatingEmojis supportCount={likeCount} />
 */

import { useState, useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { Box, IconButton, Popover, styled } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import smileyEmojiAnim from '../../assets/lottie/Winking_Emoji.json';

const EMOJIS = ['❤️', '🔥', '👏', '🎉', '💯', '✨', '🚀', '💪'];

const FloatingEmojiWrapper = styled(Box)({
  position: 'absolute',
  inset: 0,
  height: '100%',
  pointerEvents: 'none',
  // overflow: 'hidden',
});

const EmojiButton = styled(IconButton)(({ theme }) => ({
  width: 54,
  height: 54,
  fontSize: 20,
  color: theme.palette.icon.default,
}));

const EmojiPopover = styled(Popover)({
  '& .MuiPopover-paper': {
    borderRadius: 30,
    padding: 8,
  },
});

const EmojiGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 1fr)',
  gap: 8,
});

interface FloatingEmojiType {
  id: number;
  emoji: string;
  x: number;
  y: number;
  drift: number;
}

interface FloatingEmojisProps {
  supportCount?: number;
}

export default function FloatingEmojis({ supportCount = 0 }: FloatingEmojisProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [emojis, setEmojis] = useState<FloatingEmojiType[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  // useRef로 ID 카운터를 관리하여, 비동기 상태 업데이트로 인한 중복 key 문제를 방지
  const emojiIdRef = useRef(0);

  const getSpawnPosition = useCallback(() => {
    if (!wrapperRef.current || !buttonRef.current) {
      return { x: 0, y: 0 };
    }

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const buttonRect = buttonRef.current.getBoundingClientRect();

    // 버튼 중심을 기준으로, 래퍼의 좌측·하단 기준 좌표(px)
    const x = buttonRect.left - wrapperRect.left + buttonRect.width / 2;
    const yCenterFromBottom = wrapperRect.bottom - buttonRect.top - buttonRect.height / 2;

    // 버튼을 중심으로 좌우로 살짝 랜덤 분포 (이모지 여백 포함)
    const horizontalSpread = 30; // px
    const spawnX = x + (Math.random() * 2 - 1) * horizontalSpread;
    const horizontalPadding = 16; // 이모지가 잘리지 않도록 좌우 여백
    const clampedX = Math.min(
      Math.max(spawnX, horizontalPadding),
      Math.max(horizontalPadding, wrapperRect.width - horizontalPadding),
    );

    // 버튼보다 위쪽에서 시작하도록 기준 높이를 올리고, 약간 랜덤 분포
    const baseLift = buttonRect.height * 8 + 50; // 버튼 중심 대비 위로 올리는 기본값
    const verticalSpread = 24; // px 위아래 랜덤 폭
    const spawnY = yCenterFromBottom - baseLift + (Math.random() * 2 - 1) * verticalSpread;
    const verticalPadding = 12; // 너무 아래로 떨어지지 않게 최소 여백
    const clampedY = Math.min(
      Math.max(spawnY, verticalPadding),
      Math.max(verticalPadding, wrapperRect.height - verticalPadding),
    );

    return { x: clampedX, y: clampedY };
  }, []);

  const addEmoji = useCallback(
    (emoji: string, pos?: { x: number; y: number }) => {
      const { x, y } = pos ?? getSpawnPosition();
      const drift = Math.random() * 30 - 15; // horizontal drift during float

      // ref 기반 증가형 ID로, 빠르게 여러 개 추가될 때도 항상 고유 값 유지
      const nextId = emojiIdRef.current++;

      const newEmoji: FloatingEmojiType = {
        id: nextId,
        emoji,
        x,
        y,
        drift,
      };

      setEmojis((prev) => [...prev, newEmoji]);

      // Auto-remove after 2 seconds
      setTimeout(() => {
        setEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
      }, 2000);
    },
    [getSpawnPosition],
  );

  const handleEmojiClick = (emoji: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    addEmoji(emoji, getSpawnPosition());
    setAnchorEl(null);
  };

  const handleTriggerClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  // Auto-trigger emojis based on support count
  useEffect(() => {
    if (supportCount === 0) return;

    // Calculate frequency based on support count
    // More support = more frequent emojis
    const baseInterval = 10000; // 10 seconds
    const minInterval = 3000; // 3 seconds
    const interval = Math.max(minInterval, baseInterval / Math.log(supportCount + 2));

    const timer = setInterval(() => {
      // Random emoji from the list
      const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      addEmoji(randomEmoji);
    }, interval);

    return () => clearInterval(timer);
  }, [supportCount, addEmoji]);


  return (
    <>
      {/* Emoji Trigger Button */}
      <EmojiButton ref={buttonRef} onClick={handleTriggerClick}>
        <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lottie
            animationData={smileyEmojiAnim}
            loop={true}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
      </EmojiButton>

      {/* Emoji Selector Popover */}
      <EmojiPopover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <EmojiGrid>
          {EMOJIS.map((emoji) => (
            <IconButton key={emoji} onClick={(e) => handleEmojiClick(emoji, e)} sx={{ width: 24, height: 24, fontSize: 24 }}>
              {emoji}
            </IconButton>
          ))}
        </EmojiGrid>
      </EmojiPopover>

      {/* Floating Emojis */}
      <FloatingEmojiWrapper ref={wrapperRef}>
        <AnimatePresence>
          {emojis.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 1, y: item.y, x: item.x }}
              animate={{ opacity: 0, y: item.y - 160, x: item.x + item.drift }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                bottom: 0,
                fontSize: 24,
                pointerEvents: 'none',
              }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </FloatingEmojiWrapper>
    </>
  );
}
