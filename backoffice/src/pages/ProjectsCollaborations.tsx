/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Tabs, Table, Input, Space, Typography, Tag, Modal, Descriptions, Button, Select, Popconfirm, Switch, Form } from 'antd';
import { SearchOutlined, EyeOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { checkIsAdmin } from '../utils/auth';
import { logAdminActivity } from '../utils/adminActivity';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import {
  toggleProjectTrending,
  listExploreFeaturedItems,
  addExploreFeaturedItem,
  removeExploreFeaturedItem,
  updateExploreFeaturedOrder,
} from '../api/homepage';
import type { ExploreFeaturedItem } from '../types/database.types';

const { Title } = Typography;
const { Search } = Input;

// 상태 매핑
const STATUS_MAP: Record<string, string> = {
  'draft': '임시저장',
  'open': '모집중',
  'in_progress': '진행중',
  'completed': '완료',
  'cancelled': '취소됨',
  'on_hold': '보류',
  'deleted': '삭제됨',
};

// 역할 매핑
const ROLE_MAP: Record<string, string> = {
  'brand': '브랜드',
  'artist': '아티스트',
  'creative': '크리에이티브',
};

interface ProfileBrand {
  brand_name?: string;
  is_active?: boolean;
}

interface ProfileArtist {
  artist_name?: string;
  is_active?: boolean;
}

interface ProfileCreative {
  nickname?: string;
  is_active?: boolean;
}

interface ProfileInfo {
  nickname?: string;
  roles?: string[];
  profile_brands?: ProfileBrand;
  profile_artists?: ProfileArtist;
  profile_creatives?: ProfileCreative;
}

interface Project {
  id: string;
  created_by: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_trending?: boolean;
  is_explore_featured?: boolean;
  explore_order?: number | null;
  cover_image_url: string;
  brand_name: string;
  budget_range?: string;
  deadline?: string;
  capacity?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  workflow_steps: any;
  team: any;
  files: any;
  profiles?: ProfileInfo;
  // Settlement fields
  settlement_status?: string | null;
  confirmed_budget?: number | null;
  settlement_fee_rate?: number | null;
  settlement_paid_at?: string | null;
  settlement_order_id?: string | null;
}

interface Collaboration {
  id: string;
  created_by: string;
  title: string;
  brief_description: string;
  description: string;
  category: string;
  status: string;
  is_explore_featured?: boolean;
  explore_order?: number | null;
  cover_image_url: string;
  collabo_type: string;
  skills: string[];
  requirements: string[];
  benefits: string[];
  capacity?: number;
  team_size?: number;
  current_team_size?: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  team: any;
  files: any;
  activities: any;
  profiles?: ProfileInfo;
}

// 유효한 역할 필터링 (fan, customer 제외)
const getValidRole = (roles: string[]): string | null => {
  const validRoles = ['brand', 'artist', 'creative'];
  return roles.find(role => validRoles.includes(role)) || null;
};

// 역할에 따라 적절한 이름 가져오기
const getRoleBasedName = (record: Project | Collaboration): string => {
  const profiles = record.profiles;
  if (!profiles) return '알 수 없음';

  const roles = profiles.roles || [];
  const primaryRole = getValidRole(roles);

  if (!primaryRole) {
    return profiles.nickname || '알 수 없음';
  }

  switch (primaryRole) {
    case 'brand':
      return profiles.profile_brands?.brand_name || profiles.nickname || '알 수 없음';
    case 'artist':
      return profiles.profile_artists?.artist_name || profiles.nickname || '알 수 없음';
    case 'creative':
      return profiles.profile_creatives?.nickname || profiles.nickname || '알 수 없음';
    default:
      return profiles.nickname || '알 수 없음';
  }
};

type TabKey = 'projects' | 'collaborations' | 'explore-featured';

export default function ProjectsCollaborations() {
  const [activeTab, setActiveTab] = useState<TabKey>('projects');
  const [loading, setLoading] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  // 데이터
  const [projects, setProjects] = useState<Project[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [exploreFeaturedItems, setExploreFeaturedItems] = useState<ExploreFeaturedItem[]>([]);
  const [draggingExploreKey, setDraggingExploreKey] = useState<string | null>(null);
  const [exploreModalVisible, setExploreModalVisible] = useState(false);
  const [activeExploreType, setActiveExploreType] = useState<'project' | 'collaboration'>('project');
  const [exploreForm] = Form.useForm();

  // 상세 모달
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Project | Collaboration | null>(null);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:created_by(
          nickname,
          roles,
          profile_brands!profile_id(brand_name, is_active),
          profile_artists!profile_id(artist_name, is_active),
          profile_creatives!profile_id(nickname, is_active)
        )
      `)
      .order('is_trending', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('프로젝트 로드 실패:', error);
      toast.error('프로젝트 로드 실패');
    } else {
      setProjects(data || []);
    }
  };

  const loadCollaborations = async () => {
    const { data, error } = await supabase
      .from('collaborations')
      .select(`
        *,
        profiles:created_by(
          nickname,
          roles,
          profile_brands!profile_id(brand_name, is_active),
          profile_artists!profile_id(artist_name, is_active),
          profile_creatives!profile_id(nickname, is_active)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('협업 로드 실패:', error);
      toast.error('협업 로드 실패');
    } else {
      setCollaborations(data || []);
    }
  };

  const loadExploreFeatured = async () => {
    try {
      const data = await listExploreFeaturedItems();
      const normalizeByType = (type: 'project' | 'collaboration') => {
        const filtered = data.filter((item) => item.type === type);
        const sorted = [...filtered].sort(
          (a, b) => (a.explore_order ?? 999) - (b.explore_order ?? 999)
        );
        return sorted.map((item, index) => ({
          ...item,
          explore_order: Number.isFinite(item.explore_order) ? item.explore_order : index,
        }));
      };
      const normalized = [
        ...normalizeByType('project'),
        ...normalizeByType('collaboration'),
      ];
      setExploreFeaturedItems(normalized);
    } catch (error) {
      console.error('Explore featured load failed:', error);
      toast.error('Explore featured load failed');
    }
  };

  const loadData = useCallback(async (tab: TabKey) => {
    setLoading(true);
    try {
      if (tab === 'projects') {
        await loadProjects();
      } else if (tab === 'collaborations') {
        await loadCollaborations();
      } else {
        await Promise.all([loadProjects(), loadCollaborations(), loadExploreFeatured()]);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      toast.error('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const admin = await checkIsAdmin();
      if (admin) {
        setCurrentAdminId(admin.profile_id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  const exploreFeaturedLimit = 5;
  const getExploreKey = (item: ExploreFeaturedItem) => `${item.type}:${item.id}`;
  const parseExploreKey = (key: string) => {
    const [type, id] = key.split(':');
    return { type: type as 'project' | 'collaboration', id };
  };

  const sortExploreItems = useCallback(
    (items: ExploreFeaturedItem[]) =>
      [...items].sort((a, b) => (a.explore_order ?? 999) - (b.explore_order ?? 999)),
    []
  );

  const exploreFeaturedProjects = useMemo(
    () => sortExploreItems(exploreFeaturedItems.filter((item) => item.type === 'project')),
    [exploreFeaturedItems, sortExploreItems]
  );
  const exploreFeaturedCollaborations = useMemo(
    () => sortExploreItems(exploreFeaturedItems.filter((item) => item.type === 'collaboration')),
    [exploreFeaturedItems, sortExploreItems]
  );
  const updateExploreItemsForType = useCallback(
    (type: 'project' | 'collaboration', nextList: ExploreFeaturedItem[]) => {
      setExploreFeaturedItems((prev) => [
        ...prev.filter((item) => item.type !== type),
        ...nextList,
      ]);
    },
    []
  );

  const reorderExploreList = useCallback(
    (list: ExploreFeaturedItem[], fromId: string, toId: string) => {
      const fromIdx = list.findIndex((item) => item.id === fromId);
      const toIdx = list.findIndex((item) => item.id === toId);
      if (fromIdx === -1 || toIdx === -1) return list;

      const reordered = [...list];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      return reordered.map((item, index) => ({
        ...item,
        explore_order: index,
      }));
    },
    []
  );

  const persistExploreOrder = useCallback(
    async (type: 'project' | 'collaboration', ordered: ExploreFeaturedItem[]) => {
      try {
        await updateExploreFeaturedOrder(
          ordered.map((item, index) => ({
            id: item.id,
            type,
            explore_order: index,
          }))
        );
        if (currentAdminId) {
          await logAdminActivity(currentAdminId, 'explore_featured_reorder', null, {});
        }
        toast.success('Explore featured order updated.');
      } catch (error) {
        console.error('Explore featured reorder failed:', error);
        toast.error('Explore featured reorder failed.');
      }
    },
    [currentAdminId]
  );

  const handleExploreDrop = useCallback(
    async (type: 'project' | 'collaboration', targetId: string) => {
      if (!draggingExploreKey) return;
      const { type: fromType, id: fromId } = parseExploreKey(draggingExploreKey);
      if (fromType !== type || fromId === targetId) return;
      const sourceList = type === 'project' ? exploreFeaturedProjects : exploreFeaturedCollaborations;
      const reordered = reorderExploreList(sourceList, fromId, targetId);
      updateExploreItemsForType(type, reordered);
      setDraggingExploreKey(null);
      await persistExploreOrder(type, reordered);
    },
    [
      draggingExploreKey,
      exploreFeaturedProjects,
      exploreFeaturedCollaborations,
      persistExploreOrder,
      reorderExploreList,
      updateExploreItemsForType,
    ]
  );

  const handleToggleTrending = useCallback(
    async (record: Project, nextTrending: boolean) => {
      try {
        await toggleProjectTrending(record.id, nextTrending);
        setProjects((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, is_trending: nextTrending } : item))
        );
        if (currentAdminId) {
          await logAdminActivity(currentAdminId, 'project_trending_toggle', null, {
            id: record.id,
            is_trending: nextTrending,
          });
        }
        toast.success('Trending updated.');
      } catch (error) {
        console.error('Trending toggle failed:', error);
        toast.error('Trending toggle failed.');
      }
    },
    [currentAdminId]
  );

  const openExploreModal = useCallback(
    (type: 'project' | 'collaboration') => {
      const currentList = type === 'project' ? exploreFeaturedProjects : exploreFeaturedCollaborations;
      if (currentList.length >= exploreFeaturedLimit) {
        toast.error('Explore featured limit reached (max 5).');
        return;
      }
      setActiveExploreType(type);
      exploreForm.setFieldsValue({ itemId: undefined });
      setExploreModalVisible(true);
    },
    [exploreFeaturedCollaborations, exploreFeaturedLimit, exploreFeaturedProjects, exploreForm]
  );

  const handleAddExploreFeatured = useCallback(async () => {
    try {
      const values = await exploreForm.validateFields();
      const { itemId } = values as { itemId: string };
      const currentList = activeExploreType === 'project' ? exploreFeaturedProjects : exploreFeaturedCollaborations;
      if (currentList.length >= exploreFeaturedLimit) {
        toast.error('Explore featured limit reached (max 5).');
        return;
      }
      const currentMax = currentList.reduce(
        (max, item) => Math.max(max, item.explore_order ?? -1),
        -1
      );
      const nextOrder = currentMax + 1;
      const added = await addExploreFeaturedItem(itemId, activeExploreType, nextOrder);
      const nextItems = sortExploreItems([...currentList, { ...added, explore_order: nextOrder }]);
      updateExploreItemsForType(activeExploreType, nextItems);
      setExploreModalVisible(false);
      exploreForm.resetFields();
      if (currentAdminId) {
        await logAdminActivity(currentAdminId, 'explore_featured_add', null, {
          id: itemId,
          type: activeExploreType,
          explore_order: nextOrder,
        });
      }
      toast.success('Explore featured item added.');
    } catch (error) {
      console.error('Explore featured add failed:', error);
      toast.error('Explore featured add failed.');
    }
  }, [
    activeExploreType,
    currentAdminId,
    exploreFeaturedCollaborations,
    exploreFeaturedLimit,
    exploreFeaturedProjects,
    exploreForm,
    sortExploreItems,
    updateExploreItemsForType,
  ]);

  const handleRemoveExploreFeatured = useCallback(
    async (item: ExploreFeaturedItem) => {
      try {
        await removeExploreFeaturedItem(item.id, item.type);
        const currentList = item.type === 'project' ? exploreFeaturedProjects : exploreFeaturedCollaborations;
        const remaining = currentList.filter((entry) => entry.id !== item.id);
        const reordered = remaining.map((entry, index) => ({
          ...entry,
          explore_order: index,
        }));
        updateExploreItemsForType(item.type, reordered);
        if (reordered.length > 0) {
          await updateExploreFeaturedOrder(
            reordered.map((entry, index) => ({
              id: entry.id,
              type: item.type,
              explore_order: index,
            }))
          );
        }
        if (currentAdminId) {
          await logAdminActivity(currentAdminId, 'explore_featured_remove', null, {
            id: item.id,
            type: item.type,
          });
        }
        toast.success('Explore featured item removed.');
      } catch (error) {
        console.error('Explore featured remove failed:', error);
        toast.error('Explore featured remove failed.');
      }
    },
    [currentAdminId, exploreFeaturedCollaborations, exploreFeaturedProjects, updateExploreItemsForType]
  );

  const handleDelete = async (id: string, type: 'project' | 'collaboration') => {
    try {
      // 프로젝트 삭제 시 관련 매거진 확인
      if (type === 'project') {
        const { data: relatedMagazines, error: magazineError } = await supabase
          .from('magazines')
          .select('id, title')
          .eq('related_project', id);

        if (magazineError) {
          console.error('매거진 조회 실패:', magazineError);
        } else if (relatedMagazines && relatedMagazines.length > 0) {
          const magazineCount = relatedMagazines.length;
          const magazineTitles = relatedMagazines.slice(0, 3).map(m => m.title).join(', ');
          const additionalText = relatedMagazines.length > 3 ? ` 외 ${relatedMagazines.length - 3}개` : '';

          toast.info(
            `이 프로젝트와 연결된 ${magazineCount}개의 매거진 아티클이 있습니다. ` +
            `(${magazineTitles}${additionalText}) ` +
            `삭제 후 해당 아티클의 프로젝트 연결이 해제됩니다.`,
            { autoClose: 5000 }
          );
        }
      }

      const table = type === 'project' ? 'projects' : 'collaborations';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('삭제되었습니다');

      // 활동 로그
      if (currentAdminId) {
        await logAdminActivity(
          currentAdminId,
          type === 'project' ? 'delete_project' : 'delete_collaboration',
          null,
          { id }
        );
      }

      // 리로드
      loadData(activeTab);
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('삭제 실패');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, type: 'project' | 'collaboration') => {
    try {
      const table = type === 'project' ? 'projects' : 'collaborations';
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success('상태가 변경되었습니다');

      // 활동 로그
      if (currentAdminId) {
        await logAdminActivity(
          currentAdminId,
          type === 'project' ? 'update_project_status' : 'update_collaboration_status',
          null,
          { id, status: newStatus }
        );
      }

      // 리로드
      loadData(activeTab);
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error('상태 변경 실패');
    }
  };

  const showDetail = (item: Project | Collaboration) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  // Projects 테이블 컬럼
  const projectColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => id.substring(0, 8) + '...',
    },
    {
      title: '생성자',
      key: 'creator',
      width: 150,
      render: (_: any, record: Project) => {
        const name = getRoleBasedName(record);
        const roles = record.profiles?.roles || [];
        const primaryRole = getValidRole(roles);
        return (
          <div>
            <div>{name}</div>
            {primaryRole && <Tag color="cyan" style={{ marginTop: 4 }}>{ROLE_MAP[primaryRole] || primaryRole}</Tag>}
          </div>
        );
      },
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }: any) => (
        <div style={{ padding: 8 }}>
          <Search
            placeholder="제목 검색"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onSearch={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      onFilter: (value: any, record: Project) =>
        record.title.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      filters: [
        { text: '패션', value: '패션' },
        { text: '뷰티', value: '뷰티' },
        { text: '음악', value: '음악' },
        { text: '미술', value: '미술' },
        { text: '테크', value: '테크' },
      ],
      onFilter: (value: any, record: Project) => record.category === value,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '임시저장', value: 'draft' },
        { text: '모집중', value: 'open' },
        { text: '진행중', value: 'in_progress' },
        { text: '완료', value: 'completed' },
        { text: '보류', value: 'on_hold' },
        { text: '취소됨', value: 'cancelled' },
      ],
      onFilter: (value: any, record: Project) => record.status === value,
      render: (status: string, record: Project) => (
        <Select
          value={status}
          style={{ width: 120 }}
          onChange={(value) => handleStatusChange(record.id, value, 'project')}
        >
          <Select.Option value="draft">임시저장</Select.Option>
          <Select.Option value="open">모집중</Select.Option>
          <Select.Option value="in_progress">진행중</Select.Option>
          <Select.Option value="completed">완료</Select.Option>
          <Select.Option value="on_hold">보류</Select.Option>
          <Select.Option value="cancelled">취소됨</Select.Option>
        </Select>
      ),
    },
    {
      title: '급상승',
      dataIndex: 'is_trending',
      key: 'is_trending',
      width: 100,
      render: (_: boolean, record: Project) => (
        <Switch
          checked={!!record.is_trending}
          onChange={(checked) => handleToggleTrending(record, checked)}
        />
      ),
    },
    {
      title: '수수료율 (%)',
      dataIndex: 'settlement_fee_rate',
      key: 'settlement_fee_rate',
      width: 120,
      render: (rate: number | null, record: Project) => (
        <Form.Item style={{ margin: 0 }}>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            defaultValue={rate || 0}
            style={{ width: '100%' }}
            onBlur={async (e) => {
              const newRate = parseFloat(e.target.value);
              if (isNaN(newRate) || newRate < 0 || newRate > 100) {
                toast.error('0~100 사이의 숫자를 입력해주세요.');
                e.target.value = String(rate || 0);
                return;
              }
              try {
                const { error } = await supabase
                  .from('projects')
                  .update({ settlement_fee_rate: newRate })
                  .eq('id', record.id);

                if (error) throw error;

                toast.success('수수료율이 변경되었습니다.');
                await loadProjects();
              } catch (error) {
                console.error('Failed to update settlement_fee_rate:', error);
                toast.error('수수료율 변경에 실패했습니다.');
                e.target.value = String(rate || 0);
              }
            }}
          />
        </Form.Item>
      ),
    },
    {
      title: '예산',
      dataIndex: 'budget_range',
      key: 'budget_range',
      render: (budget_range?: string) => budget_range || '-',
    },
    {
      title: '마감일',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (deadline?: string) => deadline ? dayjs(deadline).format('YYYY-MM-DD') : '-',
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: Project, b: Project) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '정산 상태',
      dataIndex: 'settlement_status',
      key: 'settlement_status',
      width: 100,
      render: (status?: string) => {
        if (!status) return <Tag color="default">미정산</Tag>;
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'processing', text: '대기중' },
          paid: { color: 'success', text: '완료' },
          cancelled: { color: 'default', text: '취소됨' },
          refund_requested: { color: 'warning', text: '환불요청' },
          refunded: { color: 'default', text: '환불완료' },
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 150,
      render: (_: any, record: Project) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            상세
          </Button>
          <Popconfirm
            title="프로젝트 삭제"
            description="정말 삭제하시겠습니까? 연결된 매거진 아티클의 프로젝트 연결이 해제됩니다."
            onConfirm={() => handleDelete(record.id, 'project')}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Collaborations 테이블 컬럼
  const collaborationColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => id.substring(0, 8) + '...',
    },
    {
      title: '생성자',
      key: 'creator',
      width: 150,
      render: (_: any, record: Collaboration) => {
        const name = getRoleBasedName(record);
        const roles = record.profiles?.roles || [];
        const primaryRole = getValidRole(roles);
        return (
          <div>
            <div>{name}</div>
            {primaryRole && <Tag color="cyan" style={{ marginTop: 4 }}>{ROLE_MAP[primaryRole] || primaryRole}</Tag>}
          </div>
        );
      },
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }: any) => (
        <div style={{ padding: 8 }}>
          <Search
            placeholder="제목 검색"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onSearch={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        </div>
      ),
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      onFilter: (value: any, record: Collaboration) =>
        record.title.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: '협업 유형',
      dataIndex: 'collabo_type',
      key: 'collabo_type',
      filters: [
        { text: '장기 협업', value: '장기 협업' },
        { text: '단기 협업', value: '단기 협업' },
        { text: '협업 기반', value: '협업 기반' },
      ],
      onFilter: (value: any, record: Collaboration) => record.collabo_type === value,
      render: (type: string) => <Tag color="purple">{type}</Tag>,
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      filters: [
        { text: '패션', value: '패션' },
        { text: '뷰티', value: '뷰티' },
        { text: '음악', value: '음악' },
        { text: '미술', value: '미술' },
        { text: '테크', value: '테크' },
      ],
      onFilter: (value: any, record: Collaboration) => record.category === value,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '임시저장', value: 'draft' },
        { text: '모집중', value: 'open' },
        { text: '진행중', value: 'in_progress' },
        { text: '완료', value: 'completed' },
        { text: '보류', value: 'on_hold' },
        { text: '취소됨', value: 'cancelled' },
      ],
      onFilter: (value: any, record: Collaboration) => record.status === value,
      render: (status: string, record: Collaboration) => (
        <Select
          value={status}
          style={{ width: 120 }}
          onChange={(value) => handleStatusChange(record.id, value, 'collaboration')}
        >
          <Select.Option value="draft">임시저장</Select.Option>
          <Select.Option value="open">모집중</Select.Option>
          <Select.Option value="in_progress">진행중</Select.Option>
          <Select.Option value="completed">완료</Select.Option>
          <Select.Option value="on_hold">보류</Select.Option>
          <Select.Option value="cancelled">취소됨</Select.Option>
        </Select>
      ),
    },
    {
      title: '정원',
      dataIndex: 'team_size',
      key: 'team_size',
      width: 80,
      render: (team_size?: number) => team_size || '-',
    },
    {
      title: '현재 인원',
      dataIndex: 'current_team_size',
      key: 'current_team_size',
      width: 100,
      render: (current_team_size?: number) => current_team_size || 0,
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: Collaboration, b: Collaboration) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '작업',
      key: 'actions',
      width: 150,
      render: (_: any, record: Collaboration) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            상세
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id, 'collaboration')}
            okText="삭제"
            cancelText="취소"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const availableProjects = useMemo(() => {
    const featuredProjectIds = new Set(exploreFeaturedProjects.map((item) => item.id));
    return projects.filter((project) => !featuredProjectIds.has(project.id));
  }, [projects, exploreFeaturedProjects]);

  const availableCollaborations = useMemo(() => {
    const featuredCollaborationIds = new Set(exploreFeaturedCollaborations.map((item) => item.id));
    return collaborations.filter((collaboration) => !featuredCollaborationIds.has(collaboration.id));
  }, [collaborations, exploreFeaturedCollaborations]);

  const exploreItemOptions = useMemo(() => {
    const source = activeExploreType === 'collaboration' ? availableCollaborations : availableProjects;
    return source.map((item) => ({
      value: item.id,
      label: `${item.title}${item.category ? ` / ${item.category}` : ''}`,
    }));
  }, [activeExploreType, availableCollaborations, availableProjects]);

  const exploreColumns = useMemo(() => [
    {
      title: '순서',
      dataIndex: 'explore_order',
      key: 'explore_order',
      width: 80,
      render: (v: number | null) => (typeof v === 'number' ? v + 1 : '-'),
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category: string | null) => category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string | null) => (
        status ? (
          <Tag color={status === 'open' ? 'blue' : status === 'in_progress' ? 'green' : 'default'}>
            {STATUS_MAP[status] || status}
          </Tag>
        ) : '-'
      ),
    },
    {
      title: '커버',
      dataIndex: 'cover_image_url',
      key: 'cover_image_url',
      width: 140,
      render: (url: string | null) =>
        url ? (
          <img
            src={url}
            alt="cover"
            crossOrigin="anonymous"
            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }}
          />
        ) : (
          '-'
        ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: ExploreFeaturedItem) => (
        <Popconfirm
          title="Explore featured 제거"
          onConfirm={() => handleRemoveExploreFeatured(record)}
          okText="제거"
          cancelText="취소"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            제거
          </Button>
        </Popconfirm>
      ),
    },
  ], [handleRemoveExploreFeatured]);

  return (
    <div>
      <Title level={2}>프로젝트/협업 관리</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          items={[
            {
              key: 'projects',
              label: `프로젝트 (${projects.length})`,
              children: (
                <Table
                  columns={projectColumns}
                  dataSource={projects}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1200 }}
                />
              ),
            },
            {
              key: 'collaborations',
              label: `협업 (${collaborations.length})`,
              children: (
                <Table
                  columns={collaborationColumns}
                  dataSource={collaborations}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1200 }}
                />
              ),
            },
            {
              key: 'explore-featured',
              label: '탐색 상단노출',
              children: (
                <Tabs
                  activeKey={activeExploreType}
                  onChange={(key) => setActiveExploreType(key as 'project' | 'collaboration')}
                  items={[
                    {
                      key: 'project',
                      label: `프로젝트 (${exploreFeaturedProjects.length}/5)`,
                      children: (
                        <div>
                          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Typography.Text type="secondary">
                              최대 5개까지 노출됩니다.
                            </Typography.Text>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => openExploreModal('project')}
                              disabled={exploreFeaturedProjects.length >= exploreFeaturedLimit}
                            >
                              추가
                            </Button>
                          </Space>
                          <Table
                            columns={exploreColumns}
                            dataSource={exploreFeaturedProjects}
                            loading={loading}
                            rowKey="id"
                            pagination={false}
                            scroll={{ x: 1000 }}
                            onRow={(record) => ({
                              draggable: true,
                              onDragStart: () => setDraggingExploreKey(getExploreKey(record)),
                              onDragOver: (e) => e.preventDefault(),
                              onDrop: () => {
                                void handleExploreDrop('project', record.id);
                              },
                              onDragEnd: () => setDraggingExploreKey(null),
                              style: { cursor: 'move' },
                            })}
                          />
                        </div>
                      ),
                    },
                    {
                      key: 'collaboration',
                      label: `협업 (${exploreFeaturedCollaborations.length}/5)`,
                      children: (
                        <div>
                          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Typography.Text type="secondary">
                              최대 5개까지 노출됩니다.
                            </Typography.Text>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => openExploreModal('collaboration')}
                              disabled={exploreFeaturedCollaborations.length >= exploreFeaturedLimit}
                            >
                              추가
                            </Button>
                          </Space>
                          <Table
                            columns={exploreColumns}
                            dataSource={exploreFeaturedCollaborations}
                            loading={loading}
                            rowKey="id"
                            pagination={false}
                            scroll={{ x: 1000 }}
                            onRow={(record) => ({
                              draggable: true,
                              onDragStart: () => setDraggingExploreKey(getExploreKey(record)),
                              onDragOver: (e) => e.preventDefault(),
                              onDrop: () => {
                                void handleExploreDrop('collaboration', record.id);
                              },
                              onDragEnd: () => setDraggingExploreKey(null),
                              style: { cursor: 'move' },
                            })}
                          />
                        </div>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 상세 모달 */}
      <Modal
        title={activeTab === 'projects' ? '프로젝트 상세' : '협업 상세'}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            닫기
          </Button>,
        ]}
        width={800}
      >
        {selectedItem && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{selectedItem.id}</Descriptions.Item>
            <Descriptions.Item label="제목">{selectedItem.title}</Descriptions.Item>
            <Descriptions.Item label="설명">{selectedItem.description}</Descriptions.Item>
            <Descriptions.Item label="카테고리">
              <Tag color="blue">{selectedItem.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={
                selectedItem.status === 'in_progress' ? 'green' :
                  selectedItem.status === 'open' ? 'blue' :
                    selectedItem.status === 'completed' ? 'default' :
                      selectedItem.status === 'draft' ? 'orange' :
                        selectedItem.status === 'on_hold' ? 'gold' :
                          'default'
              }>
                {STATUS_MAP[selectedItem.status] || selectedItem.status}
              </Tag>
            </Descriptions.Item>

            {activeTab === 'projects' && 'brand_name' in selectedItem && (
              <>
                <Descriptions.Item label="생성자">
                  {getRoleBasedName(selectedItem)}
                  {(() => {
                    const roles = selectedItem.profiles?.roles || [];
                    const validRole = getValidRole(roles);
                    return validRole ? (
                      <Tag color="cyan" style={{ marginLeft: 8 }}>
                        {ROLE_MAP[validRole] || validRole}
                      </Tag>
                    ) : null;
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="브랜드명">{selectedItem.brand_name}</Descriptions.Item>
                <Descriptions.Item label="예산">{selectedItem.budget_range || '-'}</Descriptions.Item>
                <Descriptions.Item label="마감일">
                  {selectedItem.deadline ? dayjs(selectedItem.deadline).format('YYYY-MM-DD') : '-'}
                </Descriptions.Item>
              </>
            )}

            {activeTab === 'collaborations' && 'collabo_type' in selectedItem && (
              <>
                <Descriptions.Item label="생성자">
                  {getRoleBasedName(selectedItem)}
                  {(() => {
                    const roles = selectedItem.profiles?.roles || [];
                    const validRole = getValidRole(roles);
                    return validRole ? (
                      <Tag color="cyan" style={{ marginLeft: 8 }}>
                        {ROLE_MAP[validRole] || validRole}
                      </Tag>
                    ) : null;
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="협업 유형">
                  <Tag color="purple">{selectedItem.collabo_type}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="간단 설명">{selectedItem.brief_description}</Descriptions.Item>
                <Descriptions.Item label="키워드">{selectedItem.skills.join(', ')}</Descriptions.Item>
                <Descriptions.Item label="요구사항">
                  {selectedItem.requirements.map((req, idx) => (
                    <div key={idx}>• {req}</div>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="혜택">
                  {selectedItem.benefits.map((benefit, idx) => (
                    <div key={idx}>• {benefit}</div>
                  ))}
                </Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="정원">{selectedItem.capacity || 0}</Descriptions.Item>
            <Descriptions.Item label="태그">
              {selectedItem.tags.map((tag, idx) => (
                <Tag key={idx}>{tag}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="커버 이미지">
              {selectedItem.cover_image_url ? (
                <img
                  src={selectedItem.cover_image_url}
                  alt="cover"
                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = '<span style="color: #999;">이미지를 불러올 수 없습니다</span>';
                  }}
                />
              ) : (
                <span style={{ color: '#999' }}>커버 이미지 없음</span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="생성일">
              {dayjs(selectedItem.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="수정일">
              {dayjs(selectedItem.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title={`Explore 상단노출 추가 - ${activeExploreType === 'project' ? '프로젝트' : '협업'}`}
        open={exploreModalVisible}
        onCancel={() => {
          setExploreModalVisible(false);
          exploreForm.resetFields();
        }}
        onOk={handleAddExploreFeatured}
        okText="추가"
        cancelText="취소"
        destroyOnHidden
      >
        <Form
          form={exploreForm}
          layout="vertical"
        >
          <Form.Item
            label="항목"
            name="itemId"
            rules={[{ required: true, message: '항목을 선택하세요.' }]}
          >
            <Select
              showSearch
              placeholder="검색"
              optionFilterProp="label"
              options={exploreItemOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
