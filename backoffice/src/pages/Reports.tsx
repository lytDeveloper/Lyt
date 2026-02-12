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
    Divider,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;
const { Search } = Input;

// Report types and statuses
type ReportType = 'inappropriate_content' | 'fraud' | 'copyright' | 'communication' | 'other';
type ReportTargetType = 'message' | 'project' | 'collaboration' | 'profile' | 'chat_room';
type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

interface Report {
    id: string;
    reporter_id: string;
    report_type: ReportType;
    reason: string;
    target_type: ReportTargetType;
    target_id: string;
    target_name?: string;
    description?: string;
    evidence_url?: string;
    attachments?: string[];
    status: ReportStatus;
    admin_notes?: string;
    resolved_by?: string;
    resolved_at?: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    reporter_email?: string;
    target_active_role?: string; // profile 타입일 때 활성 role
}

const reportTypeOptions: { label: string; value: ReportType | 'all' }[] = [
    { label: '전체 유형', value: 'all' },
    { label: '부적절한 콘텐츠', value: 'inappropriate_content' },
    { label: '허위·과장 / 사기', value: 'fraud' },
    { label: '저작권·도용', value: 'copyright' },
    { label: '커뮤니케이션 문제', value: 'communication' },
    { label: '기타', value: 'other' },
];

const targetTypeOptions: { label: string; value: ReportTargetType | 'all' }[] = [
    { label: '전체 대상', value: 'all' },
    { label: '메시지', value: 'message' },
    { label: '프로젝트', value: 'project' },
    { label: '협업', value: 'collaboration' },
    { label: '프로필', value: 'profile' },
    { label: '채팅방', value: 'chat_room' },
];

const statusOptions: { label: string; value: ReportStatus | 'all' }[] = [
    { label: '전체 상태', value: 'all' },
    { label: '대기', value: 'pending' },
    { label: '검토 중', value: 'reviewing' },
    { label: '처리 완료', value: 'resolved' },
    { label: '반려', value: 'dismissed' },
];

const reportTypeLabels: Record<ReportType, string> = {
    inappropriate_content: '부적절한 콘텐츠',
    fraud: '허위·과장 / 사기',
    copyright: '저작권·도용',
    communication: '커뮤니케이션 문제',
    other: '기타',
};

const targetTypeLabels: Record<ReportTargetType, string> = {
    message: '메시지',
    project: '프로젝트',
    collaboration: '협업',
    profile: '프로필',
    chat_room: '채팅방',
};

const statusLabels: Record<ReportStatus, string> = {
    pending: '대기',
    reviewing: '검토 중',
    resolved: '처리 완료',
    dismissed: '반려',
};

const statusColors: Record<ReportStatus, string> = {
    pending: 'orange',
    reviewing: 'blue',
    resolved: 'green',
    dismissed: 'default',
};

// Role 한글 변환
const roleLabels: Record<string, string> = {
    fan: '팬',
    brand: '브랜드',
    artist: '아티스트',
    creative: '크리에이티브',
};

// Role별 태그 색상
const roleColors: Record<string, string> = {
    brand: 'gold',      // 브랜드: 금색
    artist: 'blue',     // 아티스트: 파란색
    creative: 'purple', // 크리에이티브: 보라색
    fan: 'default',     // 팬: 기본 회색
};

