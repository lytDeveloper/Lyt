import { useState } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Typography,
  Tooltip,
  Popover,
  Button,
  useTheme,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';

interface ReviewerNoteInputProps {
  applicationId: string;
  currentNote?: string;
  onSave: (id: string, note: string) => Promise<void>;
}

export default function ReviewerNoteInput({
  applicationId,
  currentNote = '',
  onSave,
}: ReviewerNoteInputProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [note, setNote] = useState(currentNote);
  const [isSaving, setIsSaving] = useState(false);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // 카드 클릭 방지
    setAnchorEl(event.currentTarget);
    setNote(currentNote);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setNote(currentNote);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(applicationId, note);
      setAnchorEl(null);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasNote = currentNote && currentNote.trim().length > 0;

  return (
    <>
      <Tooltip title={hasNote ? '메모 수정' : '메모 추가'}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            color: hasNote ? '#F59E0B' : theme.palette.text.secondary,
          }}
        >
          {hasNote ? (
            <StickyNote2Icon sx={{ fontSize: 20 }} />
          ) : (
            <EditNoteIcon sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()} // 팝오버 내부 클릭 시 카드 클릭 방지
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            minWidth: 280,
            maxWidth: 320,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            📝 내 메모
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: theme.palette.text.secondary,
              mb: 1.5,
            }}
          >
            이 메모는 나만 볼 수 있어요.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="지원자에 대한 메모를 남겨보세요"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            size="small"
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: 14,
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={handleClose}
              sx={{ color: theme.palette.text.secondary }}
            >
              취소
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={isSaving}
              sx={{
                bgcolor: '#2563EB',
                boxShadow: 'none',
              }}
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}









