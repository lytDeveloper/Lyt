import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPartnerById, type Partner } from '../../services/exploreService';
import PartnerDetailContent from '../../components/explore/PartnerDetailContent';
import { addRecentlyViewed, addRecentlyViewedToServer } from '../../services/recentViewsService';
import { useAuth } from '../../providers/AuthContext';

export default function ExplorePartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadPartner = async () => {
      try {
        setLoading(true);
        const partnerData = await getPartnerById(id);
        setPartner(partnerData || null);

        // 최근 본 파트너에 기록
        if (partnerData) {
          const viewItem = {
            id: partnerData.id,
            type: 'partner' as const,
            title: partnerData.name,
            image: partnerData.profileImageUrl,
            subtitle: partnerData.role === 'brand'
              ? `브랜드 • ${partnerData.category || ''}`
              : partnerData.role === 'artist'
                ? `아티스트 • ${partnerData.activityField || ''}`
                : `크리에이티브 • ${partnerData.activityField || ''}`,
          };
          addRecentlyViewed(viewItem);
          if (user?.id) {
            addRecentlyViewedToServer(user.id, viewItem).catch((err) => {
              console.error('[ExplorePartnerDetail] Failed to save recently viewed to server:', err);
            });
          }
        }
      } catch (error) {
        console.error('[ExplorePartnerDetail] Failed to load partner:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPartner();
  }, [id, user?.id]);

  return (
    <PartnerDetailContent
      partner={partner}
      loading={loading}
      onClose={() => navigate('/explore')}
      showBottomNavigation
    />
  );
}
