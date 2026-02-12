import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { KeyboardEvent, ChangeEvent, FocusEvent } from 'react';
import { styled, Box } from '@mui/material';


const COLORS = {
  BORDER_DEFAULT: '#E5E5EA',
  CTA_BLUE: '#007AFF',
  INPUT_BG: '#FFFFFF',
  CARD_SELECTED_BG: '#E3F2FD',
  TEXT_PRIMARY: '#1C1C1E',
  TEXT_SECONDARY: '#949196',
};

const TagInputContainer = styled(Box)({
  display: 'flex',
  flexWrap: 'nowrap', // 줄 바꿈 없음
  alignItems: 'center',
  gap: '6px',
  padding: '12px 16px',
  borderRadius: '12px',
  border: `1px solid ${COLORS.BORDER_DEFAULT}`,
  backgroundColor: COLORS.INPUT_BG,
  minHeight: '52px',
  cursor: 'text',
  overflowX: 'auto', // 가로 스크롤
  whiteSpace: 'nowrap', // 줄 바꿈 방지
  '&:focus-within': {
    border: `1px solid ${COLORS.CTA_BLUE}`,
  },
  // 스크롤바 스타일링
  '&::-webkit-scrollbar': {
    height: '4px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#c1c1c1',
    borderRadius: '2px',
  },
});


const TagChip = styled(Box)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  fontWeight: 400,
  padding: '4px 10px',
  borderRadius: '100px',
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.text.primary,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  whiteSpace: 'nowrap', // 태그 내 줄 바꿈 방지
  flexShrink: 0, // 태그 축소 방지
}));

const HiddenInput = styled('input')({
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  flex: '1 0 120px', // 최소 120px 너비 유지
  minWidth: '120px',
  fontSize: 14,
  fontFamily: 'Pretendard, sans-serif',
  '&::placeholder': {
    color: COLORS.TEXT_SECONDARY,
  },
});

export interface TagInputProps {
  /** 현재 태그 목록 */
  tags: string[];
  /** 태그 목록이 변경될 때 호출되는 콜백 */
  onTagsChange: (tags: string[]) => void;
  /** 입력 placeholder */
  placeholder?: string;
  /** 최대 태그 개수 (기본값: 5) */
  maxTags?: number;
  /** 최대 태그 초과 시 에러 표시 여부 */
  showLimitError?: boolean;
  /** 최대 태그 초과 시 에러 상태 변경 콜백 */
  onLimitError?: (hasError: boolean) => void;
}

export interface TagInputRef {
  focus: () => void;
}

/**
 * 재사용 가능한 태그 입력 컴포넌트
 * - Enter 키 또는 쉼표(,)로 태그 추가
 * - 포커스 해제(blur) 시 자동 추가
 * - 가로 스크롤, 줄 바꿈 없음
 * - Backspace로 마지막 태그 삭제
 */
const TagInput = forwardRef<TagInputRef, TagInputProps>(({
  tags,
  onTagsChange,
  placeholder = '#태그 입력 후 쉼표(,)로 추가',
  maxTags = 5,
  showLimitError = false,
  onLimitError,
}, ref) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [currentInput, setCurrentInput] = useState('');

  // ref를 통해 focus 메서드 노출
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  // 태그 추가 공통 함수
  const addTag = (value: string): boolean => {
    const newTag = value.trim();
    if (!newTag) return false;

    if (tags.length >= maxTags) {
      onLimitError?.(true);
      return false;
    }

    onTagsChange([...tags, newTag]);
    onLimitError?.(false);
    return true;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 쉼표로 태그 추가 (모바일 키보드 호환성)
    if (value.includes(',')) {
      const parts = value.split(',');
      const tagToAdd = parts[0];
      const remaining = parts.slice(1).join(',');

      if (addTag(tagToAdd)) {
        setCurrentInput(remaining);
      } else {
        setCurrentInput(value.replace(',', '')); // 한도 초과 시 쉼표만 제거
      }
      return;
    }

    setCurrentInput(value);
  };

  // blur 시 현재 입력값을 태그로 추가
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // 컨테이너 내부 클릭인 경우 무시 (태그 삭제 버튼 등)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget?.closest('[data-tag-input-container]')) {
      return;
    }

    if (currentInput.trim()) {
      if (addTag(currentInput)) {
        setCurrentInput('');
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter 키로 태그 추가
    if (e.key === 'Enter') {
      e.preventDefault();

      if (addTag(currentInput)) {
        setCurrentInput('');
      }
      return;
    }

    // Backspace로 마지막 태그 삭제
    if (e.key === 'Backspace' && currentInput === '' && tags.length > 0) {
      e.preventDefault();
      onTagsChange(tags.slice(0, -1));
      onLimitError?.(false);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <Box>
      <TagInputContainer onClick={handleContainerClick}>
        {tags.slice(0, maxTags).map((tag, index) => (
          <TagChip key={`${tag}-${index}`}>
            #{tag}
          </TagChip>
        ))}
        <HiddenInput
          ref={inputRef}
          placeholder={tags.length === 0 ? placeholder : ''}
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoComplete="off"
          enterKeyHint="done"
        />
      </TagInputContainer>
      {showLimitError && tags.length >= maxTags && (
        <Box sx={{ color: '#DC3A3A', fontSize: 12, marginTop: '4px', marginLeft: '4px' }}>
          태그는 최대 {maxTags}개까지만 입력하실 수 있어요.
        </Box>
      )}
    </Box>
  );
});

TagInput.displayName = 'TagInput';

export default TagInput;

