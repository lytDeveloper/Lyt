import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  IconButton,
  Divider,
  Link,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DescriptionIcon from '@mui/icons-material/Description';
import type { ProjectApplication } from '../../services/projectService';
import type { CollaborationApplication } from '../../services/collaborationService';
import { getCategoryLabel } from '../../constants/projectConstants';

type PortfolioLinkItem = string | { url: string; description?: string | null };

interface ApplicationDetailModalProps {
  open: boolean;
  onClose: () => void;
  application: ProjectApplication | CollaborationApplication | null;
  type: 'project' | 'collaboration';
  mode: 'sent' | 'received'; // sent: 파트너가 보낸 지원, received: 브랜드/협업장이 받은 지원
  onWithdraw?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onShortlist?: (id: string, shortlist: boolean) => void;
}

export default function ApplicationDetailModal({
  open,
  onClose,
  application,
  type: _type,
  mode,
  onWithdraw,
  onAccept,
  onReject,
  onShortlist,
}: ApplicationDetailModalProps) {
  const theme = useTheme();
  if (!application) return null;

  const portfolioLinks = (application.portfolioLinks as unknown as PortfolioLinkItem[] | undefined)
    ?.map((link) => {
      if (!link) return null;
      if (typeof link === 'string') {
        const url = link.trim();
        return url ? { url, description: null } : null;
      }
      if (typeof link === 'object' && typeof (link as any).url === 'string') {
        const url = String((link as any).url).trim();
        const description =
          (link as any).description === undefined || (link as any).description === null
            ? null
            : String((link as any).description);
        return url ? { url, description } : null;
      }
      return null;
    })
    .filter((v): v is { url: string; description: string | null } => v !== null) ?? [];

  const isPending = application.status === 'pending' || application.status === 'reviewed';
  const isShortlisted = application.status === 'shortlisted' || ('isShortlisted' in application && application.isShortlisted);

  // Type guard for ProjectApplication
  const isProjectApp = (app: ProjectApplication | CollaborationApplication): app is ProjectApplication => {
    return 'projectId' in app;
  };

  const getStatusChip = () => {
    const statusConfig: Record<string, { label: string; bgcolor: string; color: string }> = {
      pending: { label: '검토중', bgcolor: '#EFF6FF', color: '#2563EB' },
      reviewed: { label: '검토됨', bgcolor: '#F3F4F6', color: '#4B5563' },
      shortlisted: { label: '관심', bgcolor: '#FEF3C7', color: '#D97706' },
      accepted: { label: '합격', bgcolor: '#ECFDF5', color: '#059669' },
      rejected: { label: '불합격', bgcolor: '#FEF2F2', color: '#DC2626' },
      withdrawn: { label: '취소됨', bgcolor: '#F3F4F6', color: '#4B5563' },
    };
    const config = statusConfig[application.status] || statusConfig.pending;
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{ bgcolor: config.bgcolor, color: config.color, fontWeight: 600 }}
      />
    );
  };

  const getTitle = () => {
    if (isProjectApp(application)) {
      return application.project?.title || '프로젝트';
    }
    return (application as CollaborationApplication).collaboration?.title || '협업';
  };

  const getSubtitle = () => {
    if (isProjectApp(application)) {
      return application.project?.brandName;
    }
    return undefined;
  };

  const getCoverImage = () => {
    if (isProjectApp(application)) {
      // Check both camelCase and snake_case properties to handle different API responses
      return application.project?.coverImage || (application.project as any)?.cover_image_url;
    }
    // Collaboration cover image
    return (application as CollaborationApplication).collaboration?.coverImageUrl;
  };

  const getCategory = (): string | undefined => {
    if (isProjectApp(application)) {
      const cat = application.project?.category;
      return cat ? getCategoryLabel(cat) : undefined;
    }
    const cat = (application as CollaborationApplication).collaboration?.category;
    return cat ? getCategoryLabel(cat) : undefined;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', maxHeight: '70vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          {mode === 'sent' ? '보낸 지원 상세' : '받은 지원 상세'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Activity Info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#F9FAFB', borderRadius: '12px' }}>
          {getCoverImage() && (
            <Box
              component="img"
              src={getCoverImage()}
              alt={getTitle()}
              sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '8px', mb: 1.5 }}
            />
          )}
          {getSubtitle() && (
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 0.5 }}>
              {getSubtitle()}
            </Typography>
          )}
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.primary }}>
            {getTitle()}
          </Typography>
          {getCategory() && (
            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 0.5 }}>
              카테고리: {getCategory()}
            </Typography>
          )}
        </Box>

        {/* Applicant Info (for received applications) */}
        {mode === 'received' && application.applicant && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Avatar
              src={application.applicant.avatarUrl}
              sx={{ width: 48, height: 48 }}
            />
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: theme.palette.text.primary }}>
                {application.applicant.name}
              </Typography>
              {application.applicant.activityField && (
                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                  {application.applicant.activityField}
                </Typography>
              )}
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
              {onShortlist && (isPending || isShortlisted) && (
                <Button
                  size="small"
                  variant={isShortlisted ? 'contained' : 'outlined'}
                  onClick={() => onShortlist(application.id, !isShortlisted)}
                  sx={{
                    fontSize: 11,
                    minWidth: 'auto',
                    px: 1,
                    bgcolor: isShortlisted ? '#F59E0B' : 'transparent',
                    borderColor: '#F59E0B',
                    color: isShortlisted ? '#fff' : '#F59E0B',
                  }}
                >
                  {isShortlisted ? '⭐ 관심' : '☆ 관심'}
                </Button>
              )}
              {getStatusChip()}
            </Box>
          </Box>
        )}

        {/* Status for sent applications */}
        {mode === 'sent' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            {getStatusChip()}
          </Box>
        )}

        {/* Cover Letter */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
            자기소개
          </Typography>
          {application.coverLetter ? (
            <Box sx={{ p: 1.5, bgcolor: '#F3F4F6', borderRadius: '8px' }}>
              <Typography sx={{ fontSize: 14, color: theme.palette.text.primary, whiteSpace: 'pre-wrap' }}>
                {application.coverLetter}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary }}>
              자기소개가 없어요.
            </Typography>
          )}
        </Box>

        {/* Additional Info */}
        {(application.budgetRange || application.duration || application.availability) && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
              추가 정보
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {application.budgetRange && (
                <Box>
                  <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>희망 예산</Typography>
                  <Typography sx={{ fontSize: 14 }}>{application.budgetRange}</Typography>
                </Box>
              )}
              {application.duration && (
                <Box>
                  <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>희망 기간</Typography>
                  <Typography sx={{ fontSize: 14 }}>{application.duration}</Typography>
                </Box>
              )}
              {application.availability && (
                <Box>
                  <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>참여 가능 시간</Typography>
                  <Typography sx={{ fontSize: 14 }}>{application.availability}</Typography>
                </Box>
              )}
              {application.experienceYears !== undefined && (
                <Box>
                  <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>경력</Typography>
                  <Typography sx={{ fontSize: 14 }}>{application.experienceYears}년</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Skills */}
        {application.skills && application.skills.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
              보유 스킬
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {application.skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  size="small"
                  sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontSize: 12 }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Portfolio Links */}
        {portfolioLinks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
              포트폴리오
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {portfolioLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: 13,
                    color: '#2563EB',
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                  {link.description ? `${link.description} (${link.url})` : link.url}
                </Link>
              ))}
            </Box>
          </Box>
        )}

        {/* Resume */}
        {application.resumeUrl && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: theme.palette.text.primary, mb: 1 }}>
              이력서
            </Typography>
            <Link
              href={application.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: 13,
                color: '#2563EB',
              }}
            >
              <DescriptionIcon sx={{ fontSize: 16 }} />
              이력서 보기
            </Link>
          </Box>
        )}

        {/* Reviewer Note (only for received applications) */}
        {mode === 'received' && 'reviewerNote' in application && application.reviewerNote && (
          <Box sx={{ mb: 3, p: 1.5, bgcolor: '#FFF7ED', borderRadius: '8px', border: '1px solid #FDBA74' }}>
            <Typography sx={{ fontSize: 12, color: '#C2410C', mb: 0.5 }}>📝 내 메모</Typography>
            <Typography sx={{ fontSize: 14, color: '#9A3412' }}>{application.reviewerNote}</Typography>
          </Box>
        )}

        {/* Rejection Reason */}
        {application.status === 'rejected' && application.rejectionReason && (
          <Box sx={{ p: 1.5, bgcolor: '#FEF2F2', borderRadius: '8px' }}>
            <Typography sx={{ fontSize: 12, color: '#991B1B', mb: 0.5 }}>거절 사유</Typography>
            <Typography sx={{ fontSize: 14, color: '#7F1D1D' }}>{application.rejectionReason}</Typography>
          </Box>
        )}

        {/* Date Info */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E5E7EB' }}>
          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
            지원일: {new Date(application.appliedDate).toLocaleDateString()}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {mode === 'sent' && (isPending || application.status === 'shortlisted') && onWithdraw && (
          <>
            <Button onClick={onClose} sx={{ color: theme.palette.text.secondary }}>
              닫기
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => onWithdraw(application.id)}
              sx={{ borderRadius: '24px' }}
            >
              지원 취소
            </Button>
          </>
        )}
        {mode === 'received' && (isPending || isShortlisted) && (
          <>
            <Button onClick={onClose} sx={{ color: theme.palette.text.secondary }}>
              닫기
            </Button>
            {onReject && (
              <Button
                variant="outlined"
                onClick={() => onReject(application.id)}
                sx={{ borderColor: '#E5E7EB', color: theme.palette.text.secondary, borderRadius: '24px' }}
              >
                거절하기
              </Button>
            )}
            {onAccept && (
              <Button
                variant="contained"
                onClick={() => onAccept(application.id)}
                sx={{ bgcolor: '#2563EB', boxShadow: 'none', borderRadius: '24px' }}
              >
                수락하기
              </Button>
            )}
          </>
        )}
        {!isPending && !isShortlisted && (
          <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#2563EB', boxShadow: 'none', borderRadius: '24px' }}>
            닫기
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}









