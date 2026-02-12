import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Table, Tag, Space, Typography, Input, Select, Switch, Drawer, Form, DatePicker, Checkbox, message, Popconfirm, Upload } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { listServerNotifications, upsertServerNotification, deactivateServerNotification, deleteServerNotification, autoDeactivateExpiredNotifications, type ServerNotificationRow, type ServerNotificationType } from '../api/serverNotifications';
import { supabase } from '../lib/supabase';
import { logAdminActivity } from '../utils/adminActivity';
import { useSignedUrlMap } from '../hooks/useSignedImage';

const { Title, Text } = Typography;

type NotificationUploadFile = UploadFile<unknown> & { title?: string; body?: string; link_url?: string };

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const nestedError = (error as { error?: unknown }).error;
    if (nestedError instanceof Error) return nestedError.message;
    if (nestedError && typeof nestedError === 'object' && 'message' in nestedError) {
      const messageValue = (nestedError as { message?: unknown }).message;
      if (typeof messageValue === 'string') return messageValue;
    }
    if ('message' in error) {
      const messageValue = (error as { message?: unknown }).message;
      if (typeof messageValue === 'string') return messageValue;
    }
  }
  return '알 수 없는 오류가 발생했습니다';
};

const audienceOptions = [
  { label: '전체(all)', value: 'all' },
  { label: '크리에이터(creator)', value: 'creator' },
  { label: '브랜드(brand)', value: 'brand' },
  { label: '관리자(admin)', value: 'admin' },
];

const parseImageEntry = (value: string, fallbackTitle?: string, fallbackBody?: string, fallbackLink?: string) => {
  try {
    const parsed = JSON.parse(value) as { url?: string; title?: string; body?: string; link_url?: string };
    if (parsed && typeof parsed === 'object' && parsed.url) {
      return {
        url: parsed.url,
        title: parsed.title ?? fallbackTitle ?? '',
        body: parsed.body ?? fallbackBody ?? '',
        link_url: parsed.link_url ?? fallbackLink ?? '',
      };
    }
  } catch {
    // 문자열로만 저장된 기존 데이터 대응
  }
  return { url: value, title: fallbackTitle ?? '', body: fallbackBody ?? '', link_url: fallbackLink ?? '' };
};

