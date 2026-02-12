import { Box, Typography } from '@mui/material';

interface PendingApprovalNoticeProps {
  status: 'pending' | 'rejected';
  description?: string;
}

export default function PendingApprovalNotice({
  status,
  description,
}: PendingApprovalNoticeProps) {
  const title =
    status === 'rejected' ? '브랜드 승인 거절됨' : '브랜드 승인 대기 중이에요.';
  const defaultDescription =
    status === 'rejected'
      ? '관리자 검토 결과 브랜드 승인이 거절되었어요. 자세한 내용은 관리자에게 문의해주세요.'
      : '관리자 승인 후 해당 기능을 이용하실 수 있어요. 승인 상태는 마이페이지에서 확인할 수 있어요.';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: 6,
        gap: 2,
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 15,
          color: 'text.secondary',
          lineHeight: 1.6,
          maxWidth: 360,
        }}
      >
        {description ?? defaultDescription}
      </Typography>
    </Box>
  );
}



















