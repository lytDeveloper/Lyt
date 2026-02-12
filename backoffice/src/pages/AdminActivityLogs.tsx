import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Typography, Tag, message, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getAdminActivityLogs } from '../utils/adminActivity';
import { checkIsAdmin } from '../utils/auth';
import type { Admin, AdminActivityLog } from '../types/database.types';
import { supabase } from '../lib/supabase';

const { Title } = Typography;

export default function AdminActivityLogs() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [adminNameMap, setAdminNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const me = await checkIsAdmin();
      setAdmin(me);
      if (me?.role !== 'super_admin' && !me?.permissions?.includes('log_view')) {
        message.warning('로그 조회 권한이 없어요.');
        return;
      }
      setLoading(true);
      try {
        const data = await getAdminActivityLogs(undefined, 200);
        setLogs(data);
        // 관리자/대상 관리자 표시명 로드
        const ids = Array.from(
          new Set(
            data
              .flatMap((l) => [l.admin_profile_id, l.target_admin_profile_id].filter(Boolean))
              .map((v) => String(v))
          )
        );
        if (ids.length) {
          const { data: adminsData, error: adminsError } = await supabase
            .from('admins')
            .select('profile_id, email, username')
            .in('profile_id', ids);
          if (adminsError) throw adminsError;

          const profileIds = Array.from(
            new Set((adminsData || []).map((a) => a.profile_id).filter(Boolean))
          );
          let profilesMap: Record<string, string> = {};
          if (profileIds.length) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, nickname')
              .in('id', profileIds);
            if (profilesError) throw profilesError;
            profilesMap = (profiles || []).reduce<Record<string, string>>((acc, p) => {
              const profile = p as { id: string; nickname: string | null };
              const name = profile.nickname || '';
              acc[p.id] = name;
              return acc;
            }, {});
          }

          const map = (adminsData || []).reduce<Record<string, string>>((acc, a) => {
            const profileNickname = profilesMap[a.profile_id] || '';
            const displayName = a.username || profileNickname || a.email || `${a.profile_id?.slice(0, 8)}...`;
            acc[a.profile_id] = displayName;
            return acc;
          }, {});
          setAdminNameMap(map);
        }
      } catch (e) {
        console.error('활동 로그 로드 실패:', e);
        message.error('활동 로그를 불러오지 못했어요.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const actionLabelMap: Record<string, { label: string; color: string }> = useMemo(
    () => ({
      update_permissions: { label: '권한 변경', color: 'geekblue' },
      add_admin: { label: '관리자 추가', color: 'green' },
      delete_admin: { label: '관리자 삭제', color: 'red' },
      user_ban: { label: '사용자 제재', color: 'orange' },
      user_unban: { label: '제재 해제', color: 'gold' },
    }),
    []
  );

  const renderDetails = (log: AdminActivityLog) => {
    const { action, details } = log;
    type Details = Record<string, unknown>;
    const safe: Details = typeof details === 'object' && details !== null ? (details as Details) : {};

    if (action === 'user_ban') {
      const untilRaw = safe['banned_until'];
      const until = typeof untilRaw === 'string' ? dayjs(untilRaw).format('YYYY-MM-DD HH:mm') : '-';
      return (
        <Space size={8} wrap>
          <Tag color="orange">제재</Tag>
          <span>만료: {until}</span>
          {Boolean(safe['user_tab']) && <Tag>{String(safe['user_tab'])}</Tag>}
          {Boolean(safe['profile_id']) && (
            <Typography.Text code style={{ fontSize: 12 }}>{String(safe['profile_id']).slice(0, 8)}...</Typography.Text>
          )}
        </Space>
      );
    }

    if (action === 'user_unban') {
      return (
        <Space size={8} wrap>
          <Tag color="green">해제</Tag>
          {Boolean(safe['profile_id']) && (
            <Typography.Text code style={{ fontSize: 12 }}>{String(safe['profile_id']).slice(0, 8)}...</Typography.Text>
          )}
          {Boolean(safe['user_tab']) && <Tag>{String(safe['user_tab'])}</Tag>}
        </Space>
      );
    }

    if (action === 'update_permissions') {
      const permsRaw = safe['permissions'];
      const permissions: string[] = Array.isArray(permsRaw) ? (permsRaw as string[]) : [];
      return (
        <Space size={8} wrap>
          {typeof safe['target_email'] === 'string' && <Tag>{String(safe['target_email'])}</Tag>}
          {permissions.length > 0 ? (
            permissions.map((p: string) => <Tag key={p} color="blue">{p}</Tag>)
          ) : (
            <span>-</span>
          )}
        </Space>
      );
    }

    if (action === 'add_admin') {
      const permsRaw = safe['permissions'];
      const permissions: string[] = Array.isArray(permsRaw) ? (permsRaw as string[]) : [];
      return (
        <Space size={8} wrap>
          {typeof safe['new_email'] === 'string' && <Tag color="green">{String(safe['new_email'])}</Tag>}
          {permissions.length > 0 ? permissions.map((p: string) => (
            <Tag key={p}>{p}</Tag>
          )) : <span>권한 없음</span>}
        </Space>
      );
    }

    if (action === 'delete_admin') {
      return (
        <Space size={8} wrap>
          {typeof safe['deleted_email'] === 'string' ? <Tag color="red">{String(safe['deleted_email'])}</Tag> : <span>-</span>}
        </Space>
      );
    }

    try {
      const text = typeof details === 'string' ? details : JSON.stringify(details);
      return <span style={{ fontFamily: 'monospace' }}>{text}</span>;
    } catch {
      return '-';
    }
  };

  const columns: ColumnsType<AdminActivityLog> = [
    {
      title: '일시',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '관리자',
      dataIndex: 'admin_profile_id',
      key: 'admin_profile_id',
      render: (v: string) => adminNameMap[v] || (
        <Typography.Text code style={{ fontSize: 12 }}>{String(v).slice(0, 8)}...</Typography.Text>
      ),
      ellipsis: true,
    },
    {
      title: '대상',
      dataIndex: 'target_admin_profile_id',
      key: 'target_admin_profile_id',
      render: (v: string | null) => {
        if (!v) return '-';
        return adminNameMap[v] || (
          <Typography.Text code style={{ fontSize: 12 }}>{String(v).slice(0, 8)}...</Typography.Text>
        );
      },
      ellipsis: true,
    },
    {
      title: '액션',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const meta = actionLabelMap[action] || { label: action, color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '상세',
      dataIndex: 'details',
      key: 'details',
      render: (_: unknown, record: AdminActivityLog) => renderDetails(record),
    },
  ];

  if (admin?.role !== 'super_admin' && !admin?.permissions?.includes('log_view')) {
    return (
      <div>
        <Title level={2}>활동 로그</Title>
        {/* <Card>로그 조회 권한이 없습니다.</Card> */}
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>활동 로그</Title>
      <Card>
        <Table
          rowKey={(r) => r.id}
          loading={loading}
          columns={columns}
          dataSource={logs}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}


