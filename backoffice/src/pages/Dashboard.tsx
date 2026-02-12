import { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Spin, Select } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { DashboardStats, AdminAllUsersView } from '../types/database.types';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalArtists: 0,
    totalBrands: 0,
    totalCreatives: 0,
    totalFans: 0,
    pendingApprovals: 0,
  });
  const [recentUsers, setRecentUsers] = useState<AdminAllUsersView[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminAllUsersView[]>([]);
  const [dailyData, setDailyData] = useState<Array<{ date: string; 가입자수: number }>>([]);
  const [userTypeData, setUserTypeData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [userTypeFilter, setUserTypeFilter] = useState<string | undefined>(undefined);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string | undefined>(undefined);
  const [lastAccessMap, setLastAccessMap] = useState<Record<string, string | null>>({});

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 통계 데이터 로드
      await Promise.all([
        loadStats(),
        loadRecentUsers(),
        loadDailySignups(),
      ]);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadStats = async () => {
    // 아티스트 수
    const { count: artistCount } = await supabase
      .from('profile_artists')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 브랜드 수
    const { count: brandCount } = await supabase
      .from('profile_brands')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 크리에이티브 수
    const { count: creativeCount } = await supabase
      .from('profile_creatives')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 팬 수
    const { count: fanCount } = await supabase
      .from('profile_fans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 승인 대기 중인 브랜드
    const { count: pendingCount } = await supabase
      .from('profile_brands')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending');

    const totalUsers = (artistCount || 0) + (brandCount || 0) + (creativeCount || 0) + (fanCount || 0);

    setStats({
      totalUsers,
      totalArtists: artistCount || 0,
      totalBrands: brandCount || 0,
      totalCreatives: creativeCount || 0,
      totalFans: fanCount || 0,
      pendingApprovals: pendingCount || 0,
    });

    // 사용자 타입 분포 데이터
    setUserTypeData([
      { name: '아티스트', value: artistCount || 0, color: '#1890ff' },
      { name: '브랜드', value: brandCount || 0, color: '#52c41a' },
      { name: '크리에이티브', value: creativeCount || 0, color: '#faad14' },
      { name: '팬', value: fanCount || 0, color: '#eb2f96' },
    ]);
  };

  const loadRecentUsers = async () => {
    const { data, error } = await supabase
      .from('admin_all_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // last_access 정보 가져오기
      const profileIds = data.map(user => user.profile_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, last_access')
        .in('id', profileIds);

      const accessMap: Record<string, string | null> = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          accessMap[profile.id] = profile.last_access;
        });
      }
      setLastAccessMap(accessMap);

      // last_access 정보를 추가한 데이터 생성
      const usersWithAccess = data.map(user => ({
        ...user,
        last_access: accessMap[user.profile_id] || null,
      }));

      setRecentUsers(usersWithAccess);
      setFilteredUsers(usersWithAccess);
    }
  };

  // 필터 적용
  useEffect(() => {
    let filtered = [...recentUsers];

    if (userTypeFilter) {
      filtered = filtered.filter(user => user.user_type === userTypeFilter);
    }

    if (approvalStatusFilter) {
      filtered = filtered.filter(user => user.approval_status === approvalStatusFilter);
    }

    setFilteredUsers(filtered);
  }, [userTypeFilter, approvalStatusFilter, recentUsers]);

  // 통계 카드 클릭 핸들러
  const handleStatisticClick = (tab: string) => {
    if (tab === 'brands_pending') {
      navigate('/approvals');
      return;
    }
    if (tab === 'all_users') {
      navigate('/users');
      return;
    }
    navigate('/users', { state: { activeTab: tab } });
  };


  const loadDailySignups = async () => {
    // 최근 7일 데이터
    const days = 7;
    const dailyStats = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day');
      const startOfDay = date.startOf('day').toISOString();
      const endOfDay = date.endOf('day').toISOString();

      // 각 타입별 가입자 수 조회
      const [artists, brands, creatives, fans] = await Promise.all([
        supabase
          .from('profile_artists')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('profile_brands')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('profile_creatives')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        supabase
          .from('profile_fans')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
      ]);

      const total = (artists.count || 0) + (brands.count || 0) + (creatives.count || 0) + (fans.count || 0);

      dailyStats.push({
        date: date.format('MM/DD'),
        가입자수: total,
      });
    }

    setDailyData(dailyStats);
  };

  const userTypeLabels: Record<string, string> = {
    artist: '아티스트',
    brand: '브랜드',
    creative: '크리에이티브',
    fan: '팬',
  };

  const approvalStatusLabels: Record<string, string> = {
    pending: '대기중',
    approved: '승인',
    rejected: '거절',
  };

  const columns = [
    {
      title: '타입',
      dataIndex: 'user_type',
      key: 'user_type',
      render: (type: string) => userTypeLabels[type] || type,
    },
    {
      title: '이름',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '상태',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (status: string, record: AdminAllUsersView) => {
        // 브랜드만 승인 상태 표시
        if (record.user_type === 'brand') {
          return approvalStatusLabels[status] || status;
        }
        return ''; // 승인이 필요없는 타입은 빈 문자열 반환
      },
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '최근 접속일',
      dataIndex: 'last_access',
      key: 'last_access',
      render: (lastAccess: string | null, record: AdminAllUsersView) => {
        const access = lastAccess || lastAccessMap[record.profile_id];
        if (!access) return <span style={{ color: '#999' }}>접속 기록 없음</span>;
        return dayjs(access).format('YYYY-MM-DD HH:mm');
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large">
          <div style={{ padding: 50 }}>
            <p style={{ marginTop: 16 }}>데이터 로딩 중...</p>
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>대시보드</Title>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable onClick={() => handleStatisticClick('all_users')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="전체 사용자"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable onClick={() => handleStatisticClick('artists')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="아티스트"
              value={stats.totalArtists}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable onClick={() => handleStatisticClick('brands')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              <Statistic style={{ width: '50%' }}
                title="브랜드"
                value={stats.totalBrands}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable onClick={() => handleStatisticClick('brands_pending')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              <Statistic
                title="승인 대기"
                value={stats.pendingApprovals}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card hoverable onClick={() => handleStatisticClick('creatives')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="크리에이티브"
              value={stats.totalCreatives}
              prefix={<BulbOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        {/* <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => handleStatisticClick('brands')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="승인 대기"
              value={stats.pendingApprovals}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col> */}
      </Row>

      {/* 차트 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="최근 7일 신규 가입자">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="가입자수" stroke="#1890ff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="사용자 타입별 분포">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 최근 가입자 목록 */}
      <Card
        title="최근 가입자"
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Select
              placeholder="사용자 유형"
              allowClear
              style={{ width: 150 }}
              value={userTypeFilter}
              onChange={setUserTypeFilter}
              options={[
                { label: '아티스트', value: 'artist' },
                { label: '브랜드', value: 'brand' },
                { label: '크리에이티브', value: 'creative' },
                { label: '팬', value: 'fan' },
              ]}
            />
            <Select
              placeholder="승인 상태"
              allowClear
              style={{ width: 120 }}
              value={approvalStatusFilter}
              onChange={setApprovalStatusFilter}
              options={[
                { label: '대기중', value: 'pending' },
                { label: '승인', value: 'approved' },
                { label: '거절', value: 'rejected' },
              ]}
            />
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey={(record) => `${record.user_type}-${record.profile_id}`}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

