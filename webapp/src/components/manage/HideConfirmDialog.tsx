import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface HideConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'hide' | 'unhide';
  itemType: string; // 예: '제안', '지원', '초대'
  count: number;
}

/**
 * 숨기기/숨김해제 확인 다이얼로그
 */
export default function HideConfirmDialog({
  open,
  onClose,
  onConfirm,
  action,
  itemType,
  count,
}: HideConfirmDialogProps) {
  const title = action === 'hide' ? '항목 숨기기' : '숨김 해제';
  const message =
    action === 'hide'
      ? `선택한 ${count}개의 ${itemType}을(를) 숨기시겠어요? 숨긴 항목은 '숨긴 항목' 토글을 켜면 다시 볼 수 있어요.`
      : `선택한 ${count}개의 ${itemType} 숨김을 해제하시겠어요?`;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          취소
        </Button>
        <Button onClick={onConfirm} variant="contained" autoFocus>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}