// Users 페이지로 이동하는 함수
const navigateToUsers = (searchName: string) => {
    const usersUrl = `${window.location.origin}${window.location.pathname.replace('/reports', '/users')}?search=${encodeURIComponent(searchName)}`;
    window.open(usersUrl, '_blank');
};

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<Report[]>([]);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
    const [targetTypeFilter, setTargetTypeFilter] = useState<ReportTargetType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const loadReports = async () => {
        setLoading(true);
        try {
            // 1. 먼저 reports 조회
            const { data: reportsData, error: reportsError } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (reportsError) throw reportsError;

            if (!reportsData || reportsData.length === 0) {
                setReports([]);
                return;
            }

            // 2. reporter_id 목록 추출 (중복 제거)
            const reporterIds = [...new Set(
                reportsData
                    .map((r) => r.reporter_id)
                    .filter((id: string | null): id is string => id !== null)
            )];

            // 3. profiles에서 이메일 일괄 조회
            const emailMap = new Map<string, string>();
            if (reporterIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .in('id', reporterIds);

                if (profilesError) {
                    console.warn('Failed to load profiles:', profilesError);
                } else if (profilesData) {
                    profilesData.forEach((profile) => {
                        if (profile.id && profile.email) {
                            emailMap.set(profile.id, profile.email);
                        }
                    });
                }
            }

            // 4. profile 타입인 리포트의 target_id 목록 추출
            const profileTargetIds = [...new Set(
                reportsData
                    .filter((r) => r.target_type === 'profile' && r.target_id)
                    .map((r) => r.target_id)
                    .filter((id): id is string => typeof id === 'string')
            )];

            // 5. profile 타입인 경우 활성 role 조회 (일괄 조회로 최적화)
            const activeRoleMap = new Map<string, string>();
            if (profileTargetIds.length > 0) {
                // 각 profile_* 테이블에서 활성 프로필 일괄 조회
                const [fansResult, brandsResult, artistsResult, creativesResult] = await Promise.all([
                    supabase.from('profile_fans').select('profile_id').in('profile_id', profileTargetIds).eq('is_active', true),
                    supabase.from('profile_brands').select('profile_id').in('profile_id', profileTargetIds).eq('is_active', true),
                    supabase.from('profile_artists').select('profile_id').in('profile_id', profileTargetIds).eq('is_active', true),
                    supabase.from('profile_creatives').select('profile_id').in('profile_id', profileTargetIds).eq('is_active', true),
                ]);

                // 각 결과를 Map에 저장 (우선순위: brand > artist > creative > fan)
                // 우선순위가 높은 것부터 처리하여 덮어쓰기 방지
                if (brandsResult.data) {
                    brandsResult.data.forEach((brand) => {
                        activeRoleMap.set(brand.profile_id, 'brand');
                    });
                }
                if (artistsResult.data) {
                    artistsResult.data.forEach((artist) => {
                        // brand가 이미 있으면 덮어쓰지 않음
                        if (!activeRoleMap.has(artist.profile_id)) {
                            activeRoleMap.set(artist.profile_id, 'artist');
                        }
                    });
                }
                if (creativesResult.data) {
                    creativesResult.data.forEach((creative) => {
                        // brand나 artist가 이미 있으면 덮어쓰지 않음
                        if (!activeRoleMap.has(creative.profile_id)) {
                            activeRoleMap.set(creative.profile_id, 'creative');
                        }
                    });
                }
                if (fansResult.data) {
                    fansResult.data.forEach((fan) => {
                        // 다른 role이 이미 있으면 덮어쓰지 않음
                        if (!activeRoleMap.has(fan.profile_id)) {
                            activeRoleMap.set(fan.profile_id, 'fan');
                        }
                    });
                }
            }

            // 6. 리포트 데이터와 이메일, 활성 role 매칭
            const transformedData: Report[] = reportsData.map((report) => ({
                ...report,
                reporter_email: report.reporter_id
                    ? emailMap.get(report.reporter_id) || 'Unknown'
                    : 'Unknown',
                target_active_role: report.target_type === 'profile' && report.target_id
                    ? activeRoleMap.get(report.target_id)
                    : undefined,
            }));

            setReports(transformedData);
        } catch (error) {
            console.error('Failed to load reports:', error);
            message.error('신고 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const filteredReports = useMemo(() => {
        return reports.filter((report) => {
            // Type filter
            if (typeFilter !== 'all' && report.report_type !== typeFilter) return false;
            // Target type filter
            if (targetTypeFilter !== 'all' && report.target_type !== targetTypeFilter) return false;
            // Status filter
            if (statusFilter !== 'all' && report.status !== statusFilter) return false;
            // Search filter
            if (searchText) {
                const searchLower = searchText.toLowerCase();
                return (
                    report.target_name?.toLowerCase().includes(searchLower) ||
                    report.reason?.toLowerCase().includes(searchLower) ||
                    report.description?.toLowerCase().includes(searchLower) ||
                    report.reporter_email?.toLowerCase().includes(searchLower)
                );
            }
            return true;
        });
    }, [reports, typeFilter, targetTypeFilter, statusFilter, searchText]);

    const openReportModal = (report: Report) => {
        setSelectedReport(report);
        setAdminNotes(report.admin_notes || '');
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setSelectedReport(null);
        setAdminNotes('');
    };

    const handleUpdateStatus = async (newStatus: ReportStatus) => {
        if (!selectedReport) return;

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const updateData: Record<string, unknown> = {
                status: newStatus,
                admin_notes: adminNotes || null,
            };

            if (newStatus === 'resolved' || newStatus === 'dismissed') {
                updateData.resolved_by = user?.id;
                updateData.resolved_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('reports')
                .update(updateData)
                .eq('id', selectedReport.id);

            if (error) throw error;

            message.success(`신고가 ${statusLabels[newStatus]}(으)로 변경되었습니다.`);
            handleCloseModal();
            loadReports();
        } catch (error) {
            console.error('Failed to update report:', error);
            message.error('상태 변경에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: '신고 유형',
            dataIndex: 'report_type',
            key: 'report_type',
            width: 140,
            render: (type: ReportType) => (
                <Tag color="blue">{reportTypeLabels[type] || type}</Tag>
            ),
        },
        {
            title: '대상 유형',
            dataIndex: 'target_type',
            key: 'target_type',
            width: 100,
            render: (type: ReportTargetType) => targetTypeLabels[type] || type,
        },
        {
            title: '대상',
            dataIndex: 'target_name',
            key: 'target_name',
            width: 200,
            ellipsis: true,
            render: (value: string | null, record: Report) => {
                if (record.target_type === 'profile' && value) {
                    const activeRole = record.target_active_role;
                    const roleLabel = activeRole ? roleLabels[activeRole] : null;
                    return (
                        <Space>
                            <a
                                onClick={() => navigateToUsers(value)}
                                style={{ cursor: 'pointer', color: '#1890ff' }}
                            >
                                {value}
                            </a>
                            {roleLabel && activeRole && (
                                <Tag color={roleColors[activeRole] || 'default'}>{roleLabel}</Tag>
                            )}
                        </Space>
                    );
                }
                return value || '-';
            },
        },
        {
            title: '사유',
            dataIndex: 'reason',
            key: 'reason',
            width: 200,
            ellipsis: true,
        },
        {
            title: '신고자',
            dataIndex: 'reporter_email',
            key: 'reporter_email',
            width: 180,
            ellipsis: true,
        },
        {
            title: '상태',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: ReportStatus) => (
                <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
            ),
        },
        {
            title: '신고일',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 120,
            render: (date: string) => dayjs(date).format('YY.MM.DD HH:mm'),
        },
        {
            title: '상세',
            key: 'actions',
            width: 80,
            render: (_: unknown, record: Report) => (
                <Button type="link" onClick={() => openReportModal(record)}>
                    상세
                </Button>
            ),
        },
    ];

    return (
        <Card>
            <Title level={4} style={{ marginBottom: 24 }}>신고 관리</Title>

            {/* Filters */}
            <Space wrap style={{ marginBottom: 16 }}>
                <Search
                    placeholder="신고 대상, 사유, 신고자 검색"
                    style={{ width: 240 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                />
                <Select
                    style={{ width: 160 }}
                    options={reportTypeOptions}
                    value={typeFilter}
                    onChange={setTypeFilter}
                />
                <Select
                    style={{ width: 140 }}
                    options={targetTypeOptions}
                    value={targetTypeFilter}
                    onChange={setTargetTypeFilter}
                />
                <Select
                    style={{ width: 120 }}
                    options={statusOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
                <Button onClick={loadReports}>새로고침</Button>
            </Space>

            {/* Table */}
            <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredReports}
                loading={loading}
                pagination={{
                    pageSize: 20,
                    showTotal: (total) => `총 ${total}건`,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 'max-content' }}
            />

            {/* Detail Modal */}
            <Modal
                title="신고 상세"
                open={modalVisible}
                onCancel={handleCloseModal}
                width={600}
                footer={null}
            >
                {selectedReport && (
                    <>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="신고 유형" span={1}>
                                <Tag color="blue">{reportTypeLabels[selectedReport.report_type]}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="대상 유형" span={1}>
                                {targetTypeLabels[selectedReport.target_type]}
                            </Descriptions.Item>
                            <Descriptions.Item label="신고 대상" span={2}>
                                {selectedReport.target_type === 'profile' && selectedReport.target_name ? (
                                    <Space>
                                        <a
                                            onClick={() => navigateToUsers(selectedReport.target_name!)}
                                            style={{ cursor: 'pointer', color: '#1890ff' }}
                                        >
                                            {selectedReport.target_name}
                                        </a>
                                        {selectedReport.target_active_role && (
                                            <Tag color={roleColors[selectedReport.target_active_role] || 'default'}>
                                                {roleLabels[selectedReport.target_active_role]}
                                            </Tag>
                                        )}
                                    </Space>
                                ) : (
                                    selectedReport.target_name || '-'
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="사유" span={2}>
                                {selectedReport.reason}
                            </Descriptions.Item>
                            <Descriptions.Item label="상세 설명" span={2}>
                                {selectedReport.description || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="증거 자료" span={2}>
                                {selectedReport.evidence_url ? (
                                    <a href={selectedReport.evidence_url} target="_blank" rel="noopener noreferrer">
                                        링크 열기
                                    </a>
                                ) : '-'}
                            </Descriptions.Item>
                            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                                <Descriptions.Item label="첨부 파일" span={2}>
                                    <Space direction="vertical">
                                        {selectedReport.attachments.map((url, index) => (
                                            <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                                첨부 파일 {index + 1}
                                            </a>
                                        ))}
                                    </Space>
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label="신고자" span={1}>
                                {selectedReport.reporter_email}
                            </Descriptions.Item>
                            <Descriptions.Item label="신고일시" span={1}>
                                {dayjs(selectedReport.created_at).format('YYYY.MM.DD HH:mm')}
                            </Descriptions.Item>
                            <Descriptions.Item label="상태" span={1}>
                                <Tag color={statusColors[selectedReport.status]}>
                                    {statusLabels[selectedReport.status]}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="처리일시" span={1}>
                                {selectedReport.resolved_at
                                    ? dayjs(selectedReport.resolved_at).format('YYYY.MM.DD HH:mm')
                                    : '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <div style={{ marginBottom: 16 }}>
                            <Text strong>관리자 메모</Text>
                            <TextArea
                                rows={3}
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="관리자 메모를 입력하세요"
                                style={{ marginTop: 8 }}
                            />
                        </div>

                        <Space>
                            {selectedReport.status === 'pending' && (
                                <Button
                                    type="primary"
                                    onClick={() => handleUpdateStatus('reviewing')}
                                    loading={saving}
                                >
                                    검토 시작
                                </Button>
                            )}
                            {(selectedReport.status === 'pending' || selectedReport.status === 'reviewing') && (
                                <>
                                    <Button
                                        type="primary"
                                        style={{ backgroundColor: '#52c41a' }}
                                        onClick={() => handleUpdateStatus('resolved')}
                                        loading={saving}
                                    >
                                        처리 완료
                                    </Button>
                                    <Button
                                        onClick={() => handleUpdateStatus('dismissed')}
                                        loading={saving}
                                    >
                                        반려
                                    </Button>
                                </>
                            )}
                            <Button onClick={handleCloseModal}>닫기</Button>
                        </Space>
                    </>
                )}
            </Modal>
        </Card>
    );
}
