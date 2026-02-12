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
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import type { Inquiry, InquiryStatus, InquiryType } from '../types/database.types';

const { Title, Text } = Typography;
const { Search } = Input;

type InquiryWithMeta = Inquiry & {
  manager_name?: string | null;
};

type AdminMeta = {
  profile_id: string;
  permissions: string[];
  role: 'admin' | 'super_admin';
  username?: string | null;
};

const inquiryTypeOptions: { label: string; value: InquiryType | 'all' }[] = [
  { label: '전체 유형', value: 'all' },
  { label: '제재 해제 요청', value: 'ban_appeal' },
  { label: '일반 문의', value: 'general' },
  { label: '계정 관련', value: 'account' },
  { label: '프로젝트 관련', value: 'project' },
  { label: '결제/정산', value: 'payment' },
  { label: '버그 신고', value: 'bug' },
  { label: '기술 문의', value: 'technical' },
  { label: '기타', value: 'other' },
];

const statusOptions: { label: string; value: InquiryStatus | 'all' }[] = [
  { label: '전체 상태', value: 'all' },
  { label: '답변 대기', value: 'pending' },
  { label: '처리 중', value: 'in_progress' },
  { label: '답변 완료', value: 'resolved' },
  { label: '종료', value: 'closed' },
];

const inquiryTypeLabels: Record<InquiryType, string> = {
  ban_appeal: '제재 해제 요청',
  general: '일반 문의',
  account: '계정 관련',
  project: '프로젝트 관련',
  payment: '결제/정산',
  bug: '버그 신고',
  technical: '기술 문의',
  other: '기타',
};

const statusLabels: Record<InquiryStatus, string> = {
  pending: '답변 대기',
  in_progress: '처리 중',
  resolved: '답변 완료',
  closed: '종료',
};

const statusColors: Record<InquiryStatus, string> = {
  pending: 'orange',
  in_progress: 'blue',
  resolved: 'green',
  closed: 'default',
};

