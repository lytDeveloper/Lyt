import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function DownloadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('다운로드 토큰이 없습니다.');
      return;
    }

    // 다운로드 URL 설정
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const url = `${supabaseUrl}/functions/v1/download-digital-product?token=${token}`;
    setDownloadUrl(url);
    setStatus('success');
  }, [token]);

  const handleDownload = async () => {
    if (!downloadUrl) return;

    setStatus('loading');
    try {
      // 파일 다운로드
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `다운로드 실패 (${response.status})`);
      }

      // Blob으로 변환
      const blob = await response.blob();

      // Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // 다운로드 트리거
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setStatus('success');
    } catch (error) {
      console.error('[DownloadPage] Download failed:', error);
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.'
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F9FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          {status === 'loading' && (
            <>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                다운로드 준비 중...
              </Typography>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                잠시만 기다려주세요.
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'white' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                다운로드 준비 완료
              </Typography>
              <Typography variant="body1" sx={{ color: '#6B7280', mb: 4 }}>
                아래 버튼을 클릭하여 파일을 다운로드하세요.
              </Typography>

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{
                  py: 1.5,
                  fontSize: '16px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b3f8f 100%)',
                  },
                }}
              >
                다운로드
              </Button>

              <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  📌 안내사항
                </Typography>
                <Typography variant="caption" component="div">
                  • 다운로드 링크는 30일간 유효합니다.
                </Typography>
                <Typography variant="caption" component="div">
                  • 만료 후에는 재다운로드가 불가능합니다.
                </Typography>
                <Typography variant="caption" component="div">
                  • 문의사항은 고객센터로 연락해주세요.
                </Typography>
              </Alert>
            </>
          )}

          {status === 'error' && (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 48, color: 'white' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                다운로드 실패
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMessage || '알 수 없는 오류가 발생했습니다.'}
              </Alert>

              <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
                다음 사항을 확인해주세요:
              </Typography>
              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="caption" component="div" sx={{ color: '#6B7280' }}>
                  • 다운로드 링크가 만료되지 않았는지 확인
                </Typography>
                <Typography variant="caption" component="div" sx={{ color: '#6B7280' }}>
                  • 결제가 정상적으로 완료되었는지 확인
                </Typography>
                <Typography variant="caption" component="div" sx={{ color: '#6B7280' }}>
                  • 이메일에서 올바른 링크를 클릭했는지 확인
                </Typography>
              </Box>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => window.location.href = 'https://app.lyt-app.io'}
              >
                홈으로 돌아가기
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
