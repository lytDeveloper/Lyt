import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Input,
  Space,
  Typography,
  Tag,
  Select,
  Button,
  Modal,
  Descriptions,
  message,
  Alert,
  Divider,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import type { ColumnsType } from 'antd/es/table';
import { deleteUserAccount } from '../services/accountDeletionService';

const { Title, Text } = Typography;
const { Search } = Input;

type DeletionStatus = 'pending' | 'approved' | 'rejected';

interface AccountDeletionRequest {
  id: string;
  user_id: string;
  reason: string | null;
  requested_at: string;
  processed_at: string | null;
  status: DeletionStatus;
  processed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountDeletionWithMeta extends AccountDeletionRequest {
  user_email?: string;
  user_nickname?: string;
  processor_name?: string;
}

interface AdminMeta {
  profile_id: string;
  permissions: string[];
  role: 'admin' | 'super_admin';
  username?: string | null;
}

const statusOptions: { label: string; value: DeletionStatus | 'all' }[] = [
  { label: '전체 상태', value: 'all' },
  { label: '대기 중', value: 'pending' },
  { label: '승인됨', value: 'approved' },
  { label: '거부됨', value: 'rejected' },
];

const statusLabels: Record<DeletionStatus, string> = {
  pending: '대기 중',
  approved: '승인됨',
  rejected: '거부됨',
};

const statusColors: Record<DeletionStatus, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

export default function AccountDeletions() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<AccountDeletionWithMeta[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<DeletionStatus | 'all'>('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccountDeletionWithMeta | null>(null);
  const [processNotes, setProcessNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  const loadCurrentAdmin = async (): Promise<AdminMeta> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('관리자 인증 정보가 필요합니다. 다시 로그인해주세요.');
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('profile_id, permissions, role, username')
      .eq('profile_id', user.id)
      .single();

    if (error || !admin) {
      throw new Error('관리자 정보를 불러오는 데 실패했어요.');
    }

    return admin as AdminMeta;
  };

  const loadRequests = async () => {
    setLoading(true);
    setInitialLoadError(null);
    try {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const requestsData: AccountDeletionWithMeta[] = data ?? [];

      // 사용자 정보 로드
      const userIds = Array.from(new Set(requestsData.map((req) => req.user_id)));
      let userMap: Record<string, { email?: string; nickname?: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, nickname')
          .in('user_id', userIds);

        if (!profileError && profiles) {
          profiles.forEach((profile) => {
            userMap[profile.user_id] = { nickname: profile.nickname };
          });
        }

        // auth.users에서 이메일 정보 가져오기 (관리자 권한 필요)
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          authUsers.users.forEach((user) => {
            if (userMap[user.id]) {
              userMap[user.id].email = user.email;
            } else {
              userMap[user.id] = { email: user.email };
            }
          });
        }
      }

      // 처리자 정보 로드
      const processorIds = Array.from(
        new Set(
          requestsData
            .map((req) => req.processed_by)
            .filter((value): value is string => Boolean(value))
        )
      );

      let processorNameMap: Record<string, string> = {};

      if (processorIds.length > 0) {
        const { data: admins, error: adminError } = await supabase
          .from('admins')
          .select('profile_id, username')
          .in('profile_id', processorIds);

        if (!adminError && admins) {
          admins.forEach((admin) => {
            processorNameMap[admin.profile_id] = admin.username || '관리자';
          });
        }
      }

      // 메타 정보 추가
      const enrichedRequests = requestsData.map((req) => ({
        ...req,
        user_email: userMap[req.user_id]?.email,
        user_nickname: userMap[req.user_id]?.nickname,
        processor_name: req.processed_by ? processorNameMap[req.processed_by] : undefined,
      }));

      setRequests(enrichedRequests);
    } catch (error: unknown) {
      console.error('계정 삭제 요청 로드 실패:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.';
      setInitialLoadError(errorMessage);
      message.error(`데이터 로드 실패: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest || !currentAdminId) return;

    setProcessing(true);
    try {
      // 승인된 경우 실제 계정 삭제 프로세스 시작
      if (action === 'approved') {
        // 확인 다이얼로그
        Modal.confirm({
          title: '계정 삭제 확인',
          content: (
            <div>
              <p>정말로 이 계정을 삭제하시겠습니까?</p>
              <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                이 작업은 되돌릴 수 없으며, 모든 사용자 데이터가 영구적으로 삭제됩니다.
              </p>
              <ul style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
                <li>프로필 및 프로필 이미지</li>
                <li>작성한 프로젝트 및 협업</li>
                <li>메시지 및 댓글</li>
                <li>알림 및 활동 내역</li>
              </ul>
            </div>
          ),
          okText: '삭제',
          okType: 'danger',
          cancelText: '취소',
          onOk: async () => {
            try {
              // Edge Function 호출하여 실제 계정 삭제
              const result = await deleteUserAccount(
                selectedRequest.user_id,
                selectedRequest.id,
                processNotes
              );

              if (!result.success) {
                throw new Error(result.error || '계정 삭제에 실패했습니다.');
              }

              message.success({
                content: (
                  <div>
                    <div>계정이 성공적으로 삭제되었습니다.</div>
                    {result.deletedData && (
                      <div style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                        삭제된 데이터: 프로필 {result.deletedData.profiles}건, 프로젝트{' '}
                        {result.deletedData.projects}건, 협업 {result.deletedData.collaborations}건
                      </div>
                    )}
                  </div>
                ),
                duration: 5,
              });

              setDetailModalVisible(false);
              setProcessNotes('');
              setSelectedRequest(null);
              setProcessing(false);
              loadRequests();
            } catch (error: unknown) {
              console.error('계정 삭제 실패:', error);
              const errorMessage =
                error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
              message.error(`계정 삭제 실패: ${errorMessage}`);
              setProcessing(false);
            }
          },
          onCancel: () => {
            setProcessing(false);
          },
        });
        return; // Modal.confirm이 비동기로 처리되므로 여기서 return
      } else {
        // 거부된 경우
        const { error } = await supabase
          .from('account_deletion_requests')
          .update({
            status: action,
            processed_at: new Date().toISOString(),
            processed_by: currentAdminId,
            notes: processNotes || null,
          })
          .eq('id', selectedRequest.id);

        if (error) throw error;

        message.success('계정 삭제 요청이 거부되었어요.');

        setDetailModalVisible(false);
        setProcessNotes('');
        setSelectedRequest(null);
        loadRequests();
      }
    } catch (error: unknown) {
      console.error('요청 처리 실패:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.';
      message.error(`처리 실패: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

    useEffect(() => {
      const init = async () => {
        try {
          const admin = await loadCurrentAdmin();
          setCurrentAdminId(admin.profile_id);

          // 권한 체크 (super_admin 또는 user_management 권한 필요)
          const hasPerm = admin.role === 'super_admin' || admin.permissions?.includes('user_management');
          setHasPermission(hasPerm);
          setPermissionChecked(true);

          if (hasPerm) {
            await loadRequests();
          } else {
            setInitialLoadError('이 페이지에 접근할 권한이 없어요.');
          }
        } catch (error: unknown) {
          console.error('초기화 실패:', error);
          const errorMessage =
            error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.';
          setInitialLoadError(errorMessage);
          setPermissionChecked(true);
        }
      };
      init();
    }, []);

    const filteredRequests = requests.filter((req) => {
      const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
      const matchesSearch =
        !searchText ||
        req.user_email?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.user_nickname?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.reason?.toLowerCase().includes(searchText.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    const columns: ColumnsType<AccountDeletionWithMeta> = [
      {
        title: '요청일',
        dataIndex: 'requested_at',
        key: 'requested_at',
        width: 120,
        render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
        sorter: (a, b) => dayjs(a.requested_at).unix() - dayjs(b.requested_at).unix(),
      },
      {
        title: '사용자',
        key: 'user',
        width: 200,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 500 }}>{record.user_nickname || '알 수 없음'}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.user_email || '-'}</div>
          </div>
        ),
      },
      {
        title: '삭제 사유',
        dataIndex: 'reason',
        key: 'reason',
        ellipsis: true,
        render: (reason: string | null) => reason || '-',
      },
      {
        title: '상태',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: DeletionStatus) => (
          <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
        ),
      },
      {
        title: '처리일',
        dataIndex: 'processed_at',
        key: 'processed_at',
        width: 120,
        render: (date: string | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '처리자',
        dataIndex: 'processor_name',
        key: 'processor_name',
        width: 100,
        render: (name: string | undefined) => name || '-',
      },
      {
        title: '작업',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Button
            type="link"
            onClick={() => {
              setSelectedRequest(record);
              setProcessNotes(record.notes || '');
              setDetailModalVisible(true);
            }}
          >
            상세보기
          </Button>
        ),
      },
    ];

    if (!permissionChecked) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text>권한 확인 중...</Text>
        </div>
      );
    }

    if (initialLoadError) {
      return (
        <Card>
          <Alert message="오류" description={initialLoadError} type="error" showIcon />
        </Card>
      );
    }

    if (!hasPermission) {
      return (
        <Card>
          <Alert
            message="접근 권한 없음"
            description="이 페이지에 접근할 권한이 없어요."
            type="warning"
            showIcon
          />
        </Card>
      );
    }

    return (
      <div>
        <Title level={2}>계정 삭제 요청 관리</Title>
        <Card>
          <Space style={{ marginBottom: 16 }} size="middle">
            <Search
              placeholder="이메일, 닉네임, 사유 검색"
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              style={{ width: 150 }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
            />
            <Button onClick={loadRequests}>새로고침</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={filteredRequests}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `총 ${total}건`,
            }}
          />
        </Card>

        {/* 상세 모달 */}
        <Modal
          title="계정 삭제 요청 상세"
          open={detailModalVisible}
          onCancel={() => {
            setDetailModalVisible(false);
            setProcessNotes('');
            setSelectedRequest(null);
          }}
          width={700}
          footer={
            selectedRequest?.status === 'pending'
              ? [
                <Button
                  key="reject"
                  danger
                  onClick={() => handleProcessRequest('rejected')}
                  loading={processing}
                >
                  거부
                </Button>,
                <Button
                  key="approve"
                  type="primary"
                  onClick={() => handleProcessRequest('approved')}
                  loading={processing}
                >
                  승인
                </Button>,
              ]
              : [
                <Button
                  key="close"
                  onClick={() => {
                    setDetailModalVisible(false);
                    setProcessNotes('');
                    setSelectedRequest(null);
                  }}
                >
                  닫기
                </Button>,
              ]
          }
        >
          {selectedRequest && (
            <>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="사용자 ID">
                  {selectedRequest.user_id}
                </Descriptions.Item>
                <Descriptions.Item label="닉네임">
                  {selectedRequest.user_nickname || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="이메일">
                  {selectedRequest.user_email || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="요청일">
                  {dayjs(selectedRequest.requested_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="상태">
                  <Tag color={statusColors[selectedRequest.status]}>
                    {statusLabels[selectedRequest.status]}
                  </Tag>
                </Descriptions.Item>
                {selectedRequest.processed_at && (
                  <Descriptions.Item label="처리일">
                    {dayjs(selectedRequest.processed_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
                {selectedRequest.processor_name && (
                  <Descriptions.Item label="처리자">
                    {selectedRequest.processor_name}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="삭제 사유">
                  {selectedRequest.reason || '(사유 없음)'}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              {selectedRequest.status === 'pending' ? (
                <>
                  <Title level={5}>처리 메모</Title>
                  <TextArea
                    rows={4}
                    placeholder="처리 메모를 입력하세요 (선택사항)"
                    value={processNotes}
                    onChange={(e) => setProcessNotes(e.target.value)}
                  />
                  <Alert
                    style={{ marginTop: 16 }}
                    message="⚠️ 주의사항"
                    description="승인 시 사용자 계정 및 관련 데이터가 삭제됩니다. 신중하게 검토 후 처리해주세요."
                    type="warning"
                    showIcon
                  />
                </>
              ) : (
                selectedRequest.notes && (
                  <>
                    <Title level={5}>처리 메모</Title>
                    <Text>{selectedRequest.notes}</Text>
                  </>
                )
              )}
            </>
          )}
        </Modal>
      </div>
    );
  }
