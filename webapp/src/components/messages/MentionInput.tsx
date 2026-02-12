/**
 * MentionInput
 * 채팅방 멘션 입력 컴포넌트
 * TagInput 패턴을 적용: 멘션된 사용자를 Chip으로 표시하고 그 옆에 텍스트 입력
 */

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import {
    Box,
    Chip,
    Avatar,
    Typography,
    Popper,
    Paper,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ClickAwayListener,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';

interface MentionUser {
    id: string;
    display: string;
    avatar?: string;
}

interface ParsedSegment {
    type: 'text' | 'mention';
    content: string;
    userId?: string;
    display?: string;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend?: () => void;
    placeholder?: string;
    mentionData: MentionUser[];
    onFocus?: () => void;
}

export interface MentionInputRef {
    focus: () => void;
}

const InputContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 16px 12px 44px',
    borderRadius: '18px',
    backgroundColor: theme.palette.grey[50],
    minHeight: '48px',
    cursor: 'text',
    position: 'relative',
}));

const HiddenInput = styled('input')(({ theme }) => ({
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    flex: '1 0 80px',
    minWidth: '80px',
    fontSize: 14,
    fontFamily: 'Pretendard, sans-serif',
    color: theme.palette.text.primary,
    '&::placeholder': {
        color: theme.palette.text.secondary,
    },
}));

/**
 * 마크업 문자열을 파싱하여 segments 배열로 변환
 * @[이름](userId) 패턴을 감지
 */
const parseMarkup = (text: string): ParsedSegment[] => {
    const segments: ParsedSegment[] = [];
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // 멘션 전 텍스트
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex, match.index),
            });
        }
        // 멘션
        segments.push({
            type: 'mention',
            content: match[0],
            display: match[1],
            userId: match[2],
        });
        lastIndex = match.index + match[0].length;
    }

    // 나머지 텍스트
    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.slice(lastIndex),
        });
    }

    return segments;
};

/**
 * segments 배열을 마크업 문자열로 변환
 */
const segmentsToMarkup = (segments: ParsedSegment[]): string => {
    return segments.map(seg => {
        if (seg.type === 'mention') {
            return `@[${seg.display}](${seg.userId})`;
        }
        return seg.content;
    }).join('');
};

