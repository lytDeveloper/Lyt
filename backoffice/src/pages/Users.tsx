/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Card, Tabs, Table, Input, Space, Typography, Tag, Modal, Descriptions, Button, Radio, Select } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import { SearchOutlined } from '@ant-design/icons';
import { useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { checkIsAdmin } from '../utils/auth';
import { logAdminActivity } from '../utils/adminActivity';
import type { ProfileArtist, ProfileBrand, ProfileCreative, ProfileFan } from '../types/database.types';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import ImageWithReset from '../components/ImageWithReset';
import { getDefaultUrlFor } from '../config/images';
import { resetUserImage } from '../api/users';
import { deleteUserAccount } from '../services/accountDeletionService';

const { Title } = Typography;
const { Search } = Input;

export default function Users() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'artists');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState(searchParams.get('search') || '');
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  // 각 타입별 데이터
  const [artists, setArtists] = useState<ProfileArtist[]>([]);
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [creatives, setCreatives] = useState<ProfileCreative[]>([]);
  const [fans, setFans] = useState<ProfileFan[]>([]);

  // 상세 모달
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 제재 모달
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [banTargetProfileId, setBanTargetProfileId] = useState<string | null>(null);
  const [banDuration, setBanDuration] = useState<number | 'permanent' | null>(null);
  const [banLoading, setBanLoading] = useState(false);

  // 프로필 제재 상태 (profile_id -> banned_until)
  const [banStatuses, setBanStatuses] = useState<Record<string, string | null>>({});
  // 프로필 최근 접속일 (profile_id -> last_access)
  const [lastAccessMap, setLastAccessMap] = useState<Record<string, string | null>>({});

  const loadData = async (tab: string) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'artists':
          await loadArtists();
          break;
        case 'brands':
          await loadBrands();
          break;
        case 'creatives':
          await loadCreatives();
          break;
        case 'fans':
          await loadFans();
          break;
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (user: any) => {
    return (
      user?.artist_name ||
      user?.brand_name ||
      user?.nickname ||
      user?.username ||
      '사용자'
    );
  };



  const handleDeleteProfile = (
    profileType: 'artist' | 'brand' | 'creative' | 'fan',
    profileId?: string | null
  ) => {
    if (!profileId) {
      toast.error('프로필 ID를 확인할 수 없습니다.');
      return;
    }

    Modal.confirm({
      title: '계정 완전 삭제',
      content: (
        <div>
          <p>
            <strong>경고:</strong> 이 작업은 되돌릴 수 없습니다.
          </p>
          <p>다음 데이터가 영구적으로 삭제됩니다:</p>
          <ul>
            <li>모든 프로필 정보</li>
            <li>프로젝트 및 협업</li>
            <li>메시지 및 알림</li>
            <li>팔로우/좋아요/북마크</li>
            <li>배지 및 활동 기록</li>
            <li>인증 계정 (auth.users)</li>
          </ul>
          <p>정말 삭제하시겠습니까?</p>
        </div>
      ),
      okText: '완전 삭제',
      okType: 'danger',
      cancelText: '취소',
      width: 520,
      async onOk() {
        try {
          const displayName = getDisplayName(selectedUser);

          // Edge Function 호출하여 완전 삭제
          const result = await deleteUserAccount(profileId);

          if (!result.success) {
            throw new Error(result.error || '계정 삭제에 실패했습니다.');
          }

          // 활동 로그 기록
          if (currentAdminId) {
            try {
              await logAdminActivity(currentAdminId, 'account_delete', null, {
                profile_id: profileId,
                profile_type: profileType,
                user_tab: activeTab,
                display_name: displayName,
                deleted_data: result.deletedData,
              });
            } catch (logError) {
              console.error('활동 로그 기록 실패:', logError);
              // 로그 실패는 무시하고 계속 진행
            }
          }

          toast.success('계정이 완전히 삭제되었습니다.');
          if (selectedUser?.profile_id === profileId) {
            setDetailModalVisible(false);
            setSelectedUser(null);
          }
          loadData(activeTab);
        } catch (error) {
          console.error('계정 삭제 실패:', error);
          const errorMessage = error instanceof Error ? error.message : '계정 삭제에 실패했습니다.';
          toast.error(errorMessage);
          throw error;
        }
      },
    });
  };

  // 프로필 제재 상태 및 최근 접속일 로드
  const loadBanStatuses = async (profileIds: string[]) => {
    if (profileIds.length === 0) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, banned_until, last_access')
      .in('id', profileIds);

    if (!error && data) {
      const statuses: Record<string, string | null> = {};
      const accessMap: Record<string, string | null> = {};
      data.forEach((profile) => {
        statuses[profile.id] = profile.banned_until;
        accessMap[profile.id] = profile.last_access;
      });
      setBanStatuses((prev) => ({ ...prev, ...statuses }));
      setLastAccessMap((prev) => ({ ...prev, ...accessMap }));
    }
  };

  const loadArtists = async () => {
    const { data, error } = await supabase
      .from('profile_artists')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setArtists(data);
      // 제재 상태 로드
      await loadBanStatuses(data.map((a) => a.profile_id));
    }
  };

  const loadBrands = async () => {
    const { data, error } = await supabase
      .from('profile_brands')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBrands(data);
      await loadBanStatuses(data.map((b) => b.profile_id));
    }
  };

  const loadCreatives = async () => {
    const { data, error } = await supabase
      .from('profile_creatives')
      .select(`
        *,
        profiles(nickname)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // profile_creatives 테이블의 nickname(크리에이티브 닉네임)을 우선 사용
      // 없을 경우에만 profiles 테이블의 nickname(SSO 닉네임)을 fallback으로 사용
      const creativesWithNickname = data.map((creative: any) => ({
        ...creative,
        nickname: creative.nickname || creative.profiles?.nickname || null
      }));
      setCreatives(creativesWithNickname);
      await loadBanStatuses(creativesWithNickname.map((c) => c.profile_id));
    }
  };

  const loadFans = async () => {
    const { data, error } = await supabase
      .from('profile_fans')
      .select(`
        *,
        profiles(nickname)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // profiles 테이블의 nickname을 profile_fans 객체에 병합
      // profile_fans.profile_id = profiles.id 관계를 통해 조인
      const fansWithNickname = data.map((fan: any) => ({
        ...fan,
        nickname: fan.profiles?.nickname || null
      }));
      setFans(fansWithNickname);
      await loadBanStatuses(fansWithNickname.map((f) => f.profile_id));
    }
  };

  // 초기 마운트 시 모든 탭의 데이터를 한 번에 로드
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const admin = await checkIsAdmin();
        setCurrentAdminId(admin?.profile_id ?? null);
        await Promise.all([
          loadArtists(),
          loadBrands(),
          loadCreatives(),
          loadFans(),
        ]);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  // activeTab 변경 시 해당 탭 데이터만 다시 로드 (선택적)
  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  // location.state가 변경될 때도 탭 업데이트
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // 쿼리 파라미터에서 search 값 읽기
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchText(searchParam);
      // 검색어가 있으면 검색 실행 (자동으로 필터링됨)
    }
  }, [searchParams]);

  const showDetailModal = (user: any) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
  };

  const showBanModal = (profileId: string) => {
    setBanTargetProfileId(profileId);
    setBanDuration(null);
    setBanModalVisible(true);
  };

  const handleBan = async () => {
    if (!banTargetProfileId || banDuration === null) {
      toast.warning('제재 기간을 선택해주세요.');
      return;
    }

    setBanLoading(true);
    try {
      let bannedUntil: string;

      if (banDuration === 'permanent') {
        // 영구 제재: 99년 후 날짜
        bannedUntil = new Date('2099-12-31T23:59:59Z').toISOString();
      } else {
        // 일시적 제재: 현재 날짜 + 선택한 일수
        const date = new Date();
        date.setDate(date.getDate() + banDuration);
        bannedUntil = date.toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update({ banned_until: bannedUntil })
        .eq('id', banTargetProfileId);

      if (error) throw error;

      toast.success('제재가 적용되었습니다.');
      if (currentAdminId) {
        await logAdminActivity(currentAdminId, 'user_ban', null, {
          profile_id: banTargetProfileId,
          banned_until: bannedUntil,
          duration_days: banDuration === 'permanent' ? 'permanent' : banDuration,
          user_tab: activeTab,
        });
      }
      setBanModalVisible(false);
      setBanTargetProfileId(null);
      setBanDuration(null);

      // 제재 상태 업데이트
      setBanStatuses((prev) => ({
        ...prev,
        [banTargetProfileId]: bannedUntil,
      }));

      // 데이터 다시 로드
      loadData(activeTab);
    } catch (error) {
      console.error('제재 적용 실패:', error);
      toast.error('제재 적용에 실패했습니다.');
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnban = async (profileId: string) => {
    if (!window.confirm('정말로 제재를 해제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ banned_until: null })
        .eq('id', profileId);

      if (error) throw error;

      toast.success('제재가 해제되었습니다.');
      if (currentAdminId) {
        await logAdminActivity(currentAdminId, 'user_unban', null, {
          profile_id: profileId,
          user_tab: activeTab,
        });
      }

      // 제재 상태 업데이트
      setBanStatuses((prev) => ({
        ...prev,
        [profileId]: null,
      }));

      // 데이터 다시 로드
      loadData(activeTab);
    } catch (error) {
      console.error('제재 해제 실패:', error);
      toast.error('제재 해제에 실패했습니다.');
    }
  };

  const handleResetImage = async (
    type: 'artist' | 'brand' | 'creative',
    field: 'cover_image_url' | 'logo_image_url' | 'profile_image_url'
  ) => {
    if (!selectedUser) return;
    if (!window.confirm('이 이미지를 기본 이미지로 초기화할까요?')) return;

    const rowValue = selectedUser.profile_id;
    if (!rowValue) {
      toast.error('사용자 식별자를 확인할 수 없습니다.');
      return;
    }

    const idColumn = 'profile_id';
    const defaultUrl = getDefaultUrlFor(field);
    if (!defaultUrl) {
      toast.error('기본 이미지 경로가 설정되어 있지 않습니다. 환경변수를 확인해주세요.');
      return;
    }
    const { error } = await resetUserImage({ type, idColumn, rowValue, field, url: defaultUrl });

    if (error) {
      toast.error('이미지 초기화에 실패했습니다.');
      return;
    }

    toast.success('이미지를 기본값으로 초기화했습니다.');

    setSelectedUser((prev: any) => {
      if (!prev) return prev;
      return { ...prev, [field]: defaultUrl };
    });

    await loadData(activeTab);
  };

  const getBanStatus = (profileId: string) => {
    const bannedUntil = banStatuses[profileId];
    if (!bannedUntil) return null;

    const banDate = new Date(bannedUntil);
    const now = new Date();
    const permanentBanDate = new Date('2099-12-31T23:59:59Z');

    if (banDate.getTime() >= permanentBanDate.getTime()) {
      return { type: 'permanent', text: '영구 제재' };
    }

    if (banDate > now) {
      return { type: 'active', text: `제재 중 (${dayjs(bannedUntil).format('YYYY-MM-DD')}까지)` };
    }

    return { type: 'expired', text: '제재 만료' };
  };

  // 검색 필터링 함수
  const getFilteredArtists = () => {
    if (!searchText) return artists;
    return artists.filter(artist =>
      artist.artist_name?.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const getFilteredBrands = () => {
    if (!searchText) return brands;
    return brands.filter(brand =>
      brand.brand_name?.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const getFilteredCreatives = () => {
    if (!searchText) return creatives;
    return creatives.filter(creative =>
      creative.nickname?.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const getFilteredFans = () => {
    if (!searchText) return fans;
    return fans.filter(fan =>
      fan.nickname?.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  // 아티스트 컬럼
  const artistColumns = [
    {
      title: '아티스트명',
      dataIndex: 'artist_name',
      key: 'artist_name',
      sorter: (a: ProfileArtist, b: ProfileArtist) => (a.artist_name || '').localeCompare(b.artist_name || ''),
    },
    {
      title: '활동 분야',
      dataIndex: 'activity_field',
      key: 'activity_field',
      filters: [],
      onFilter: (value: React.Key | boolean, record: ProfileArtist) => {
        if (!value) return true;
        return record.activity_field === String(value);
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => {
        const uniqueFields = Array.from(new Set(artists.map(a => a.activity_field).filter(Boolean)));
        return (
          <div style={{ padding: 8 }}>
            <Select
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              placeholder="활동 분야 선택"
              allowClear
              value={selectedKeys[0] as string | undefined}
              onChange={(value: string) => {
                setSelectedKeys(value ? [value] : []);
                confirm();
              }}
              onClear={() => {
                clearFilters?.();
                confirm();
              }}
              options={uniqueFields.map(field => ({ label: field, value: field }))}
            />
          </div>
        );
      },
    },
    {
      title: '태그',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => {
        const safe = Array.isArray(tags) ? tags : [];
        return (
          <>
            {safe.slice(0, 3).map((tag, idx) => (
              <Tag key={`tag-${idx}-${tag}`}>{tag}</Tag>
            ))}
            {safe.length > 3 && <Tag key="more-tags">+{safe.length - 3}</Tag>}
          </>
        );
      },
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: ProfileArtist, b: ProfileArtist) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '최근 접속일',
      key: 'last_access',
      render: (_: any, record: ProfileArtist) => {
        const lastAccess = lastAccessMap[record.profile_id];
        if (!lastAccess) return <span style={{ color: '#999' }}>접속 기록 없음</span>;
        return dayjs(lastAccess).format('YYYY-MM-DD HH:mm');
      },
      sorter: (a: ProfileArtist, b: ProfileArtist) => {
        const aAccess = lastAccessMap[a.profile_id];
        const bAccess = lastAccessMap[b.profile_id];
        if (!aAccess && !bAccess) return 0;
        if (!aAccess) return 1;
        if (!bAccess) return -1;
        return dayjs(aAccess).unix() - dayjs(bAccess).unix();
      },
    },
    {
      title: '제재 상태',
      key: 'ban_status',
      render: (_: any, record: ProfileArtist) => {
        const status = getBanStatus(record.profile_id);
        if (!status) return <Tag>-</Tag>;
        const color = status.type === 'permanent' ? 'red' : status.type === 'active' ? 'orange' : 'default';
        return <Tag color={color}>{status.text}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: ProfileArtist) => {
        const status = getBanStatus(record.profile_id);
        const isBanned = status && (status.type === 'permanent' || status.type === 'active');
        const profileId = record.profile_id || record.id;

        return (
          <Space>
            <a onClick={() => showDetailModal(record)}>상세보기</a>
            <a onClick={() => showBanModal(record.profile_id)} style={{ color: '#ff4d4f' }}>
              제재
            </a>
            {isBanned && (
              <a onClick={() => handleUnban(record.profile_id)} style={{ color: '#52c41a' }}>
                제재 해제
              </a>
            )}
            <a
              onClick={() => handleDeleteProfile('artist', profileId)}
              style={{ color: '#ff7875' }}
            >
              삭제
            </a>
          </Space>
        );
      },
    },
  ];

  // 브랜드 컬럼
  const brandColumns = [
    {
      title: '브랜드명',
      dataIndex: 'brand_name',
      key: 'brand_name',
      sorter: (a: ProfileBrand, b: ProfileBrand) => (a.brand_name || '').localeCompare(b.brand_name || ''),
    },
    {
      title: '카테고리',
      dataIndex: 'activity_field',
      key: 'activity_field',
      filters: [],
      onFilter: (value: React.Key | boolean, record: ProfileBrand) => {
        if (!value) return true;
        return record.activity_field === String(value);
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => {
        const uniqueActivityFields = Array.from(new Set(brands.map(b => b.activity_field).filter(Boolean)));
        return (
          <div style={{ padding: 8 }}>
            <Select
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              placeholder="카테고리 선택"
              allowClear
              value={selectedKeys[0] as string | undefined}
              onChange={(value: string) => {
                setSelectedKeys(value ? [value] : []);
                confirm();
              }}
              onClear={() => {
                clearFilters?.();
                confirm();
              }}
              options={uniqueActivityFields.map(activityField => ({ label: activityField, value: activityField }))}
            />
          </div>
        );
      },
    },
    {
      title: '승인 상태',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          approved: 'green',
          rejected: 'red',
        };
        const labels: Record<string, string> = {
          pending: '대기중',
          approved: '승인',
          rejected: '거절',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
      filters: [
        { text: '대기중', value: 'pending' },
        { text: '승인', value: 'approved' },
        { text: '거절', value: 'rejected' },
      ],
      onFilter: (value: React.Key | boolean, record: ProfileBrand) => record.approval_status === String(value),
    },
    {
      title: '타겟 세대',
      dataIndex: 'target_audience',
      key: 'target_audience',
      render: (audience: string[]) => {
        const safe = Array.isArray(audience) ? audience : [];
        return (
          <>
            {safe.slice(0, 2).map((item, idx) => (
              <Tag key={`audience-${idx}-${item}`}>{item}</Tag>
            ))}
            {safe.length > 2 && <Tag key="more-audience">+{safe.length - 2}</Tag>}
          </>
        );
      },
    },
    {
      title: '월 예산',
      dataIndex: 'monthly_budget',
      key: 'monthly_budget',
      sorter: (a: ProfileBrand, b: ProfileBrand) => {
        const aBudget = parseInt(a.monthly_budget?.replace(/[^0-9]/g, '') || '0');
        const bBudget = parseInt(b.monthly_budget?.replace(/[^0-9]/g, '') || '0');
        return aBudget - bBudget;
      },
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: ProfileBrand, b: ProfileBrand) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '최근 접속일',
      key: 'last_access',
      render: (_: any, record: ProfileBrand) => {
        const lastAccess = lastAccessMap[record.profile_id];
        if (!lastAccess) return <span style={{ color: '#999' }}>접속 기록 없음</span>;
        return dayjs(lastAccess).format('YYYY-MM-DD HH:mm');
      },
      sorter: (a: ProfileBrand, b: ProfileBrand) => {
        const aAccess = lastAccessMap[a.profile_id];
        const bAccess = lastAccessMap[b.profile_id];
        if (!aAccess && !bAccess) return 0;
        if (!aAccess) return 1;
        if (!bAccess) return -1;
        return dayjs(aAccess).unix() - dayjs(bAccess).unix();
      },
    },
    {
      title: '제재 상태',
      key: 'ban_status',
      render: (_: any, record: ProfileBrand) => {
        const status = getBanStatus(record.profile_id);
        if (!status) return <Tag>-</Tag>;
        const color = status.type === 'permanent' ? 'red' : status.type === 'active' ? 'orange' : 'default';
        return <Tag color={color}>{status.text}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: ProfileBrand) => {
        const status = getBanStatus(record.profile_id);
        const isBanned = status && (status.type === 'permanent' || status.type === 'active');
        const profileId = record.profile_id || record.id;

        return (
          <Space>
            <a onClick={() => showDetailModal(record)}>상세보기</a>
            <a onClick={() => showBanModal(record.profile_id)} style={{ color: '#ff4d4f' }}>
              제재
            </a>
            {isBanned && (
              <a onClick={() => handleUnban(record.profile_id)} style={{ color: '#52c41a' }}>
                제재 해제
              </a>
            )}
            <a
              onClick={() => handleDeleteProfile('brand', profileId)}
              style={{ color: '#ff7875' }}
            >
              삭제
            </a>
          </Space>
        );
      },
    },
  ];

  // 크리에이티브 컬럼 (승인 컬럼 제거)
  const creativeColumns = [
    {
      title: '닉네임',
      dataIndex: 'nickname',
      key: 'nickname',
      sorter: (a: ProfileCreative, b: ProfileCreative) => (a.nickname || '').localeCompare(b.nickname || ''),
    },
    {
      title: 'SNS 채널 수',
      dataIndex: 'sns_channels',
      key: 'sns_channels',
      render: (channels: any[]) => (Array.isArray(channels) ? channels.length : 0),
      sorter: (a: ProfileCreative, b: ProfileCreative) => {
        const aCount = Array.isArray(a.sns_channels) ? a.sns_channels.length : 0;
        const bCount = Array.isArray(b.sns_channels) ? b.sns_channels.length : 0;
        return aCount - bCount;
      },
    },
    {
      title: '유입 경로',
      dataIndex: 'acquisition_source',
      key: 'acquisition_source',
      filters: [],
      onFilter: (value: React.Key | boolean, record: ProfileCreative) => {
        if (!value) return true;
        return record.acquisition_source === String(value);
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => {
        const uniqueSources = Array.from(new Set(creatives.map(c => c.acquisition_source).filter(Boolean)));
        return (
          <div style={{ padding: 8 }}>
            <Select
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              placeholder="유입 경로 선택"
              allowClear
              value={selectedKeys[0] as string | undefined}
              onChange={(value: string) => {
                setSelectedKeys(value ? [value] : []);
                confirm();
              }}
              onClear={() => {
                clearFilters?.();
                confirm();
              }}
              options={uniqueSources.map(source => ({ label: source, value: source }))}
            />
          </div>
        );
      },
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: ProfileCreative, b: ProfileCreative) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '최근 접속일',
      key: 'last_access',
      render: (_: any, record: ProfileCreative) => {
        const lastAccess = lastAccessMap[record.profile_id];
        if (!lastAccess) return <span style={{ color: '#999' }}>접속 기록 없음</span>;
        return dayjs(lastAccess).format('YYYY-MM-DD HH:mm');
      },
      sorter: (a: ProfileCreative, b: ProfileCreative) => {
        const aAccess = lastAccessMap[a.profile_id];
        const bAccess = lastAccessMap[b.profile_id];
        if (!aAccess && !bAccess) return 0;
        if (!aAccess) return 1;
        if (!bAccess) return -1;
        return dayjs(aAccess).unix() - dayjs(bAccess).unix();
      },
    },
    {
      title: '제재 상태',
      key: 'ban_status',
      render: (_: any, record: ProfileCreative) => {
        const status = getBanStatus(record.profile_id);
        if (!status) return <Tag>-</Tag>;
        const color = status.type === 'permanent' ? 'red' : status.type === 'active' ? 'orange' : 'default';
        return <Tag color={color}>{status.text}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: ProfileCreative) => {
        const status = getBanStatus(record.profile_id);
        const isBanned = status && (status.type === 'permanent' || status.type === 'active');
        const profileId = record.profile_id || record.id;

        return (
          <Space>
            <a onClick={() => showDetailModal(record)}>상세보기</a>
            <a onClick={() => showBanModal(record.profile_id)} style={{ color: '#ff4d4f' }}>
              제재
            </a>
            {isBanned && (
              <a onClick={() => handleUnban(record.profile_id)} style={{ color: '#52c41a' }}>
                제재 해제
              </a>
            )}
            <a
              onClick={() => handleDeleteProfile('creative', profileId)}
              style={{ color: '#ff7875' }}
            >
              삭제
            </a>
          </Space>
        );
      },
    },
  ];

  // 팬 컬럼
  const fanColumns = [
    {
      title: '닉네임',
      dataIndex: 'nickname',
      key: 'nickname',
      sorter: (a: ProfileFan, b: ProfileFan) => (a.nickname || '').localeCompare(b.nickname || ''),
    },
    {
      title: '관심사',
      dataIndex: 'interests',
      key: 'interests',
      render: (interests: string[]) => {
        const safe = Array.isArray(interests) ? interests : [];
        return (
          <>
            {safe.slice(0, 3).map((item, idx) => (
              <Tag key={`interests-${idx}-${item}`}>{item}</Tag>
            ))}
            {safe.length > 3 && <Tag key="more-interests">+{safe.length - 3}</Tag>}
          </>
        );
      },
    },
    {
      title: '페르소나',
      dataIndex: 'persona',
      key: 'persona',
      filters: [],
      onFilter: (value: React.Key | boolean, record: ProfileFan) => {
        if (!value) return true;
        return record.persona === String(value);
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => {
        const uniquePersonas = Array.from(new Set(fans.map(f => f.persona).filter(Boolean)));
        return (
          <div style={{ padding: 8 }}>
            <Select
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              placeholder="페르소나 선택"
              allowClear
              value={selectedKeys[0] as string | undefined}
              onChange={(value: string) => {
                setSelectedKeys(value ? [value] : []);
                confirm();
              }}
              onClear={() => {
                clearFilters?.();
                confirm();
              }}
              options={uniquePersonas.map(persona => ({ label: persona, value: persona }))}
            />
          </div>
        );
      },
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: ProfileFan, b: ProfileFan) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '최근 접속일',
      key: 'last_access',
      render: (_: any, record: ProfileFan) => {
        const lastAccess = lastAccessMap[record.profile_id];
        if (!lastAccess) return <span style={{ color: '#999' }}>접속 기록 없음</span>;
        return dayjs(lastAccess).format('YYYY-MM-DD HH:mm');
      },
      sorter: (a: ProfileFan, b: ProfileFan) => {
        const aAccess = lastAccessMap[a.profile_id];
        const bAccess = lastAccessMap[b.profile_id];
        if (!aAccess && !bAccess) return 0;
        if (!aAccess) return 1;
        if (!bAccess) return -1;
        return dayjs(aAccess).unix() - dayjs(bAccess).unix();
      },
    },
    {
      title: '제재 상태',
      key: 'ban_status',
      render: (_: any, record: ProfileFan) => {
        const status = getBanStatus(record.profile_id);
        if (!status) return <Tag>-</Tag>;
        const color = status.type === 'permanent' ? 'red' : status.type === 'active' ? 'orange' : 'default';
        return <Tag color={color}>{status.text}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: ProfileFan) => {
        const status = getBanStatus(record.profile_id);
        const isBanned = status && (status.type === 'permanent' || status.type === 'active');
        const profileId = record.profile_id || record.id;

        return (
          <Space>
            <a onClick={() => showDetailModal(record)}>상세보기</a>
            <a onClick={() => showBanModal(record.profile_id)} style={{ color: '#ff4d4f' }}>
              제재
            </a>
            {isBanned && (
              <a onClick={() => handleUnban(record.profile_id)} style={{ color: '#52c41a' }}>
                제재 해제
              </a>
            )}
            <a
              onClick={() => handleDeleteProfile('fan', profileId)}
              style={{ color: '#ff7875' }}
            >
              삭제
            </a>
          </Space>
        );
      },
    },
  ];

  const filteredArtists = getFilteredArtists();
  const filteredBrands = getFilteredBrands();
  const filteredCreatives = getFilteredCreatives();
  const filteredFans = getFilteredFans();

  const tabItems = [
    {
      key: 'artists',
      label: `아티스트 (${filteredArtists.length})`,
      children: (
        <Table
          columns={artistColumns}
          dataSource={filteredArtists}
          rowKey={(record) => `artist-${record.id ?? record.profile_id}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'brands',
      label: `브랜드 (${filteredBrands.length})`,
      children: (
        <Table
          columns={brandColumns}
          dataSource={filteredBrands}
          rowKey={(record) => `brand-${record.id ?? record.profile_id}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'creatives',
      label: `크리에이티브 (${filteredCreatives.length})`,
      children: (
        <Table
          columns={creativeColumns}
          dataSource={filteredCreatives}
          rowKey={(record) => `creative-${record.id ?? record.profile_id}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'fans',
      label: `팬 (${filteredFans.length})`,
      children: (
        <Table
          columns={fanColumns}
          dataSource={filteredFans}
          rowKey={(record) => `fan-${record.id ?? record.profile_id}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>사용자 관리</Title>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Search
            placeholder="이름/닉네임으로 검색"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={(value) => setSearchText(value)}
            style={{ maxWidth: 400 }}
          />

          <Tabs
            activeKey={activeTab}
            items={tabItems}
            onChange={setActiveTab}
          />
        </Space>
      </Card>

      {/* 상세보기 모달 */}
      <Modal
        title="사용자 상세 정보"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedUser && (
          <Descriptions bordered column={1}>
            {/* 공통 정보 */}
            <Descriptions.Item label="ID">{selectedUser.id}</Descriptions.Item>
            <Descriptions.Item label="Profile ID">{selectedUser.profile_id}</Descriptions.Item>

            {/* 타입별 정보 */}
            {selectedUser.artist_name && (
              <>
                <Descriptions.Item label="아티스트명">{selectedUser.artist_name}</Descriptions.Item>
                <Descriptions.Item label="활동 분야">{selectedUser.activity_field}</Descriptions.Item>
                <Descriptions.Item label="태그">
                  {selectedUser.tags?.map((tag: string, idx: number) => (
                    <Tag key={`modal-tag-${idx}-${tag}`}>{tag}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="전문 역할">
                  {selectedUser.specialized_roles?.map((role: string, idx: number) => (
                    <Tag key={`modal-role-${idx}-${role}`}>{role}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="Bio">{selectedUser.bio}</Descriptions.Item>
                <Descriptions.Item label="포트폴리오">
                  {selectedUser.portfolio_url && (
                    <a href={selectedUser.portfolio_url} target="_blank" rel="noreferrer">
                      {selectedUser.portfolio_url}
                    </a>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="커버 이미지">
                  <ImageWithReset
                    src={selectedUser.cover_image_url}
                    alt="커버 이미지"
                    width={200}
                    onReset={() => handleResetImage('artist', 'cover_image_url')}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="로고 이미지">
                  <ImageWithReset
                    src={selectedUser.logo_image_url}
                    alt="로고 이미지"
                    width={100}
                    onReset={() => handleResetImage('artist', 'logo_image_url')}
                  />
                </Descriptions.Item>
              </>
            )}

            {selectedUser.brand_name && (
              <>
                <Descriptions.Item label="브랜드명">{selectedUser.brand_name}</Descriptions.Item>
                <Descriptions.Item label="카테고리">{selectedUser.category}</Descriptions.Item>
                <Descriptions.Item label="타겟 세대">
                  {selectedUser.target_audience?.map((item: string, idx: number) => (
                    <Tag key={`modal-audience-${idx}-${item}`}>{item}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="선호 크리에이터">
                  {selectedUser.preferred_creator_type?.map((item: string, idx: number) => (
                    <Tag key={`modal-creator-${idx}-${item}`}>{item}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="협업 방식">
                  {selectedUser.collaboration_types?.map((item: string, idx: number) => (
                    <Tag key={`modal-collab-${idx}-${item}`}>{item}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="월 예산">{selectedUser.monthly_budget}</Descriptions.Item>
                <Descriptions.Item label="웹사이트">{selectedUser.website_url}</Descriptions.Item>
                <Descriptions.Item label="SNS">{selectedUser.sns_channel}</Descriptions.Item>
                <Descriptions.Item label="연락처">{selectedUser.contact_info}</Descriptions.Item>
                <Descriptions.Item label="설립일">
                  {selectedUser.established_at ? dayjs(selectedUser.established_at).format('YYYY-MM-DD') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="커버 이미지">
                  <ImageWithReset
                    src={selectedUser.cover_image_url}
                    alt="커버 이미지"
                    width={200}
                    onReset={() => handleResetImage('brand', 'cover_image_url')}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="로고 이미지">
                  <ImageWithReset
                    src={selectedUser.logo_image_url}
                    alt="로고 이미지"
                    width={100}
                    onReset={() => handleResetImage('brand', 'logo_image_url')}
                  />
                </Descriptions.Item>
              </>
            )}

            {selectedUser.sns_channels && (
              <>
                <Descriptions.Item label="닉네임">{selectedUser.nickname}</Descriptions.Item>
                <Descriptions.Item label="프로필 사진">
                  <ImageWithReset
                    src={selectedUser.profile_image_url}
                    alt="프로필 사진"
                    width={100}
                    height={100}
                    shape="circle"
                    onReset={() => handleResetImage('creative', 'profile_image_url')}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="SNS 채널">
                  {selectedUser.sns_channels.map((channel: any, index: number) => (
                    <div key={index}>
                      <Tag color={channel.is_main ? 'blue' : 'default'}>
                        {channel.type}
                        {channel.is_main && ' (메인)'}
                      </Tag>
                      <a href={channel.url} target="_blank" rel="noreferrer">
                        {channel.url}
                      </a>
                    </div>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="유입 경로">{selectedUser.acquisition_source}</Descriptions.Item>
              </>
            )}

            {selectedUser.interests && (
              <>
                <Descriptions.Item label="닉네임">{selectedUser.nickname}</Descriptions.Item>
                <Descriptions.Item label="관심사">
                  {selectedUser.interests?.map((item: string, idx: number) => (
                    <Tag key={`modal-interests-${idx}-${item}`}>{item}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="페르소나">{selectedUser.persona}</Descriptions.Item>
                <Descriptions.Item label="세부 관심사">
                  {selectedUser.specific_interests?.map((item: string, idx: number) => (
                    <Tag key={`modal-specific-${idx}-${item}`}>{item}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="선호 지역">
                  {selectedUser.preferred_regions?.map((item: string, idx: number) => (
                    <Tag key={`modal-regions-${idx}-${item}`}>{item}</Tag>
                  ))}
                </Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="가입일">
              {dayjs(selectedUser.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="수정일">
              {dayjs(selectedUser.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 제재 모달 */}
      <Modal
        title="사용자 제재"
        open={banModalVisible}
        onCancel={() => {
          setBanModalVisible(false);
          setBanTargetProfileId(null);
          setBanDuration(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setBanModalVisible(false);
            setBanTargetProfileId(null);
            setBanDuration(null);
          }}>
            취소
          </Button>,
          <Button key="submit" type="primary" danger loading={banLoading} onClick={handleBan}>
            제재 적용
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Typography.Text strong>제재 기간을 선택하세요:</Typography.Text>
          <Radio.Group
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical">
              <Radio value={1}>1일</Radio>
              <Radio value={7}>7일</Radio>
              <Radio value={15}>15일</Radio>
              <Radio value={30}>30일</Radio>
              <Radio value="permanent">영구 제재 (99년)</Radio>
            </Space>
          </Radio.Group>
        </Space>
      </Modal>
    </div>
  );
}

