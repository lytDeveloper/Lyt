import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Button, Typography, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  FileSearchOutlined,
  NotificationOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  AppstoreOutlined,
  ProjectOutlined,
  FileTextOutlined,
  DeleteOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { signOut, checkIsAdmin } from '../utils/auth';
import type { Admin } from '../types/database.types';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    const loadAdmin = async () => {
      const adminData = await checkIsAdmin();
      setAdmin(adminData);
    };
    loadAdmin();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '대시보드',
      onClick: () => navigate('/'),
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '사용자 관리',
      onClick: () => navigate('/users'),
    },
    // 문의 관리 권한을 가진 관리자에게만 표시
    ...(admin?.role === 'super_admin' || admin?.permissions?.includes('inquiry_management')
      ? [{
        key: '/inquiries',
        icon: <QuestionCircleOutlined />,
        label: '문의 관리',
        onClick: () => navigate('/inquiries'),
      },
      {
        key: '/reports',
        icon: <WarningOutlined />,
        label: '신고 관리',
        onClick: () => navigate('/reports'),
      },
      {
        key: '/account-deletions',
        icon: <DeleteOutlined />,
        label: '계정 삭제 관리',
        onClick: () => navigate('/account-deletions'),
      }]
      : []),
    // 피드백 관리 권한을 가진 관리자에게만 표시
    ...(admin?.role === 'super_admin' || admin?.permissions?.includes('feedback_management')
      ? [{
        key: '/feedbacks',
        icon: <CommentOutlined />,
        label: '피드백 관리',
        onClick: () => navigate('/feedbacks'),
      }]
      : []),
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '프로젝트/협업',
      onClick: () => navigate('/projects'),
    },
    {
      key: '/approvals',
      icon: <CheckCircleOutlined />,
      label: '승인 관리',
      onClick: () => navigate('/approvals'),
    },
    {
      key: '/notifications',
      icon: <NotificationOutlined />,
      label: '공지/업데이트',
      onClick: () => navigate('/notifications'),
    },
    // 콘텐츠 관리 권한이 있는 경우에만 라잇 화면 관리 메뉴 표시
    ...(admin?.role === 'super_admin' || admin?.permissions?.includes('content_management') ? [
      {
        key: '/homepage',
        icon: <AppstoreOutlined />,
        label: '라잇 화면 관리',
        onClick: () => navigate('/homepage'),
      },
      {
        key: '/magazines',
        icon: <FileTextOutlined />,
        label: '매거진 관리',
        onClick: () => navigate('/magazines'),
      },
    ] : []),
    // 로그 조회 권한이 있는 경우에만 로그 메뉴 표시
    ...(admin?.role === 'super_admin' || admin?.permissions?.includes('log_view') ? [{
      key: '/logs',
      icon: <FileSearchOutlined />,
      label: '활동 로그',
      onClick: () => navigate('/logs'),
    }] : []),
    // permissions 컬럼에 "admin_management" 권한이 있는 관리자에게만 관리자 관리 메뉴 표시
    ...(admin?.role === 'super_admin' || admin?.permissions?.includes('admin_management') ? [{
      key: '/admins',
      icon: <SettingOutlined />,
      label: '관리자 관리',
      onClick: () => navigate('/admins'),
    }] : []),
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 18 : 20,
          fontWeight: 'bold',
        }}>
          {collapsed ? 'B' : 'Bridge'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: 16,
              width: 64,
              height: 64,
            }}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}>
              <Avatar icon={<UserOutlined />} />
              <div style={{ marginTop: '-15px' }}>
                <Text strong>{admin?.email || '관리자'}</Text>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: 'block', lineHeight: 1.15, marginTop: '-15px' }}
                >
                  {admin?.role === 'super_admin' ? '슈퍼 관리자' : '관리자'}
                </Text>
              </div>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: '24px 16px',
          padding: 24,
          minHeight: 280,
          background: '#f0f2f5',
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