const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(({
    value,
    onChange,
    onSend,
    placeholder = '메시지를 입력하세요',
    mentionData,
    onFocus,
}, ref) => {
    const theme = useTheme();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // 현재 입력 중인 텍스트 (마지막 텍스트 세그먼트)
    const [currentInput, setCurrentInput] = useState('');
    // 파싱된 세그먼트들 (멘션 + 텍스트)
    const [segments, setSegments] = useState<ParsedSegment[]>([]);
    // 멘션 자동완성 상태
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(0);

    // ref를 통해 focus 메서드 노출
    useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
    }));

    // 외부 value 변경 시 동기화
    useEffect(() => {
        const parsed = parseMarkup(value);

        // 마지막 세그먼트가 텍스트면 currentInput으로 분리
        if (parsed.length > 0 && parsed[parsed.length - 1].type === 'text') {
            const lastText = parsed.pop()!;
            setSegments(parsed);
            setCurrentInput(lastText.content);
        } else {
            setSegments(parsed);
            setCurrentInput('');
        }
    }, [value]);

    // segments + currentInput 변경 시 외부에 알림
    const updateValue = useCallback((newSegments: ParsedSegment[], newInput: string) => {
        const allSegments = [...newSegments];
        if (newInput) {
            allSegments.push({ type: 'text', content: newInput });
        }
        const newValue = segmentsToMarkup(allSegments);
        onChange(newValue);
    }, [onChange]);

    // 필터된 멘션 목록
    const filteredMentions = mentionData.filter(user =>
        user.display.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setCurrentInput(newValue);

        // @ 트리거 감지
        const lastAtIndex = newValue.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const textAfterAt = newValue.slice(lastAtIndex + 1);
            // @ 뒤에 공백이 없으면 멘션 검색 시작
            if (!textAfterAt.includes(' ')) {
                setMentionSearch(textAfterAt);
                setShowSuggestions(true);
                setFocusedIndex(0);
                return;
            }
        }

        setShowSuggestions(false);
        updateValue(segments, newValue);
    };

    const handleMentionSelect = (user: MentionUser) => {
        // @ 이전 텍스트 유지
        const lastAtIndex = currentInput.lastIndexOf('@');
        const textBeforeAt = lastAtIndex > 0 ? currentInput.slice(0, lastAtIndex) : '';

        // 새 세그먼트 구성
        const newSegments = [...segments];
        if (textBeforeAt) {
            newSegments.push({ type: 'text', content: textBeforeAt });
        }
        newSegments.push({
            type: 'mention',
            content: `@[${user.display}](${user.id})`,
            display: user.display,
            userId: user.id,
        });

        setSegments(newSegments);
        setCurrentInput('');
        setShowSuggestions(false);
        updateValue(newSegments, '');

        // 입력 포커스 유지
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // 멘션 자동완성 중
        if (showSuggestions && filteredMentions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(prev => Math.min(prev + 1, filteredMentions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                handleMentionSelect(filteredMentions[focusedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                return;
            }
        }

        // Enter로 전송
        if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
            e.preventDefault();
            onSend?.();
            return;
        }

        // Backspace로 마지막 멘션 삭제
        if (e.key === 'Backspace' && currentInput === '' && segments.length > 0) {
            e.preventDefault();
            const newSegments = segments.slice(0, -1);
            setSegments(newSegments);
            updateValue(newSegments, '');
        }
    };

    const handleRemoveMention = (index: number) => {
        const newSegments = segments.filter((_, i) => i !== index);
        setSegments(newSegments);
        updateValue(newSegments, currentInput);
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
            <Box sx={{ position: 'relative', flex: 1 }}>
                <InputContainer ref={containerRef} onClick={handleContainerClick}>
                    {segments.map((seg, index) => (
                        seg.type === 'mention' ? (
                            <Chip
                                key={`mention-${index}`}
                                label={`@${seg.display}`}
                                size="small"
                                onDelete={() => handleRemoveMention(index)}
                                sx={{
                                    height: 24,
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    bgcolor: theme.palette.primary.main,
                                    color: '#fff',
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                    '& .MuiChip-deleteIcon': {
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: 16,
                                        '&:hover': {
                                            color: '#fff',
                                        },
                                    },
                                }}
                            />
                        ) : (
                            <Typography
                                key={`text-${index}`}
                                component="span"
                                sx={{ fontSize: 14, color: theme.palette.text.primary }}
                            >
                                {seg.content}
                            </Typography>
                        )
                    ))}
                    <HiddenInput
                        ref={inputRef}
                        placeholder={segments.length === 0 ? placeholder : ''}
                        value={currentInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={onFocus}
                        autoComplete="off"
                    />
                </InputContainer>

                {/* 멘션 자동완성 드롭다운 */}
                <Popper
                    open={showSuggestions && filteredMentions.length > 0}
                    anchorEl={containerRef.current}
                    placement="top-start"
                    style={{ zIndex: 1300 }}
                >
                    <Paper
                        sx={{
                            mb: 1,
                            maxHeight: 200,
                            overflow: 'auto',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            borderRadius: 2,
                        }}
                    >
                        <List dense>
                            {filteredMentions.map((user, index) => (
                                <ListItem
                                    key={user.id}
                                    onClick={() => handleMentionSelect(user)}
                                    sx={{
                                        cursor: 'pointer',
                                        bgcolor: index === focusedIndex
                                            ? theme.palette.action.hover
                                            : 'transparent',
                                        '&:hover': {
                                            bgcolor: theme.palette.action.hover,
                                        },
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar src={user.avatar} sx={{ width: 28, height: 28 }} />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={user.display}
                                        primaryTypographyProps={{ fontSize: 14 }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Popper>
            </Box>
        </ClickAwayListener>
    );
});

MentionInput.displayName = 'MentionInput';

export default MentionInput;
