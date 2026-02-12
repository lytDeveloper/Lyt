import { Box, Skeleton, styled } from '@mui/material';

const SkeletonCard = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#fff',
  overflow: 'hidden',
});

const ImageSkeleton = styled(Skeleton)({
  width: '100%',
  height: 180,
  borderRadius: 0,
});

const ContentSection = styled(Box)({
  padding: '12px 16px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const MetaRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
});

export default function MagazineSkeleton() {
  return (
    <SkeletonCard>
      <ImageSkeleton variant="rectangular" animation="wave" />
      <ContentSection>
        <Skeleton variant="rounded" width={60} height={18} animation="wave" />
        <Skeleton variant="text" width="100%" height={22} animation="wave" />
        <Skeleton variant="text" width="85%" height={22} animation="wave" />
        <Skeleton variant="text" width="95%" height={16} sx={{ mt: 0.5 }} animation="wave" />
        <Skeleton variant="text" width="70%" height={16} animation="wave" />

        <MetaRow>
          <Skeleton variant="circular" width={24} height={24} animation="wave" />
          <Skeleton variant="text" width={80} height={14} animation="wave" />
          <Skeleton variant="text" width={60} height={14} animation="wave" />
        </MetaRow>
      </ContentSection>
    </SkeletonCard>
  );
}
