import { Box, Skeleton, styled } from '@mui/material';

const SkeletonCard = styled(Box)({
  display: 'flex',
  gap: 12,
  padding: '16px 20px',
  backgroundColor: '#fff',
});

const ImageSkeleton = styled(Skeleton)({
  width: 120,
  height: 120,
  borderRadius: 8,
  flexShrink: 0,
});

const ContentSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  justifyContent: 'space-between',
});

export default function FeaturedMagazineSkeleton() {
  return (
    <SkeletonCard>
      <ImageSkeleton variant="rectangular" animation="wave" />
      <ContentSection>
        <Box>
          <Skeleton variant="rounded" width={60} height={20} sx={{ mb: 1 }} animation="wave" />
          <Skeleton variant="text" width="100%" height={24} animation="wave" />
          <Skeleton variant="text" width="80%" height={24} animation="wave" />
          <Skeleton variant="text" width="90%" height={18} sx={{ mt: 0.5 }} animation="wave" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={50} height={16} animation="wave" />
          <Skeleton variant="rounded" width={50} height={16} animation="wave" />
          <Skeleton variant="rounded" width={50} height={16} animation="wave" />
        </Box>
      </ContentSection>
    </SkeletonCard>
  );
}
