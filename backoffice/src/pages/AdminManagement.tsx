import { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, message, Table, Space, Typography, Tag, Modal, Result, Checkbox, Row, Col } from 'antd';
import { UserAddOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';
import { checkIsAdmin } from '../utils/auth';
import type { Admin, AdminPermission } from '../types/database.types';
import dayjs from 'dayjs';
import { generateOTP, storeOTP, verifyOTP } from '../utils/otp';
import { logAdminActivity } from '../utils/adminActivity';

const { Title } = Typography;

interface EmailSearchResult {
  id: string;
  email: string;
  username?: string | null;
}

export default function AdminManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [newAdminPermissions, setNewAdminPermissions] = useState<AdminPermission[]>([]);

  // 권한 관리
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, AdminPermission[]>>({});
  const [permissionUpdateLoading, setPermissionUpdateLoading] = useState<Record<string, boolean>>({});

  // 2FA 모달
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [generatedOTP, setGeneratedOTP] = useState<string>('');

  // 이메일 검색
  const [emailSearchLoading, setEmailSearchLoading] = useState(false);
  const [emailSearchResults, setEmailSearchResults] = useState<EmailSearchResult[]>([]);

  // 권한 목록
  const permissionLabels: Record<AdminPermission, string> = {
    user_management: '사용자 관리',
    content_management: '콘텐츠 관리',
    statistics_view: '통계 조회',
    approval_management: '승인 관리',
    admin_management: '관리자 관리',
    system_settings: '시스템 설정',
    log_view: '로그 조회',
    inquiry_management: '문의 관리',
    feedback_management: '피드백 관리',
  };

  const allPermissions: AdminPermission[] = [
    'user_management',
    'content_management',
    'statistics_view',
    'approval_management',
    'admin_management',
    'system_settings',
    'log_view',
    'inquiry_management',
    'feedback_management',
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentAdmin?.role === 'super_admin' || currentAdmin?.permissions.includes('admin_management')) {
      loadAdmins();
    }
  }, [refreshKey, currentAdmin]);

  const checkAuth = async () => {
    const admin = await checkIsAdmin();
    setCurrentAdmin(admin);
    setCheckingAuth(false);

    // if (!admin || admin.role !== 'super_admin') {
    //   alert('슈퍼 관리자만 이 페이지에 접근할 수 있습니다.');
    //   navigate('/');
    // }
  };

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select(`
          profile_id,
          email,
          role,
          permissions,
          created_at,
          updated_at,
          profiles!inner (
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      type AdminRowWithProfile = Admin & {
        profiles?: {
          username: string | null;
        } | {
          username: string | null;
        }[] | null;
      };

      const adminsData: Admin[] = ((data as unknown as AdminRowWithProfile[]) ?? []).map(({ profiles, ...admin }) => ({
        ...admin,
        username: Array.isArray(profiles)
          ? profiles[0]?.username ?? null
          : profiles?.username ?? null,
      }));
      setAdmins(adminsData);
      // 권한 초기화
      const permissionsMap: Record<string, AdminPermission[]> = {};
      adminsData.forEach((admin) => {
        permissionsMap[admin.profile_id] = admin.permissions || [];
      });
      setSelectedPermissions(permissionsMap);
    } catch (error) {
      console.error('관리자 목록 로드 실패:', error);
      message.error('관리자 목록을 불러오는데 실패했어요.');
    }
  };

  // 권한 토글
  const togglePermissionRow = (adminProfileId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(adminProfileId)) {
      newExpanded.delete(adminProfileId);
    } else {
      newExpanded.add(adminProfileId);
    }
    setExpandedRows(newExpanded);
  };

  // 권한 변경
  const handlePermissionChange = (adminProfileId: string, permission: AdminPermission, checked: boolean) => {
    const current = selectedPermissions[adminProfileId] || [];
    const updated = checked
      ? [...current, permission]
      : current.filter((p) => p !== permission);

    setSelectedPermissions((prev) => ({
      ...prev,
      [adminProfileId]: updated,
    }));
  };

  // 권한 업데이트 저장
  const handleSavePermissions = async (adminProfileId: string, targetAdmin: Admin) => {
    // 동등 등급 관리자 체크
    if (currentAdmin && targetAdmin.role === currentAdmin.role && targetAdmin.profile_id !== currentAdmin.profile_id) {
      // 2FA 인증 필요
      await requestOTPAuth(() => {
        savePermissionsWithAuth(adminProfileId, targetAdmin);
      });
      return;
    }

    await savePermissionsWithAuth(adminProfileId, targetAdmin);
  };

  const savePermissionsWithAuth = async (adminProfileId: string, targetAdmin: Admin) => {
    setPermissionUpdateLoading((prev) => ({ ...prev, [adminProfileId]: true }));

    try {
      const permissions = selectedPermissions[adminProfileId] || [];

      const { error } = await supabase
        .from('admins')
        .update({ permissions })
        .eq('profile_id', adminProfileId);

      if (error) throw error;

      // 활동 로그 기록
      await logAdminActivity(
        currentAdmin!.profile_id,
        'update_permissions',
        adminProfileId,
        {
          target_email: targetAdmin.email,
          permissions,
        }
      );

      toast.success('권한이 수정되었어요.', {
        position: 'top-center',
        autoClose: 2000,
      });

      // 펼쳐진 행 접기
      const newExpanded = new Set(expandedRows);
      newExpanded.delete(adminProfileId);
      setExpandedRows(newExpanded);

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('권한 업데이트 실패:', error);
      toast.error('권한 업데이트에 실패했어요.');
    } finally {
      setPermissionUpdateLoading((prev) => ({ ...prev, [adminProfileId]: false }));
    }
  };

  // 2FA 인증 요청
  const requestOTPAuth = async (action: () => void) => {
    if (!currentAdmin) {
      toast.error('관리자 정보를 찾을 수 없어요.');
      return;
    }

    const otp = generateOTP();
    storeOTP(otp);
    setGeneratedOTP(otp);
    setPendingAction(() => action);
    setOtpModalVisible(true);

    // 실제 이메일로 OTP 전송
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('세션이 만료되었어요. 다시 로그인해주세요.');
        return;
      }

      const { error } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: currentAdmin.email,
          otp: otp,
        },
      });

      if (error) {
        console.error('이메일 전송 실패:', error);
        toast.error('이메일 전송에 실패했어요. OTP 코드를 확인해주세요.');
        // 개발 환경에서는 토스트에 OTP 표시
        if (import.meta.env.DEV) {
          toast.info(`개발용 OTP 코드: ${otp}`);
        }
      } else {
        toast.success('인증 코드가 이메일로 전송되었어요.');
      }
    } catch (error) {
      console.error('이메일 전송 중 오류:', error);
      toast.error('이메일 전송 중 오류가 발생했어요. OTP 코드를 확인해주세요.');
      // 개발 환경에서는 토스트에 OTP 표시
      if (import.meta.env.DEV) {
        toast.info(`개발용 OTP 코드: ${otp}`);
      }
    }
  };

  // OTP 검증
  const handleOTPVerify = async () => {
    if (!otpInput) {
      toast.warning('OTP 코드를 입력해주세요.');
      return;
    }

    setOtpVerifying(true);
    try {
      if (verifyOTP(otpInput)) {
        toast.success('인증이 완료되었어요.');
        setOtpModalVisible(false);
        setOtpInput('');
        if (pendingAction) {
          pendingAction();
          setPendingAction(null);
        }
      } else {
        toast.error('OTP 코드가 올바르지 않거나 만료되었어요.');
      }
    } catch (error) {
      console.error('OTP 검증 실패:', error);
      toast.error('OTP 검증에 실패했어요.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // 이메일 검색
  const emailSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailSearch = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailSearchResults([]);
      return;
    }

    setEmailSearchLoading(true);
    try {
      //profiles 테이블에서 검색
      const { data, error } = await supabase
        .from('profiles')
        .select('username, email, id')
        .ilike('email', `%${email}%`)
        .limit(5);

      if (error) throw error;
      setEmailSearchResults(data || []);
    } catch (error) {
      console.error('이메일 검색 실패:', error);
      toast.error('이메일 검색에 실패했어요.');
    } finally {
      setEmailSearchLoading(false);
    }
  };

  const handleEmailInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;

    // 폼 값 동기화
    addForm.setFieldsValue({ email_search: value });

    // 5글자 미만이면 검색 결과 초기화 및 타이머 취소
    if (value.length < 5) {
      if (emailSearchTimeoutRef.current) {
        clearTimeout(emailSearchTimeoutRef.current);
        emailSearchTimeoutRef.current = null;
      }
      setEmailSearchResults([]);
      return;
    }

    // 기존 타이머가 있으면 취소
    if (emailSearchTimeoutRef.current) {
      clearTimeout(emailSearchTimeoutRef.current);
    }

    // 300ms 디바운스 후 검색 실행
    emailSearchTimeoutRef.current = setTimeout(() => {
      handleEmailSearch(value);
    }, 300);
  };

  const handleAddAdmin = async (values: { profile_id: string; email: string; permissions?: AdminPermission[] }) => {
    setLoading(true);
    try {
      // 1. 현재 사용자가 super_admin인지 확인
      const currentAdmin = await checkIsAdmin();
      if (!currentAdmin || (currentAdmin.role !== 'super_admin' && !currentAdmin.permissions.includes('admin_management'))) {
        toast.error('관리자 관리 권한이 없어요.');
        return;
      }

      // 2. admins 테이블에 추가 (기본 role은 'admin')
      const { data, error } = await supabase
        .from('admins')
        .insert({
          profile_id: values.profile_id,
          email: values.email,
          role: 'admin' as const,
          permissions: values.permissions || [],
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          toast.error('이미 등록된 관리자입니다.');
        } else {
          throw error;
        }
        return;
      }

      // 활동 로그 기록
      await logAdminActivity(
        currentAdmin.profile_id,
        'add_admin',
        data.profile_id,
        {
          new_email: values.email,
          permissions: values.permissions || [],
        }
      );

      toast.success('관리자가 추가되었어요.');
      addForm.resetFields();
      setNewAdminPermissions([]);
      setEmailSearchResults([]);
      setAddModalVisible(false);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('관리자 생성 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '관리자 생성에 실패했어요.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminProfileId: string, adminEmail: string, targetAdmin: Admin) => {
    // 일반 관리자가 슈퍼 관리자를 삭제하려고 시도하는 경우 막기
    if (currentAdmin && currentAdmin.role !== 'super_admin' && targetAdmin.role === 'super_admin') {
      toast.error('일반 관리자는 슈퍼 관리자를 삭제할 수 없어요.');
      return;
    }

    Modal.confirm({
      title: '관리자 삭제',
      content: `${adminEmail} 관리자를 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        // 동등 등급 관리자 체크  
        if (currentAdmin && targetAdmin.role === currentAdmin.role && targetAdmin.profile_id !== currentAdmin.profile_id) {
          await requestOTPAuth(async () => {
            await deleteAdminWithAuth(adminProfileId, adminEmail, targetAdmin);
          });
          return;
        }

        await deleteAdminWithAuth(adminProfileId, adminEmail, targetAdmin);
      },
    });
  };

  const deleteAdminWithAuth = async (adminProfileId: string, adminEmail: string, targetAdmin: Admin) => {
    try {
      const currentAdmin = await checkIsAdmin();
      if (!currentAdmin || (currentAdmin.role !== 'super_admin' && !currentAdmin.permissions.includes('admin_management'))) {
        toast.error('관리자 관리 권한이 없어요.');
        return;
      }

      // 일반 관리자가 슈퍼 관리자를 삭제하려고 시도하는 경우 막기
      if (currentAdmin.role !== 'super_admin' && targetAdmin.role === 'super_admin') {
        toast.error('일반 관리자는 슈퍼 관리자를 삭제할 수 없어요.');
        return;
      }

      // 활동 로그를 먼저 기록 (관리자 삭제 전에)
      await logAdminActivity(
        currentAdmin.profile_id,
        'delete_admin',
        adminProfileId,
        {
          deleted_email: adminEmail,
        }
      );

      // 그 다음 관리자 삭제
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('profile_id', adminProfileId);

      if (error) throw error;

      toast.success('관리자가 삭제되었어요.');
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('관리자 삭제 실패:', error);
      toast.error('관리자 삭제에 실패했어요.');
    }
  };

  const columns = [
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '사용자명',
      dataIndex: 'username',
      key: 'username',
      render: (username: string | null | undefined) => username || '-',
    },
    {
      title: 'User ID',
      dataIndex: 'profile_id',
      key: 'profile_id',
      render: (profileId: string) => (
        <Typography.Text code style={{ fontSize: 12 }}>
          {profileId.substring(0, 8)}...
        </Typography.Text>
      ),
    },
    {
      title: '역할',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'super_admin' ? 'red' : 'blue'}>
          {role === 'super_admin' ? '슈퍼 관리자' : '관리자'}
        </Tag>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '작업',
      key: 'action',
      render: (_: unknown, record: Admin) => {
        const isExpanded = expandedRows.has(record.profile_id);
        const canDelete = (currentAdmin?.role === 'super_admin' || currentAdmin?.permissions.includes('admin_management'))
          && (currentAdmin?.role === 'super_admin' || record.role !== 'super_admin');
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => togglePermissionRow(record.profile_id)}
            >
              {isExpanded ? '권한 접기' : '권한 보기'}
            </Button>
            {canDelete && (
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.profile_id, record.email, record)}
              >
                삭제
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // 권한 확인 중
  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Card>권한 확인 중...</Card>
      </div>
    );
  }

  // 관리자 관리 권한이 없는 경우
  if (!currentAdmin || (currentAdmin.role !== 'super_admin' && !currentAdmin.permissions.includes('admin_management'))) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="죄송합니다. 권한이 있어야만 페이지에 접근할 수 있어요."
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            대시보드로 돌아가기
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Title level={2}>관리자 관리</Title>

      <Card
        title="관리자 목록"
        extra={
          (currentAdmin?.role === 'super_admin' || currentAdmin?.permissions.includes('admin_management')) && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setAddModalVisible(true)}
            >
              새 관리자 추가
            </Button>
          )
        }
      >
        <Table
          columns={columns}
          dataSource={admins}
          rowKey="profile_id"
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowKeys: Array.from(expandedRows),
            onExpandedRowsChange: (expandedKeys) => {
              setExpandedRows(new Set(expandedKeys as string[]));
            },
            expandedRowRender: (record: Admin) => {
              const permissions = selectedPermissions[record.profile_id] || [];
              const isUpdating = permissionUpdateLoading[record.profile_id] || false;

              return (
                <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: '12px' }}>
                    권한 관리
                  </Typography.Text>
                  <Row gutter={[16, 8]}>
                    {allPermissions.map((permission) => (
                      <Col span={12} key={permission}>
                        <Checkbox
                          checked={permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(record.profile_id, permission, e.target.checked)}
                        >
                          {permissionLabels[permission]}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                  <Space style={{ marginTop: '16px' }}>
                    <Button
                      type="primary"
                      size="small"
                      loading={isUpdating}
                      onClick={() => handleSavePermissions(record.profile_id, record)}
                    >
                      저장
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        // 원래 권한으로 복원
                        setSelectedPermissions((prev) => ({
                          ...prev,
                          [record.profile_id]: record.permissions || [],
                        }));
                      }}
                    >
                      취소
                    </Button>
                  </Space>
                </div>
              );
            },
            expandRowByClick: false,
          }}
        />
      </Card>

      {/* 새 관리자 추가 모달 */}
      <Modal
        title="새 관리자 추가"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          addForm.resetFields();
          setNewAdminPermissions([]);
          setEmailSearchResults([]);
        }}
        footer={null}
        width={600}
      >


        <Form
          form={addForm}
          layout="vertical"
          onFinish={(values) => handleAddAdmin({ ...values, permissions: newAdminPermissions })}
        >
          <Form.Item
            label="이메일 검색"
            name="email_search"
          >
            <Input.Search
              placeholder="이메일을 입력하여 사용자 검색"
              allowClear
              onChange={handleEmailInputChange}
              loading={emailSearchLoading}
            />
          </Form.Item>

          {emailSearchResults.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                검색 결과:
              </Typography.Text>
              {emailSearchResults.map((result) => (
                <div
                  key={result.id}
                  style={{
                    padding: 8,
                    marginBottom: 4,
                    backgroundColor: 'white',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    addForm.setFieldsValue({
                      profile_id: result.id,
                      email: result.email,
                    });
                    setEmailSearchResults([]);
                  }}
                >
                  <Typography.Text>이름: {result.username}<br /></Typography.Text>
                  <Typography.Text>이메일: {result.email}<br /></Typography.Text>
                  <Typography.Text>ID: {result.id}</Typography.Text>
                </div>
              ))}
            </div>
          )}

          <Form.Item
            label="Profile ID (UUID)"
            name="profile_id"
            rules={[
              { required: true, message: 'Profile ID를 입력해주세요.' },
              { pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message: '올바른 UUID 형식이 아닙니다.' },
            ]}
          >
            <Input placeholder="00000000-0000-0000-0000-000000000000" />
          </Form.Item>

          <Form.Item
            label="이메일"
            name="email"
            rules={[
              { required: true, message: '이메일을 입력해주세요.' },
              { type: 'email', message: '올바른 이메일 형식이 아니에요.' },
            ]}
          >
            <Input placeholder="admin@example.com" />
          </Form.Item>

          <Form.Item label="권한">
            <Row gutter={[16, 8]}>
              {allPermissions.map((permission) => (
                <Col span={12} key={permission}>
                  <Checkbox
                    checked={newAdminPermissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewAdminPermissions((prev) => [...prev, permission]);
                      } else {
                        setNewAdminPermissions((prev) => prev.filter((p) => p !== permission));
                      }
                    }}
                  >
                    {permissionLabels[permission]}
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<UserAddOutlined />}>
                추가
              </Button>
              <Button onClick={() => {
                setAddModalVisible(false);
                addForm.resetFields();
              }}>
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 2FA OTP 모달 */}
      <Modal
        title="2단계 인증"
        open={otpModalVisible}
        onCancel={() => {
          setOtpModalVisible(false);
          setOtpInput('');
          setPendingAction(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setOtpModalVisible(false);
            setOtpInput('');
            setPendingAction(null);
          }}>
            취소
          </Button>,
          <Button key="verify" type="primary" loading={otpVerifying} onClick={handleOTPVerify}>
            인증
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Typography.Text>
            동등한 등급의 관리자를 변경하려면 2단계 인증이 필요합니다.
          </Typography.Text>
          <Typography.Text>
            이메일로 전송된 인증 코드를 입력해주세요.
          </Typography.Text>
          {import.meta.env.DEV && generatedOTP && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              개발용: OTP 코드는 {generatedOTP}
            </Typography.Text>
          )}
          <Input
            placeholder="OTP 코드를 입력하세요"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            maxLength={6}
          />
        </Space>
      </Modal>
    </div>
  );
}

