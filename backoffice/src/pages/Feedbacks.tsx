import { useEffect, useMemo, useState } from 'react';
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
  Rate,
  Popconfirm,
} from 'antd';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import type { Feedback, FeedbackStatus } from '../types/database.types';

const { Title, Text } = Typography;
const { Search } = Input;

type FeedbackWithMeta = Feedback & {
  responder_name?: string | null;
};

type AdminMeta = {
  profile_id: string;
  permissions: string[];
  role: 'admin' | 'super_admin';
  username?: string | null;
};

const statusOptions: { label: string; value: FeedbackStatus | 'all' }[] = [
  { label: '전체 상태', value: 'all' },
  { label: '답변 대기', value: 'pending' },
  { label: '처리 중', value: 'in_progress' },
  { label: '완료', value: 'resolved' },
  { label: '거부', value: 'rejected' },
];

const statusLabels: Record<FeedbackStatus, string> = {
  pending: '답변 대기',
  in_progress: '처리 중',
  resolved: '완료',
  rejected: '거부',
};

const statusColors: Record<FeedbackStatus, string> = {
  pending: 'orange',
  in_progress: 'blue',
  resolved: 'green',
  rejected: 'red',
};

export default function Feedbacks() {
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackWithMeta[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithMeta | null>(null);
  const [responseStatus, setResponseStatus] = useState<FeedbackStatus>('pending');
  const [savingResponse, setSavingResponse] = useState(false);
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
      throw new Error('관리자 정보를 불러오는 데 실패했습니다.');
    }

    return admin as AdminMeta;
  };

  const loadFeedbacks = async () => {
    setLoading(true);
    setInitialLoadError(null);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const feedbacksData: FeedbackWithMeta[] = data ?? [];

      // 답변자 이름 매핑 (배치 조회)
      const responderIds = Array.from(
        new Set(
          feedbacksData
            .map((feedback) => feedback.responder_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let responderNameMap: Record<string, string> = {};

      if (responderIds.length > 0) {
        const { data: responders, error: responderError } = await supabase
          .from('admins')
          .select('profile_id, username, email')
          .in('profile_id', responderIds);

        if (!responderError && responders) {
          responderNameMap = responders.reduce<Record<string, string>>((acc, responder) => {
            acc[responder.profile_id] = responder.username || responder.email || '관리자';
            return acc;
          }, {});
        }
      }

      setFeedbacks(
        feedbacksData.map((feedback) => ({
          ...feedback,
          responder_name: feedback.responder_id ? responderNameMap[feedback.responder_id] ?? null : null,
        }))
      );
    } catch (error: any) {
      console.error('피드백 목록 로드 실패:', error);
      setInitialLoadError(error.message || '피드백 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const admin = await loadCurrentAdmin();
        const permissions = admin.permissions ?? [];
        const allowed = admin.role === 'super_admin' || permissions.includes('feedback_management');

        if (!allowed) {
          throw new Error('피드백 관리 권한이 없습니다. 시스템 관리자에게 권한을 요청하세요.');
        }

        setCurrentAdminId(admin.profile_id);
        setHasPermission(true);
        await loadFeedbacks();
      } catch (error: any) {
        console.error('피드백 관리 초기화 실패:', error);
        const messageText = error.message || '피드백 관리 권한이 없습니다. 시스템 관리자에게 문의하세요.';
        setInitialLoadError(messageText);
        setHasPermission(false);
        setLoading(false);
      } finally {
        setPermissionChecked(true);
      }
    };

    initialize();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((feedback) => {
      const matchesSearch = searchText
        ? [feedback.title, feedback.content, feedback.feedback_type]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(searchText.toLowerCase()))
        : true;

      const matchesStatus = filterStatus === 'all' ? true : feedback.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [feedbacks, searchText, filterStatus]);

  const statsByStatus = useMemo(() => {
    return feedbacks.reduce<Record<FeedbackStatus, number>>(
      (acc, feedback) => {
        acc[feedback.status] += 1;
        return acc;
      },
      { pending: 0, in_progress: 0, resolved: 0, rejected: 0 }
    );
  }, [feedbacks]);

  const openFeedbackModal = (feedback: FeedbackWithMeta) => {
    setSelectedFeedback(feedback);
    setResponseStatus(feedback.status);
    setDetailModalVisible(true);
  };

  const handleCloseModal = () => {
    setDetailModalVisible(false);
    setSelectedFeedback(null);
    setResponseStatus('pending');
  };

  const handleSaveResponse = async () => {
    if (!selectedFeedback) return;

    try {
      setSavingResponse(true);

      let responderId = currentAdminId;

      if (!responderId) {
        const admin = await loadCurrentAdmin();
        responderId = admin.profile_id;
        setCurrentAdminId(admin.profile_id);
      }

      const respondedAt = ['resolved', 'rejected'].includes(responseStatus)
        ? new Date().toISOString()
        : selectedFeedback.responded_at;

      const { error } = await supabase
        .from('feedbacks')
        .update({
          status: responseStatus,
          responder_id: responderId,
          responded_at: respondedAt,
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      message.success('피드백 상태가 업데이트되었습니다.');
      await loadFeedbacks();
      handleCloseModal();
    } catch (error: any) {
      console.error('상태 업데이트 실패:', error);
      message.error(error.message || '상태 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSavingResponse(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      message.success('피드백이 완전히 삭제되었습니다.');
      await loadFeedbacks();
    } catch (error: any) {
      console.error('피드백 삭제 실패:', error);
      message.error(error.message || '피드백 삭제 중 오류가 발생했습니다.');
    }
  };

  const columns = [
    {
      title: '피드백 유형',
      dataIndex: 'feedback_type',
      key: 'feedback_type',
      render: (type: string) => <Tag color="geekblue">{type}</Tag>,
    },
    {
      title: '만족도',
      dataIndex: 'satisfaction_rating',
      key: 'satisfaction_rating',
      render: (rating: number | null) =>
        rating ? <Rate disabled value={rating} style={{ fontSize: 14 }} /> : <Text type="secondary">-</Text>,
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: FeedbackStatus) => <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>,
    },
    {
      title: '담당자',
      dataIndex: 'responder_name',
      key: 'responder_name',
      render: (value: string | null) => value || '-',
    },
    {
      title: '제출일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '답변일',
      dataIndex: 'responded_at',
      key: 'responded_at',
      render: (date: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: FeedbackWithMeta) => (
        <Space size="small">
          <Button type="link" onClick={() => openFeedbackModal(record)}>
            상세 / 답변
          </Button>
          <Popconfirm
            title="피드백 삭제"
            description="이 피드백을 완전히 삭제하시겠습니까? 복구할 수 없습니다."
            onConfirm={() => handleDeleteFeedback(record.id)}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>피드백 관리</Title>

      {permissionChecked && !hasPermission ? (
        <Alert
          type="error"
          message={initialLoadError || '피드백 관리 권한이 없습니다.'}
          showIcon
          style={{ marginTop: 16 }}
        />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Search
                  placeholder="제목 또는 내용으로 검색"
                  allowClear
                  enterButton
                  onSearch={setSearchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ maxWidth: 360 }}
                />

                <Space size="middle">
                  <Select
                    value={filterStatus}
                    options={statusOptions}
                    onChange={(value) => setFilterStatus(value as FeedbackStatus | 'all')}
                    style={{ width: 160 }}
                  />
                  <Button onClick={loadFeedbacks}>새로고침</Button>
                </Space>
              </Space>

              <Space size="large">
                <Tag color="orange">대기 {statsByStatus.pending}</Tag>
                <Tag color="blue">처리 중 {statsByStatus.in_progress}</Tag>
                <Tag color="green">완료 {statsByStatus.resolved}</Tag>
                <Tag color="red">거부 {statsByStatus.rejected}</Tag>
              </Space>
            </Space>
          </Card>

          {initialLoadError && (
            <Alert type="error" message={initialLoadError} showIcon closable onClose={() => setInitialLoadError(null)} />
          )}

          <Card>
            <Table
              columns={columns}
              dataSource={filteredFeedbacks}
              rowKey={(record) => record.id}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `총 ${total}건` }}
            />
          </Card>
        </Space>
      )}

      <Modal
        title="피드백 상세"
        open={detailModalVisible}
        onCancel={handleCloseModal}
        width={720}
        footer={null}
        destroyOnClose
      >
        {selectedFeedback && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="피드백 유형">{selectedFeedback.feedback_type}</Descriptions.Item>
              <Descriptions.Item label="만족도">
                {selectedFeedback.satisfaction_rating ? (
                  <Rate disabled value={selectedFeedback.satisfaction_rating} />
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="답변받을 이메일">
                {selectedFeedback.email ? (
                  <a href={`mailto:${selectedFeedback.email}`} style={{ color: '#1890ff' }}>
                    {selectedFeedback.email}
                  </a>
                ) : (
                  <Text type="secondary">이메일 없음</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="제목">{selectedFeedback.title}</Descriptions.Item>
              <Descriptions.Item label="피드백 내용">
                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.content}</div>
              </Descriptions.Item>
              <Descriptions.Item label="제출일">
                {dayjs(selectedFeedback.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="현재 상태">
                <Tag color={statusColors[selectedFeedback.status]}>{statusLabels[selectedFeedback.status]}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0' }} />

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space size="middle" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <div>
                  <Text strong>처리 상태 변경</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    이메일로 답변 후 상태를 변경하세요
                  </Text>
                </div>
                <Select<FeedbackStatus>
                  value={responseStatus}
                  onChange={setResponseStatus}
                  options={statusOptions
                    .filter((option) => option.value !== 'all')
                    .map((option) => ({
                      value: option.value as FeedbackStatus,
                      label: option.label,
                    }))}
                  style={{ minWidth: 160 }}
                />
              </Space>

              <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Button onClick={handleCloseModal}>취소</Button>
                <Button type="primary" onClick={handleSaveResponse} loading={savingResponse}>
                  상태 저장
                </Button>
              </Space>
            </Space>
          </Space>
        )}
      </Modal>
    </div>
  );
}
