import { styled, Box, TextField } from '@mui/material';

/**
 * Chat/Message Components
 * Used by: MessageRoom, ChatRoom, MessageList
 */

// Sent message bubble (blue, right-aligned)
export const SentMessageBubble = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: '10px 14px',
  borderRadius: '16px 16px 4px 16px',
  maxWidth: '70%',
  alignSelf: 'flex-end',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
  marginBottom: '4px',
}));

// Received message bubble (gray, left-aligned)
export const ReceivedMessageBubble = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.text.primary,
  padding: '10px 14px',
  borderRadius: '16px 16px 16px 4px',
  maxWidth: '70%',
  alignSelf: 'flex-start',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 14,
  lineHeight: 1.5,
  wordBreak: 'break-word',
  marginBottom: '4px',
}));

// Message container (wraps multiple messages)
export const MessageContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '12px',
});

// Message timestamp
export const MessageTimestamp = styled(Box)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.secondary,
  fontFamily: 'Pretendard, sans-serif',
  marginTop: '2px',
  textAlign: 'right',
}));

// Chat input container (sticky bottom)
export const ChatInputContainer = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1.5),
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center',
  zIndex: 10,
}));

// Chat input field
export const ChatInput = styled(TextField)(({ theme }) => ({
  flex: 1,
  '& .MuiOutlinedInput-root': {
    borderRadius: '24px',
    backgroundColor: theme.palette.grey[100],
    fontFamily: 'Pretendard, sans-serif',
    fontSize: 14,
    '& fieldset': {
      border: 'none',
    },
    '&.Mui-focused fieldset': {
      border: `2px solid ${theme.palette.primary.main}`,
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '10px 16px',
  },
}));

// Chat room list item
export const ChatRoomItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: 'background-color 0.2s',
}));

// Unread badge
export const UnreadBadge = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '9999px',
  minWidth: 20,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'Pretendard, sans-serif',
  padding: '0 6px',
}));

// Message preview text
export const MessagePreview = styled(Box)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
  fontFamily: 'Pretendard, sans-serif',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

// Chat header
export const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  position: 'sticky',
  top: 0,
  zIndex: 10,
}));

// Messages scroll container
export const MessagesScrollContainer = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: '16px',
});
