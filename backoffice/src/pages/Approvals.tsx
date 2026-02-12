import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Descriptions, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { checkIsAdmin } from '../utils/auth';
import type { ProfileBrand } from '../types/database.types';
import dayjs from 'dayjs';
const { Title, Text } = Typography;
import axios from 'axios';

// 사업자 등록번호 조회 API 응답 타입
interface BusinessStatusResponse {
  status_code: string;
  match_cnt: number;
  request_cnt: number;
  valid_cnt: number;
  data: Array<{
    b_no: string;
    b_stt: string;
    b_stt_cd: string;
    tax_type: string;
    tax_type_cd: string;
    end_dt: string;
    utcc_yn: string;
  }>;
}

export default function Approvals() {
  const [modal, modalContextHolder] = Modal.useModal();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<ProfileBrand | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  // 사업자 등록번호별 조회 결과를 저장하는 상태
  const [businessStatusMap, setBusinessStatusMap] = useState<Record<string, string | null>>({});
  // 조회 중인 사업자 등록번호를 추적하는 상태
  const [checkingBusinessNumbers, setCheckingBusinessNumbers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPendingBrands();
    (async () => {
      const admin = await checkIsAdmin();
      setCanApprove(!!admin?.permissions?.includes('approval_management'));
    })();
  }, []);

  const loadPendingBrands = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_brands')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setBrands(data || []);
    } catch (error) {
      console.error('승인 대기 목록 로드 실패:', error);
      message.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const checkBusinessRegistrationNumber = async (businessRegistrationNumber: string): Promise<BusinessStatusResponse | null> => {
    try {
      const data = {
        "b_no": [businessRegistrationNumber.replaceAll('-', '')],
      };
      const response = await axios.post<BusinessStatusResponse>(
        "https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=58beb90cd78f1c934f1d287faa44079bdd286ed5353a0ba1b3dfa619500e2ab7",
        data
      );
      return response.data;
    } catch (error) {
      console.error('사업자 등록번호 조회 실패:', error);
      message.error('사업자 등록번호 조회에 실패했습니다.');
      return null;
    }
  };

  const handleCheckBusinessNumber = async (businessRegistrationNumber: string) => {
    // 이미 조회 중이면 중복 요청 방지
    if (checkingBusinessNumbers.has(businessRegistrationNumber)) {
      return;
    }

    setCheckingBusinessNumbers(prev => new Set(prev).add(businessRegistrationNumber));

    const result = await checkBusinessRegistrationNumber(businessRegistrationNumber);

    console.log('사업자 등록번호 조회 결과:', result);

    if (result && result.data && result.data.length > 0) {
      const statusCode = result.data[0].b_stt_cd;
      console.log('상태 코드:', statusCode);
      setBusinessStatusMap(prev => ({
        ...prev,
        [businessRegistrationNumber]: statusCode
      }));
    } else {
      console.log('조회 결과 없음 또는 데이터 없음');
      setBusinessStatusMap(prev => ({
        ...prev,
        [businessRegistrationNumber]: null
      }));
    }

    setCheckingBusinessNumbers(prev => {
      const newSet = new Set(prev);
      newSet.delete(businessRegistrationNumber);
      return newSet;
    });
  };

  const handleApprove = (brand: ProfileBrand) => {
    console.log('handleApprove called', brand);
    modal.confirm({
      title: '승인 확인',
      content: `${brand.brand_name} 브랜드를 승인하시겠습니까?`,
      okText: '승인',
      cancelText: '취소',
      onOk: async () => {
        try {
          const admin = await checkIsAdmin();
          if (!admin) {
            message.error('관리자 권한이 필요합니다.');
            return Promise.reject(new Error('관리자 권한이 필요합니다.'));
          }

          const updateData = {
            approval_status: 'approved' as const,
            approved_at: new Date().toISOString(),
            approved_by: admin.profile_id,
          };

          const { error } = await supabase
            .from('profile_brands')
            .update(updateData)
            .eq('profile_id', brand.profile_id);

          if (error) throw error;

          message.success('승인되었습니다.');
          loadPendingBrands();
          return Promise.resolve();
        } catch (error) {
          console.error('승인 실패:', error);
          message.error('승인에 실패했습니다.');
          return Promise.reject(error);
        }
      },
    });
  };

  const handleReject = (brand: ProfileBrand) => {
    console.log('handleReject called', brand);
    modal.confirm({
      title: '거절 확인',
      content: `${brand.brand_name} 브랜드를 거절하시겠습니까?`,
      okText: '거절',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          const admin = await checkIsAdmin();
          if (!admin) {
            message.error('관리자 권한이 필요합니다.');
            return Promise.reject(new Error('관리자 권한이 필요합니다.'));
          }

          const updateData = {
            approval_status: 'rejected' as const,
            approved_at: new Date().toISOString(),
            approved_by: admin.profile_id,
          };

          const { error } = await supabase
            .from('profile_brands')
            .update(updateData)
            .eq('profile_id', brand.profile_id);

          if (error) throw error;

          message.success('거절되었습니다.');
          loadPendingBrands();
          return Promise.resolve();
        } catch (error) {
          console.error('거절 실패:', error);
          message.error('거절 처리에 실패했습니다.');
          return Promise.reject(error);
        }
      },
    });
  };

  const showDetailModal = (brand: ProfileBrand) => {
    setSelectedBrand(brand);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: '브랜드명',
      dataIndex: 'brand_name',
      key: 'brand_name',
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '웹사이트',
      dataIndex: 'website_url',
      key: 'website_url',
      render: (url: string | null) => url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : '-',
    },
    {
      title: '신청일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '사업자 등록번호',
      dataIndex: 'business_registration_number',
      key: 'business_registration_number',
      render: (businessRegistrationNumber: string) => {
        const statusCode = businessStatusMap[businessRegistrationNumber];
        const isChecking = checkingBusinessNumbers.has(businessRegistrationNumber);

        return (
          <div>
            {businessRegistrationNumber}
            <Button
              type="link"
              loading={isChecking}
              onClick={() => handleCheckBusinessNumber(businessRegistrationNumber)}
            >
              조회
            </Button>
            {statusCode !== null && statusCode !== undefined && (
              statusCode === '01'
                ? <Tag color="green">계속사업자</Tag>
                : <Tag color="red">휴/폐업 사업자</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_: unknown, record: ProfileBrand) => (
        <Space>
          <Button
            size="small"
            onClick={() => showDetailModal(record)}
          >
            상세보기
          </Button>
          {canApprove && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record)}
              >
                승인
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handleReject(record)}
              >
                거절
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {modalContextHolder}
      <Title level={2}>브랜드 승인 관리</Title>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">
              승인 대기 중인 브랜드: <Text strong>{brands.length}개</Text>
            </Text>
          </div>

          <Table
            columns={columns}
            dataSource={brands}
            rowKey={(record: ProfileBrand) => `${record.profile_id}`}
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: '승인 대기 중인 브랜드가 없습니다.',
            }}
          />
        </Space>
      </Card>

      {/* 상세보기 모달 */}
      <Modal
        title="브랜드 상세 정보"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          selectedBrand && (
            <Space>
              <Button onClick={() => setDetailModalVisible(false)}>닫기</Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => {
                  handleApprove(selectedBrand);
                  setDetailModalVisible(false);
                }}
              >
                승인
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  handleReject(selectedBrand);
                  setDetailModalVisible(false);
                }}
              >
                거절
              </Button>
            </Space>
          )
        }
        width={800}
      >
        {selectedBrand && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Profile ID">{selectedBrand.profile_id}</Descriptions.Item>
            <Descriptions.Item label="브랜드명">{selectedBrand.brand_name}</Descriptions.Item>
            <Descriptions.Item label="카테고리">{selectedBrand.activity_field}</Descriptions.Item>
            <Descriptions.Item label="로고">
              {selectedBrand.logo_image_url ? (
                <img src={selectedBrand.logo_image_url} alt="로고" style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }} />
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="커버 이미지">
              {selectedBrand.cover_image_url ? (
                <img src={selectedBrand.cover_image_url} alt="커버 이미지" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }} />
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="웹사이트">
              {selectedBrand.website_url ? (
                <a href={selectedBrand.website_url} target="_blank" rel="noreferrer">{selectedBrand.website_url}</a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="SNS 채널">
              {selectedBrand.sns_channel ? (
                <a href={selectedBrand.sns_channel} target="_blank" rel="noreferrer">{selectedBrand.sns_channel}</a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="연락처 정보">
              {selectedBrand.contact_info || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="신청일">
              {dayjs(selectedBrand.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="설립일">
              {selectedBrand.established_at ? dayjs(selectedBrand.established_at).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="승인 상태">
              <Tag color={
                selectedBrand.approval_status === 'approved' ? 'green' :
                  selectedBrand.approval_status === 'rejected' ? 'red' : 'orange'
              }>
                {selectedBrand.approval_status === 'approved' ? '승인' :
                  selectedBrand.approval_status === 'rejected' ? '거절' : '대기중'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

