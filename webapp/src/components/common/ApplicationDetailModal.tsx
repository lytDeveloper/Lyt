import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  useTheme
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import type { ApplicationDetail } from '../../types/application';

interface ApplicationDetailModalProps {
  open: boolean;
  onClose: () => void;
  application: ApplicationDetail | null;
  type: 'project' | 'collaboration';
}

export default function ApplicationDetailModal({
  open,
  onClose,
  application,
  type
}: ApplicationDetailModalProps) {
  const theme = useTheme();
  if (!application) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: '16px' }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          지원서 상세
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Activity Info */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            지원한 {type === 'project' ? '프로젝트' : '협업'}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {application.activityTitle}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Applicant Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar
            src={application.applicant.profileImageUrl}
            alt={application.applicant.name}
            sx={{ width: 56, height: 56 }}
          />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {application.applicant.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {application.applicant.job || '직군 미설정'}
            </Typography>
          </Box>
          <Chip
            label={application.status.toUpperCase()}
            size="small"
            color={application.status === 'accepted' ? 'success' : application.status === 'rejected' ? 'error' : 'default'}
            sx={{ ml: 'auto' }}
          />
        </Box>

        {/* Cover Letter */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            자기소개
          </Typography>
          <Box sx={{
            bgcolor: theme.palette.grey[50],
            p: 2,
            borderRadius: 2,
            minHeight: 100,
            whiteSpace: 'pre-wrap',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: theme.palette.text.secondary
          }}>
            {application.coverLetter}
          </Box>
        </Box>

        {/* Portfolio Links */}
        {application.portfolioLinks && application.portfolioLinks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              포트폴리오
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {application.portfolioLinks.map((link, idx) => (
                <Box
                  key={idx}
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <LaunchIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.primary.main }} noWrap>
                      {link.url}
                    </Typography>
                    {link.description && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {link.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Resume URL */}
        {application.resumeUrl && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              이력서 / 파일
            </Typography>
            <Button
              component="a"
              href={application.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={<LaunchIcon />}
              fullWidth
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              이력서 보기
            </Button>
          </Box>
        )}

        {/* Additional Info */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          {application.availability && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                가능 시간
              </Typography>
              <Typography variant="body2">
                {application.availability}
              </Typography>
            </Box>
          )}
          {application.duration && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                예상 기간
              </Typography>
              <Typography variant="body2">
                {application.duration}
              </Typography>
            </Box>
          )}
        </Box>

      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ height: 48, borderRadius: '12px', bgcolor: theme.palette.primary.main }}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}