export default function Notifications() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ServerNotificationRow[]>([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<ServerNotificationType | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<boolean | 'all'>('all');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServerNotificationRow | null>(null);
  const [form] = Form.useForm();
  const [preview, setPreview] = useState<ServerNotificationRow | null>(null);
  const [fileList, setFileList] = useState<NotificationUploadFile[]>([]);
  const { signedUrls, generateSignedUrls, clearSignedUrls } = useSignedUrlMap();

  // Watch type to conditionally show image upload
  const typeValue = Form.useWatch('type', form);

  const uploadImage = async (file: File) => {
    // 새로운 업로드 파이프라인 사용 (자동 WebP 변환)
    const { uploadFile } = await import('../upload/uploader');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('인증 필요');

    return uploadFile(file, user.id, {
      bucket: 'project-files',
      folder: 'admin/notifications',
    });
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      // 먼저 기간이 지난 공지들을 자동으로 비활성화
      try {
        const result = await autoDeactivateExpiredNotifications();
        if (result && result.length > 0) {
          console.log(`✅ ${result.length}개의 만료된 공지가 비활성화되었습니다.`);
        }
      } catch (error) {
        // 자동 비활성화 실패해도 계속 진행
        console.error('❌ Failed to auto-deactivate expired notifications:', error);
        console.warn('자동 비활성화 실패했지만 목록 조회는 계속 진행합니다.');
      }

      const data = await listServerNotifications({ q, type: typeFilter, isActive: activeFilter });
      console.log(`📋 총 ${data.length}개의 공지를 조회했습니다. (필터: ${activeFilter === 'all' ? '전체' : activeFilter ? '활성' : '비활성'})`);
      setRows(data);
    } catch (error: unknown) {
      console.error('❌ 목록 조회 실패:', error);
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, q, typeFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onCreate = () => {
    setEditing(null);
    form.resetFields();
    setFileList([]);
    setOpen(true);
  };

  const onEdit = useCallback(async (row: ServerNotificationRow) => {
    setEditing(row);
    form.setFieldsValue({
      id: row.id,
      title: row.title,
      body: row.body,
      type: row.type,
      audiences: row.audiences,
      locale: row.locale,
      app_min_version: row.app_min_version,
      app_max_version: row.app_max_version,
      is_active: row.is_active,
      priority: row.priority,
      require_ack: row.require_ack,
      link_url: row.link_url,
      starts_at: row.starts_at ? dayjs(row.starts_at) : null,
      ends_at: row.ends_at ? dayjs(row.ends_at) : null,
      image_urls: row.image_urls,
    });
    if (row.image_urls && row.image_urls.length > 0) {
      // 기존 이미지 URL에 대해 서명 URL 생성
      const urlMap: Record<string, string> = {};
      const parsedImages = row.image_urls.map((value, idx) => {
        const parsed = parseImageEntry(value, row.title, row.body, row.link_url ?? undefined);
        urlMap[`image_${idx}`] = parsed.url;
        return parsed;
      });
      const signed = await generateSignedUrls(urlMap);

      setFileList(
        parsedImages.map((parsed, idx) => ({
          uid: `-${idx}`,
          name: `image-${idx + 1}.png`,
          status: 'done' as const,
          url: signed[`image_${idx}`] || parsed.url,
          title: parsed.title,
          body: parsed.body,
          link_url: parsed.link_url,
        }))
      );
    } else {
      setFileList([]);
      clearSignedUrls();
    }
    setOpen(true);
  }, [form, generateSignedUrls, clearSignedUrls]);

  const onDeactivate = useCallback(async (row: ServerNotificationRow) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await deactivateServerNotification(row.id);
      if (user) {
        logAdminActivity(user.id, 'notification_deactivate', null, { id: row.id, title: row.title });
      }
      message.success('비활성화되었습니다');
      fetchList();
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  }, [fetchList]);

  const onDelete = useCallback(async (row: ServerNotificationRow) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await deleteServerNotification(row.id);
      if (user) {
        logAdminActivity(user.id, 'notification_delete', null, { id: row.id, title: row.title });
      }
      message.success('삭제되었습니다');
      fetchList();
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  }, [fetchList]);

  const onPreview = useCallback(async (row: ServerNotificationRow) => {
    setPreview(row);
    // 게시물 미리보기 이미지에 대해 서명 URL 생성
    if (row.image_urls && row.image_urls.length > 0) {
      const urlMap: Record<string, string> = {};
      row.image_urls.forEach((value, idx) => {
        const parsed = parseImageEntry(value, row.title, row.body, row.link_url ?? undefined);
        urlMap[`preview_${idx}`] = parsed.url;
      });
      await generateSignedUrls(urlMap);
    } else {
      clearSignedUrls();
    }
  }, [generateSignedUrls, clearSignedUrls]);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        message.error('인증 정보가 없습니다. 다시 로그인 해주세요.');
        return;
      }

      let imageUrls: string[] | null = values.image_urls || [];
      // Handle file uploads
      const uploadedFiles: NotificationUploadFile[] = [];

      for (const file of fileList) {
        let url = file.url;
        if (!url && file.originFileObj) {
          try {
            url = await uploadImage(file.originFileObj);
          } catch (uploadError: unknown) {
            message.error(`이미지 업로드 실패 (${file.name}): ${getErrorMessage(uploadError)}`);
            return;
          }
        }
        if (!url) continue;
        uploadedFiles.push({
          ...file,
          url,
          title: (file.title ?? '').trim(),
          body: (file.body ?? '').trim(),
          link_url: (file.link_url ?? '').trim(),
        });
      }

      const imagePayloads = uploadedFiles.map((file) =>
        JSON.stringify({
          url: file.url,
          title: file.title || null,
          body: file.body || null,
          link_url: file.link_url || null,
        })
      );

      imageUrls = imagePayloads.length > 0 ? imagePayloads : null;

      // If type is not advertisement, clear image_urls
      if (values.type !== 'advertisement') {
        imageUrls = null;
      }

      const saved = await upsertServerNotification(
        {
          id: values.id,
          title: values.title,
          body: values.body,
          type: values.type,
          audiences: values.audiences,
          locale: values.locale || null,
          app_min_version: values.app_min_version || null,
          app_max_version: values.app_max_version || null,
          starts_at: values.starts_at ? values.starts_at.toISOString() : null,
          ends_at: values.ends_at ? values.ends_at.toISOString() : null,
          is_active: values.is_active,
          priority: values.priority ?? 0,
          require_ack: values.require_ack || false,
          link_url: values.link_url || null,
          image_urls: imageUrls,
        },
        user.id,
      );
      logAdminActivity(user.id, values.id ? 'notification_update' : 'notification_create', null, { id: saved.id, title: saved.title, type: saved.type });
      message.success(editing ? '수정되었습니다' : '생성되었습니다');
      setOpen(false);
      setEditing(null);
      form.resetFields();
      fetchList();
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<ServerNotificationRow> = useMemo(() => [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => <Tag color={v === 'version_update' ? 'geekblue' : v === 'maintenance' ? 'volcano' : 'green'}>{v}</Tag>,
    },
    {
      title: '대상',
      dataIndex: 'audiences',
      key: 'audiences',
      render: (arr: string[]) => (
        <Space wrap>
          {arr?.map((a) => <Tag key={a}>{a}</Tag>)}
        </Space>
      ),
    },
    {
      title: '기간',
      key: 'period',
      render: (_, row) => (
        <span>
          {row.starts_at ? dayjs(row.starts_at).format('YY/MM/DD HH:mm') : '-'} ~ {row.ends_at ? dayjs(row.ends_at).format('YY/MM/DD HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: '활성',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => v ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>,
    },
    {
      title: '우선순위(높을 수록 우선)',
      dataIndex: 'priority',
      key: 'priority',
      width: 180,
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('YY/MM/DD HH:mm'),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => onPreview(row)}>미리보기</Button>
          <Button size="small" onClick={() => onEdit(row)}>수정</Button>
          <Popconfirm title="정말 비활성화하시겠어요?" onConfirm={() => onDeactivate(row)}>
            <Button size="small">비활성화</Button>
          </Popconfirm>
          <Popconfirm
            title="정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다."
            onConfirm={() => onDelete(row)}
          >
            <Button size="small" danger>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [onDeactivate, onDelete, onEdit, onPreview]);

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>공지 / 업데이트</Title>
        <Space>
          <Input.Search placeholder="제목/본문 검색" value={q} onChange={(e) => setQ(e.target.value)} allowClear style={{ width: 220 }} />
          <Select
            style={{ width: 160 }}
            value={typeFilter}
            options={[
              { label: '모든 유형', value: 'all' },
              { label: 'announcement', value: 'announcement' },
              { label: 'advertisement', value: 'advertisement' },
              { label: 'version_update', value: 'version_update' },
              { label: 'maintenance', value: 'maintenance' },
            ]}
            onChange={(value) => setTypeFilter(value)}
          />
          <Select
            style={{ width: 140 }}
            value={activeFilter}
            options={[
              { label: '활성/비활성', value: 'all' },
              { label: '활성', value: true },
              { label: '비활성', value: false },
            ]}
            onChange={(value) => setActiveFilter(value)}
          />
          <Button type="primary" onClick={onCreate}>새 공지</Button>
        </Space>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Drawer
        title={editing ? '공지 수정' : '공지 생성'}
        open={open}
        width={600}
        onClose={() => setOpen(false)}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setOpen(false)}>닫기</Button>
            <Button type="primary" onClick={onSubmit}>{editing ? '수정' : '생성'}</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="제목" name="title" rules={[{ required: true }]}>
            <Input maxLength={120} showCount />
          </Form.Item>
          <Form.Item label="본문(Markdown 가능)" name="body" rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder="업데이트 내용 또는 공지 내용을 입력하세요" />
          </Form.Item>
          <Form.Item label="유형" name="type" initialValue={'announcement'} rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'announcement (공지)', value: 'announcement' },
                { label: 'advertisement (광고)', value: 'advertisement' },
                { label: 'version_update (업데이트)', value: 'version_update' },
                { label: 'maintenance (점검)', value: 'maintenance' },
              ]}
            />
          </Form.Item>
          {typeValue === 'advertisement' && (
            <Form.Item label="광고 이미지 (최대 5장)">
              <Upload
                listType="picture-card"
                maxCount={5}
                fileList={fileList}
                onChange={({ fileList: newFileList }) =>
                  setFileList((prev) =>
                    newFileList.map((file) => {
                      const prevFile = prev.find((f) => f.uid === file.uid);
                      return {
                        ...file,
                        title: prevFile?.title ?? '',
                        body: prevFile?.body ?? '',
                        link_url: prevFile?.link_url ?? '',
                      };
                    })
                  )
                }
                onPreview={async (file) => {
                  let src = file.url as string;
                  if (!src) {
                    src = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.readAsDataURL(file.originFileObj as File);
                      reader.onload = () => resolve(reader.result as string);
                    });
                  }
                  const image = new Image();
                  image.src = src;
                  const imgWindow = window.open(src);
                  imgWindow?.document.write(image.outerHTML);
                }}
                beforeUpload={() => false} // Manual upload on submit
              >
                {fileList.length < 5 && '+ Upload'}
              </Upload>
              {fileList.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fileList.map((file) => (
                    <div key={file.uid} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: 12, marginBottom: 6, color: '#666' }}>{file.name}</div>
                      <Input
                        placeholder="이미지 제목 (선택)"
                        value={file.title}
                        onChange={(e) =>
                          setFileList((prev) =>
                            prev.map((f) => (f.uid === file.uid ? { ...f, title: e.target.value } : f))
                          )
                        }
                        style={{ marginBottom: 6 }}
                      />
                      <Input.TextArea
                        placeholder="이미지 설명/본문 (선택)"
                        rows={3}
                        value={file.body}
                        onChange={(e) =>
                          setFileList((prev) =>
                            prev.map((f) => (f.uid === file.uid ? { ...f, body: e.target.value } : f))
                          )
                        }
                      />
                      <Input
                        placeholder="이미지 개별 링크 URL (선택)"
                        value={file.link_url}
                        onChange={(e) =>
                          setFileList((prev) =>
                            prev.map((f) => (f.uid === file.uid ? { ...f, link_url: e.target.value } : f))
                          )
                        }
                        style={{ marginTop: 6 }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Form.Item>
          )}
          <Form.Item label="대상" name="audiences" initialValue={['all']} rules={[{ required: true }]}>
            <Select mode="multiple" options={audienceOptions} />
          </Form.Item>
          <Form.Item label="언어(locale)" name="locale">
            <Input placeholder="예: ko-KR (비우면 전체)" />
          </Form.Item>
          <Form.Item label="버전 범위">
            <Space.Compact block>
              <Form.Item name="app_min_version" noStyle>
                <Input placeholder="최소 버전 (예: 1.2.3)" />
              </Form.Item>
              <Form.Item name="app_max_version" noStyle>
                <Input placeholder="최대 버전 (선택)" />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item label="기간">
            <Space>
              <Form.Item name="starts_at" noStyle>
                <DatePicker showTime placeholder="시작" />
              </Form.Item>
              <Form.Item name="ends_at" noStyle>
                <DatePicker showTime placeholder="종료" />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item label="활성" name="is_active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="우선순위" name="priority" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="확인 필요(require ack)" name="require_ack" valuePropName="checked" initialValue={false}>
            <Checkbox />
          </Form.Item>
          <Form.Item label="링크 URL" name="link_url">
            <Input placeholder="자세히 보기 링크 (선택)" />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="미리보기"
        open={!!preview}
        width={560}
        onClose={() => setPreview(null)}
      >
        {preview && (
          <div
            style={{
              position: 'relative',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: '20px 20px 16px',
              background: '#ffffff',
              maxWidth: 520,
            }}
          >
            <Button
              type="text"
              icon={<CloseOutlined />}
              aria-label="닫기"
              onClick={() => setPreview(null)}
              style={{ position: 'absolute', top: 8, right: 8, color: '#111827' }}
            />
            <div style={{ color: '#111827', fontWeight: 700, fontSize: 18, lineHeight: '26px', paddingRight: 32 }}>
              {preview.title}
            </div>
            <div style={{ height: 1, background: '#e5e7eb', margin: '12px 16px 16px 16px' }} />
            <div style={{ whiteSpace: 'pre-wrap', color: '#4b5563', lineHeight: 1.6 }}>
              {preview.body}
            </div>
            {preview.image_urls && preview.image_urls.length > 0 && (
              <div style={{ padding: '0 20px', marginTop: 12 }}>
                <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 8 }}>
                  {preview.image_urls.map((value, i) => {
                    const parsed = parseImageEntry(value, preview.title, preview.body);
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <img
                          src={signedUrls[`preview_${i}`] || parsed.url}
                          alt={`preview-${i}`}
                          crossOrigin="anonymous"
                          style={{ width: 240, height: 160, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                        />
                        {(parsed.title || parsed.body || parsed.link_url) && (
                          <div style={{ fontSize: 12, color: '#4b5563', maxWidth: 240 }}>
                            {parsed.title && <div style={{ fontWeight: 600 }}>{parsed.title}</div>}
                            {parsed.body && <div style={{ whiteSpace: 'pre-wrap' }}>{parsed.body}</div>}
                            {parsed.link_url && (
                              <div style={{ marginTop: 4 }}>
                                <a href={parsed.link_url} target="_blank" rel="noreferrer">개별 링크 열기</a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {preview.link_url && (
              <div style={{ marginTop: 12 }}>
                <a href={preview.link_url} target="_blank" rel="noreferrer">자세히 보기</a>
              </div>
            )}
            <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
              유형: {preview.type} · 대상: {preview.audiences.join(', ')}
            </Text>
          </div>
        )}
      </Drawer>
    </div>
  );
}


