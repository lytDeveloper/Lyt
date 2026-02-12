import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  useTheme
} from '@mui/material';
import { LightningLoader } from './index';
import CloseIcon from '@mui/icons-material/Close';
import AddLinkIcon from '@mui/icons-material/AddLink';
import type { ApplicationForm, PortfolioLink } from '../../types/application';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

interface ApplicationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: ApplicationForm) => Promise<void>;
  title: string; // "프로젝트 참여하기" or "협업 참여하기"
  activityTitle: string;
}

export default function ApplicationModal({
  open,
  onClose,
  onSubmit,
  title,
  activityTitle
}: ApplicationModalProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [availableTime, setAvailableTime] = useState('');

  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    setPortfolioLinks([...portfolioLinks, { url: newLinkUrl, description: newLinkDesc }]);
    setNewLinkUrl('');
    setNewLinkDesc('');
  };

  const handleRemoveLink = (index: number) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!coverLetter.trim()) {
      alert('자기소개를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        coverLetter,
        resumeUrl,
        portfolioLinks,
        availableTime
      });
      // Clear form
      setCoverLetter('');
      setResumeUrl('');
      setAvailableTime('');
      setPortfolioLinks([]);
      onClose();
    } catch (error) {
      console.error(error);
      alert('지원하기 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: '16px' }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 280 }}>
            {activityTitle}
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={loading}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Cover Letter */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              자기소개 <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              multiline
              rows={6}
              fullWidth
              placeholder="간단한 자기소개와 지원 동기를 적어주세요."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              disabled={loading}
              sx={{
                bgcolor: theme.palette.grey[50], backgroundColor: theme.palette.background.paper,
                '& .MuiOutlinedInput-root': { borderRadius: 3 }
              }}
            />
          </Box>

          {/* Portfolio Links */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              포트폴리오 링크
            </Typography>

            {/* List of added links */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              {portfolioLinks.map((link, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5, py: 0.8,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 3,
                    bgcolor: theme.palette.grey[50]
                  }}
                >
                  <Box sx={{ overflow: 'hidden', flex: 1, mr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{link.url}</Typography>
                    {link.description && (
                      <Typography variant="caption" color="text.secondary" noWrap>{link.description}</Typography>
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => handleRemoveLink(idx)} disabled={loading}>
                    <CloseRoundedIcon sx={{ fontSize: 18, color: theme.palette.icon.default }} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {/* Add new link input */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3
                    }
                  }}
                  size="small"
                  placeholder="URL (https://...)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  disabled={loading}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><AddLinkIcon sx={{ fontSize: 18, color: theme.palette.icon.inner }} /></InputAdornment>
                  }}
                />
                <TextField
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3
                    }
                  }}
                  size="small"
                  placeholder="설명 (선택사항)"
                  value={newLinkDesc}
                  onChange={(e) => setNewLinkDesc(e.target.value)}
                  disabled={loading}
                  fullWidth
                />
              </Box>
              <Button
                variant="outlined"
                onClick={handleAddLink}
                disabled={loading || !newLinkUrl}
                sx={{
                  height: 30,
                  minWidth: 50,
                  borderRadius: 4,
                  mt: 0.5,
                  border: 'none',
                  backgroundColor: newLinkUrl ? theme.palette.primary.main : theme.palette.divider,
                  color: newLinkUrl
                    ? theme.palette.primary.contrastText
                    : (theme.palette.subText?.default ?? theme.palette.text.secondary),
                  '&.Mui-disabled': {
                    backgroundColor: theme.palette.divider,
                    color: theme.palette.subText?.default ?? theme.palette.text.secondary,
                    border: 'none',

                  }
                }}
              >
                추가
              </Button>
            </Box>
          </Box>

          {/* Resume URL */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              이력서 / 파일 링크
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Google Drive, Dropbox 등 공유 링크"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              disabled={loading}
              sx={{ backgroundColor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
          </Box>

          {/* Availability (Optional) */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              가능 시간 / 기간 (선택)
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="예: 주 20시간, 평일 저녁 가능"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
              disabled={loading}
              sx={{ backgroundColor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-around' }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: theme.palette.text.secondary, backgroundColor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: 3 }, height: 40, width: '44%', borderRadius: '22px', border: '1px solid', borderColor: theme.palette.divider }}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            height: 40,
            width: '44%',
            borderRadius: '22px',
            bgcolor: theme.palette.primary.main,
          }}
        >
          {loading ? <LightningLoader size={20} color="inherit" /> : '지원하기'}
        </Button>
      </DialogActions>
    </Dialog >
  );
}
