import { useState } from 'react';
import { Box, Typography, Button, Checkbox, styled } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import MagazineCard from '../../components/lounge/MagazineCard';
import MagazineSkeleton from '../../components/lounge/MagazineSkeleton';
import { magazineService } from '../../services/magazineService';
import { useAuth } from '../../providers/AuthContext';
import type { MagazineListItem } from '../../types/magazine.types';

// Styled Components
const PageContainer = styled(Box)({
  minHeight: '100vh',
  backgroundColor: '#fff',
  paddingBottom: BOTTOM_NAV_HEIGHT + 20,
});

const ContentContainer = styled(Box)({
  marginTop: '12px',
  padding: '0 20px',
});

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  fontWeight: 700,
  color: theme.palette.text.primary,
  marginBottom: 8,
}));

const PageSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
  marginBottom: 24,
}));

const SectionHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
});

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 16,
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

const CountText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
}));

const ManageButton = styled(Button)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.primary.main,
  padding: '4px 12px',
  borderRadius: 16,
  textTransform: 'none',
  minWidth: 'auto',
}));

const DeleteButton = styled(Button)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.error.main,
  padding: '4px 12px',
  borderRadius: 16,
  textTransform: 'none',
  minWidth: 'auto',
  '&.Mui-disabled': {
    color: theme.palette.text.disabled,
  },
}));

const CancelButton = styled(Button)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.secondary,
  padding: '4px 12px',
  borderRadius: 16,
  textTransform: 'none',
  minWidth: 'auto',
}));

const ArticlesContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  width: '100%',
});

const EmptyState = styled(Box)(({ theme }) => ({
  padding: 60,
  textAlign: 'center',
  color: theme.palette.text.secondary,
  fontSize: 14,
}));

// 관리 모드에서 체크박스를 카드 위에 오버레이로 표시
const CardWrapper = styled(Box)({
  position: 'relative',
  width: '87vw',
});

const CheckboxOverlay = styled(Box)({
  position: 'absolute',
  top: 8,
  left: 8,
  zIndex: 10,
});

export default function BookmarkManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 관리 모드 상태
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 북마크된 매거진 목록 조회
  const { data: bookmarkedMagazines = [], isLoading } = useQuery({
    queryKey: ['bookmarkedMagazines', user?.id],
    queryFn: () => magazineService.getBookmarkedMagazines(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 북마크 개수 조회
  const { data: bookmarkCount = 0 } = useQuery({
    queryKey: ['bookmarkCount', user?.id],
    queryFn: () => magazineService.getBookmarkCount(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // 북마크 삭제 mutation
  const removeBookmarksMutation = useMutation({
    mutationFn: (magazineIds: string[]) =>
      magazineService.removeBookmarks(magazineIds, user!.id),
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['bookmarkedMagazines', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['bookmarkCount', user?.id] });
      // 상태 초기화
      setSelectedIds(new Set());
      setIsManageMode(false);
    },
  });

  // 뒤로가기
  const handleBack = () => {
    navigate(-1);
  };

  // 관리 모드 토글
  const handleToggleManageMode = () => {
    if (isManageMode) {
      // 관리 모드 종료 시 선택 초기화
      setSelectedIds(new Set());
    }
    setIsManageMode(!isManageMode);
  };

  // 개별 항목 선택/해제
  const handleToggleSelect = (magazineId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 방지
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(magazineId)) {
        newSet.delete(magazineId);
      } else {
        newSet.add(magazineId);
      }
      return newSet;
    });
  };

  // 선택된 항목 삭제
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    removeBookmarksMutation.mutate(Array.from(selectedIds));
  };

  return (
    <PageContainer>
      {/* Header with back button */}
      <Header showBackButton onBackClick={handleBack} />

      <ContentContainer>
        <PageTitle>북마크 관리</PageTitle>
        <PageSubtitle>매거진에서 저장한 북마크를 관리하세요</PageSubtitle>

        {/* Section Header */}
        <SectionHeader>
          <SectionTitle>전체 아티클</SectionTitle>
          <CountText>{bookmarkCount}개</CountText>
        </SectionHeader>

        {/* 관리/삭제/취소 버튼 영역 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
          {isManageMode ? (
            <>
              <DeleteButton
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0 || removeBookmarksMutation.isPending}
              >
                삭제
              </DeleteButton>
              <CancelButton onClick={handleToggleManageMode}>
                취소
              </CancelButton>
            </>
          ) : (
            <ManageButton onClick={handleToggleManageMode}>
              관리
            </ManageButton>
          )}
        </Box>

        {/* Articles List */}
        {isLoading ? (
          <ArticlesContainer>
            <MagazineSkeleton />
            <MagazineSkeleton />
            <MagazineSkeleton />
            <MagazineSkeleton />
          </ArticlesContainer>
        ) : bookmarkedMagazines.length > 0 ? (
          <ArticlesContainer>
            {bookmarkedMagazines.map((magazine: MagazineListItem) => (
              <CardWrapper key={magazine.id}>
                {isManageMode && (
                  <CheckboxOverlay onClick={(e) => handleToggleSelect(magazine.id, e)}>
                    <Checkbox
                      checked={selectedIds.has(magazine.id)}
                      sx={{
                        p: 0,
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '50%',
                      }}
                    />
                  </CheckboxOverlay>
                )}
                <MagazineCard magazine={magazine} />
              </CardWrapper>
            ))}
          </ArticlesContainer>
        ) : (
          <EmptyState>북마크한 아티클이 없어요.</EmptyState>
        )}
      </ContentContainer>

      <BottomNavigationBar />
    </PageContainer>
  );
}