export default function Inquiries() {
  const [loading, setLoading] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryWithMeta[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<InquiryType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | 'all'>('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryWithMeta | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [answerStatus, setAnswerStatus] = useState<InquiryStatus>('pending');
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const loadInquiries = async () => {
    setLoading(true);
    setInitialLoadError(null);
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select(
          'inquiry_id, user_id, username, nickname, email, inquiry_type, subject, contents, created_at, status, manager_profile_id, answered_at, answer_content, attachments'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const inquiriesData: InquiryWithMeta[] = (data ?? []).map((item) => ({
        ...item,
        attachments: item.attachments ?? [],
      }));

      // 관리자 이름 매핑
      const managerIds = Array.from(
        new Set(
          inquiriesData
            .map((inquiry) => inquiry.manager_profile_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let managerNameMap: Record<string, string> = {};

      if (managerIds.length > 0) {
        const { data: managers, error: managerError } = await supabase
          .from('admins')
          .select('profile_id, username, email')
          .in('profile_id', managerIds);

        if (!managerError && managers) {
          managerNameMap = managers.reduce<Record<string, string>>((acc, manager) => {
            acc[manager.profile_id] = manager.username || manager.email || '관리자';
            return acc;
          }, {});
        }
      }

      setInquiries(
        inquiriesData.map((inquiry) => ({
          ...inquiry,
          manager_name: inquiry.manager_profile_id ? managerNameMap[inquiry.manager_profile_id] ?? null : null,
        }))
      );
    } catch (error: any) {
      console.error('문의 목록 로드 실패:', error);
      setInitialLoadError(error.message || '문의 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const admin = await loadCurrentAdmin();
        const permissions = admin.permissions ?? [];
        const allowed = admin.role === 'super_admin' || permissions.includes('inquiry_management');

        if (!allowed) {
          throw new Error('문의 관리 권한이 없습니다. 시스템 관리자에게 권한을 요청하세요.');
        }

        setCurrentAdminId(admin.profile_id);
        setHasPermission(true);
        await loadInquiries();
      } catch (error: any) {
        console.error('문의 관리 초기화 실패:', error);
        const messageText = error.message || '문의 관리 권한이 없습니다. 시스템 관리자에게 문의하세요.';
        setInitialLoadError(messageText);
        setHasPermission(false);
        setLoading(false);
      } finally {
        setPermissionChecked(true);
      }
    };

    initialize();
  }, []);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inquiry) => {
      const matchesSearch = searchText
        ? [inquiry.username, inquiry.subject, inquiry.contents]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(searchText.toLowerCase()))
        : true;

      const matchesType = filterType === 'all' ? true : inquiry.inquiry_type === filterType;
      const matchesStatus = filterStatus === 'all' ? true : inquiry.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [inquiries, searchText, filterType, filterStatus]);

  const statsByStatus = useMemo(() => {
    return inquiries.reduce<Record<InquiryStatus, number>>(
      (acc, inquiry) => {
        acc[inquiry.status] += 1;
        return acc;
      },
      { pending: 0, in_progress: 0, resolved: 0, closed: 0 }
    );
  }, [inquiries]);

  const openInquiryModal = (inquiry: InquiryWithMeta) => {
    setSelectedInquiry(inquiry);
    setAnswerContent(inquiry.answer_content ?? '');
    setAnswerStatus(inquiry.status);
    setDetailModalVisible(true);
  };

  const handleCloseModal = () => {
    setDetailModalVisible(false);
    setSelectedInquiry(null);
    setAnswerContent('');
    setAnswerStatus('pending');
  };

  const handleSaveAnswer = async () => {
    if (!selectedInquiry) return;
    if (!answerContent.trim()) {
      message.warning('답변 내용을 입력해주세요.');
      return;
    }

    try {
      setSavingAnswer(true);

      let managerId = currentAdminId;

      if (!managerId) {
        const admin = await loadCurrentAdmin();
        managerId = admin.profile_id;
        setCurrentAdminId(admin.profile_id);
      }

      const answeredAt = ['resolved', 'closed'].includes(answerStatus)
        ? new Date().toISOString()
        : selectedInquiry.answered_at;

      const { error } = await supabase
        .from('inquiries')
        .update({
          answer_content: answerContent.trim(),
          status: answerStatus,
          manager_profile_id: managerId,
          answered_at: answeredAt,
        })
        .eq('inquiry_id', selectedInquiry.inquiry_id);

      if (error) throw error;

      message.success('답변이 저장되었습니다.');
      await loadInquiries();
      handleCloseModal();
    } catch (error: any) {
      console.error('답변 저장 실패:', error);
      message.error(error.message || '답변 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingAnswer(false);
    }
  };

  const columns = [
    {
      title: '문의 유형',
      dataIndex: 'inquiry_type',
      key: 'inquiry_type',
      render: (type: InquiryType) => <Tag color="geekblue">{inquiryTypeLabels[type]}</Tag>,
    },
    {
      title: '제목',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: '작성자',
      dataIndex: 'username',
      key: 'username',
      render: (value: string | null) => value || '(이름 없음)',
    },
    {
      title: '닉네임',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (value: string | null) => value || '(닉네임 없음)',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: InquiryStatus) => <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>,
    },
    {
      title: '담당자',
      dataIndex: 'manager_name',
      key: 'manager_name',
      render: (value: string | null) => value || '-',
    },
    {
      title: '문의일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '답변일',
      dataIndex: 'answered_at',
      key: 'answered_at',
      render: (date: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: InquiryWithMeta) => (
        <Button type="link" onClick={() => openInquiryModal(record)}>
          상세 / 답변
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>문의 관리</Title>

      {permissionChecked && !hasPermission ? (
        <Alert
          type="error"
          message={initialLoadError || '문의 관리 권한이 없습니다.'}
          showIcon
          style={{ marginTop: 16 }}
        />
      ) : (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
              <Search
                placeholder="이름 또는 제목으로 검색"
                allowClear
                enterButton
                onSearch={setSearchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ maxWidth: 360 }}
              />

              <Space size="middle">
                <Select
                  value={filterType}
                  options={inquiryTypeOptions}
                  onChange={(value) => setFilterType(value as InquiryType | 'all')}
                  style={{ width: 180 }}
                />
                <Select
                  value={filterStatus}
                  options={statusOptions}
                  onChange={(value) => setFilterStatus(value as InquiryStatus | 'all')}
                  style={{ width: 160 }}
                />
                <Button onClick={loadInquiries}>새로고침</Button>
              </Space>
            </Space>

            <Space size="large">
              <Tag color="orange">대기 {statsByStatus.pending}</Tag>
              <Tag color="blue">처리 중 {statsByStatus.in_progress}</Tag>
              <Tag color="green">완료 {statsByStatus.resolved}</Tag>
              <Tag>종료 {statsByStatus.closed}</Tag>
            </Space>
          </Space>
        </Card>

        {initialLoadError && (
          <Alert type="error" message={initialLoadError} showIcon closable onClose={() => setInitialLoadError(null)} />
        )}

        <Card>
          <Table
            columns={columns}
            dataSource={filteredInquiries}
            rowKey={(record) => record.inquiry_id}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `총 ${total}건` }}
          />
        </Card>
      </Space>
      )}

      <Modal
        title="문의 상세"
        open={detailModalVisible}
        onCancel={handleCloseModal}
        width={720}
        footer={null}
        destroyOnHidden
      >
        {selectedInquiry && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="문의 유형">
                {inquiryTypeLabels[selectedInquiry.inquiry_type]}
              </Descriptions.Item>
              <Descriptions.Item label="제목">{selectedInquiry.subject}</Descriptions.Item>
              <Descriptions.Item label="작성자">{selectedInquiry.username || '(이름 없음)'}</Descriptions.Item>
              <Descriptions.Item label="닉네임">{selectedInquiry.nickname || '(닉네임 없음)'}</Descriptions.Item>
              <Descriptions.Item label="이메일">
                {selectedInquiry.email ? (
                  <a href={`mailto:${selectedInquiry.email}`}>{selectedInquiry.email}</a>
                ) : (
                  '(이메일 없음)'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="문의일">
                {dayjs(selectedInquiry.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="현재 상태">
                <Tag color={statusColors[selectedInquiry.status]}>{statusLabels[selectedInquiry.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="문의 내용">
                <div style={{ whiteSpace: 'pre-wrap' }}>{selectedInquiry.contents}</div>
              </Descriptions.Item>
              {Array.isArray(selectedInquiry.attachments) && selectedInquiry.attachments.length > 0 && (
                <Descriptions.Item label="첨부 파일">
                  <Space wrap size="middle">
                    {selectedInquiry.attachments.map((file: any, idx: number) => {
                      // Check if file is a string URL or object with url property
                      const fileUrl = typeof file === 'string' ? file : file.url;
                      const fileName = typeof file === 'string' ? `첨부파일 ${idx + 1}` : (file.name || `첨부파일 ${idx + 1}`);
                      
                      // Check if the file is an image by extension
                      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileUrl);

                      if (isImage) {
                        return (
                          <div key={idx} style={{ textAlign: 'center' }}>
                            <img
                              src={fileUrl}
                              alt={fileName}
                              crossOrigin="anonymous"
                              style={{
                                width: 120,
                                height: 120,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '1px solid #f0f0f0',
                                cursor: 'pointer',
                              }}
                              onClick={() => setPreviewImage(fileUrl)}
                            />
                            <div style={{ fontSize: 12, color: '#666', marginTop: 4, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fileName}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <Button 
                            key={idx} 
                            size="small"
                            onClick={() => window.open(fileUrl, '_blank')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            📎 {fileName}
                          </Button>
                        );
                      }
                    })}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ margin: '16px 0' }} />

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space size="middle" wrap>
                <Text strong>답변 상태</Text>
                <Select<InquiryStatus>
                  value={answerStatus}
                  onChange={setAnswerStatus}
                  options={statusOptions
                    .filter((option) => option.value !== 'all')
                    .map((option) => ({
                      value: option.value as InquiryStatus,
                      label: option.label,
                    }))}
                  style={{ minWidth: 160 }}
                />
              </Space>

              <TextArea
                placeholder="답변 내용을 입력하세요."
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                rows={6}
              />

              <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Button onClick={handleCloseModal}>취소</Button>
                <Button type="primary" onClick={handleSaveAnswer} loading={savingAnswer}>
                  저장
                </Button>
              </Space>
            </Space>
          </Space>
        )}
      </Modal>

      {/* 이미지 미리보기 모달 */}
      <Modal
        open={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        width="auto"
        centered
        styles={{ body: { padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' } }}
      >
        {previewImage && (
          <img
            src={previewImage}
            alt="첨부 이미지"
            crossOrigin="anonymous"
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
          />
        )}
      </Modal>
    </div>
  );
}

