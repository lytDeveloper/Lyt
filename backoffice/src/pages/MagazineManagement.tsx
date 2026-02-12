import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Popconfirm,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { checkIsAdmin } from '../utils/auth';
import { logAdminActivity } from '../utils/adminActivity';
import { toast } from 'react-toastify';
import {
  listMagazines,
  getMagazine,
  createMagazine,
  updateMagazine,
  deleteMagazine,
  uploadMagazineImage,
  type MagazineFilters,
} from '../api/magazines';
import type { Magazine } from '../types/database.types';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import { useSignedUrlMap } from '../hooks/useSignedImage';

const { Title } = Typography;
const { TextArea } = Input;

type MagazineStatus = 'draft' | 'published' | 'archived' | 'deleted';
type MagazineCategory = '트렌드' | '인터뷰' | '가이드' | '뉴스' | '리뷰' | '케이스스터디' | '인사이트' | '브랜드 스토리';

type ContentBlockType = 'text' | 'image';

interface ContentBlock {
  type: ContentBlockType;
  content?: string | null;
  url?: string | null;
  caption?: string | null;
}

interface Profile {
  id: string;
  nickname: string | null;
}

interface Project {
  id: string;
  title: string;
}

export default function MagazineManagement() {
  const [loading, setLoading] = useState(false);
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<MagazineCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MagazineStatus | 'all'>('all');
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  // 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMagazine, setEditingMagazine] = useState<Magazine | null>(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | File[] | null>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [removedGalleryUrls, setRemovedGalleryUrls] = useState<string[]>([]);

  // 서명 URL 관리 훅
  const { signedUrls, generateSignedUrls, clearSignedUrls } = useSignedUrlMap();

  // 선택 옵션 데이터
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const checkAuth = async () => {
    const admin = await checkIsAdmin();
    if (!admin || (admin.role !== 'super_admin' && !admin.permissions.includes('content_management'))) {
      toast.error('콘텐츠 관리 권한이 없습니다.');
      return;
    }
    setCurrentAdminId(admin.profile_id);
  };

  // 매거진의 모든 이미지에 대해 서명 URL 생성
  const loadSignedUrls = useCallback(async (magazine: Magazine) => {
    const urlMap: Record<string, string | null | undefined> = {};

    // 커버 이미지
    if (magazine.cover_image_url) {
      urlMap['cover'] = magazine.cover_image_url;
    }

    // 추가 이미지들
    if (magazine.images && magazine.images.length > 0) {
      magazine.images.forEach((url, i) => {
        urlMap[`gallery_${i}`] = url;
      });
    }

    // 콘텐츠 블록 이미지들
    const contentBlocks = magazine.content_blocks as ContentBlock[] | null;
    if (contentBlocks && contentBlocks.length > 0) {
      contentBlocks.forEach((block, i) => {
        if (block.type === 'image' && block.url) {
          urlMap[`block_${i}`] = block.url;
        }
      });
    }

    await generateSignedUrls(urlMap);
  }, [generateSignedUrls]);

  const loadMagazines = useCallback(async () => {
    if (!currentAdminId) return;

    setLoading(true);
    try {
      const filters: MagazineFilters = {};
      if (filterCategory !== 'all') {
        filters.category = filterCategory;
      }
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      if (searchText) {
        filters.search = searchText;
      }

      const data = await listMagazines(filters);
      setMagazines(data);
    } catch (error: unknown) {
      console.error('매거진 목록 로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '매거진 목록을 불러오는데 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentAdminId, filterCategory, filterStatus, searchText]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentAdminId) {
      loadMagazines();
      loadProfiles();
      loadProjects();
    }
  }, [currentAdminId, loadMagazines]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname')
        .order('nickname', { ascending: true });

      if (error) throw error;
      setProfiles((data || []) as Profile[]);
    } catch (error) {
      console.error('프로필 목록 로드 실패:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error) {
      console.error('프로젝트 목록 로드 실패:', error);
    }
  };

  const buildContentBlocks = (magazine?: Magazine | null): ContentBlock[] => {
    if (magazine?.content_blocks && magazine.content_blocks.length > 0) {
      return magazine.content_blocks as ContentBlock[];
    }

    const legacyBlocks: ContentBlock[] = [];
    if (magazine?.content) {
      legacyBlocks.push({ type: 'text', content: magazine.content });
    }
    (magazine?.images || []).forEach((url) => {
      legacyBlocks.push({ type: 'image', url });
    });

    return legacyBlocks.length > 0
      ? legacyBlocks
      : [{ type: 'text', content: '' }];
  };

  const handleCreate = () => {
    setEditingMagazine(null);
    form.resetFields();
    form.setFieldsValue({
      content_blocks: [{ type: 'text', content: '' }],
    });
    setPendingFiles({});
    setPreviewUrls({});
    setRemovedGalleryUrls([]);
    clearSignedUrls();
    setModalVisible(true);
  };

  const handleEdit = useCallback(async (record: Magazine) => {
    try {
      const magazine = await getMagazine(record.id);
      if (!magazine) {
        toast.error('매거진을 찾을 수 없습니다.');
        return;
      }

      const contentBlocks = buildContentBlocks(magazine);

      setEditingMagazine(magazine);
      form.setFieldsValue({
        ...magazine,
        tags: magazine.tags?.join(', ') || '',
        meta_keywords: magazine.meta_keywords?.join(', ') || '',
        is_featured: magazine.is_featured ?? false,
        is_trending: magazine.is_trending ?? false,
        is_editor_pick: magazine.is_editor_pick ?? false,
        display_order: typeof magazine.display_order === 'number' ? magazine.display_order : null,
        content_blocks: contentBlocks,
      });
      setPendingFiles({});
      clearSignedUrls();

      // 서명 URL 생성 (private 버킷 대응)
      await loadSignedUrls(magazine);

      setModalVisible(true);
    } catch (error: unknown) {
      console.error('매거진 로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '매거진을 불러오는데 실패했습니다.';
      toast.error(errorMessage);
    }
  }, [form, loadSignedUrls, clearSignedUrls]);

  const handleDelete = useCallback(async (id: string) => {
    if (!currentAdminId) return;

    try {
      await deleteMagazine(id);
      await logAdminActivity(currentAdminId, 'magazine_delete', null, { id });
      toast.success('삭제되었습니다.');
      loadMagazines();
    } catch (error: unknown) {
      console.error('삭제 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '삭제에 실패했습니다.';
      toast.error(errorMessage);
    }
  }, [currentAdminId, loadMagazines]);

  const handleSubmit = async () => {
    if (!currentAdminId) return;

    try {
      const values = await form.validateFields();

      setSubmitLoading(true);

      const rawBlocks: ContentBlock[] = values.content_blocks || [];
      const resolvedBlocks: ContentBlock[] = [];

      // 이미지 업로드 처리
      let coverImageUrl = values.cover_image_url;
      if (pendingFiles.cover_image_url) {
        const file = pendingFiles.cover_image_url as File;
        coverImageUrl = await uploadMagazineImage(file, currentAdminId);
      }

      // 블록 단위 업로드 처리
      for (let i = 0; i < rawBlocks.length; i += 1) {
        const block = rawBlocks[i];
        if (block.type === 'image') {
          const pendingKey = `content_blocks_${i}`;
          const pendingFile = pendingFiles[pendingKey];
          let imageUrl = block.url || null;

          if (pendingFile && pendingFile instanceof File) {
            imageUrl = await uploadMagazineImage(pendingFile, currentAdminId);
          }

          resolvedBlocks.push({
            type: 'image',
            url: imageUrl,
            caption: block.caption || null,
          });
        } else {
          resolvedBlocks.push({
            type: 'text',
            content: block.content || '',
          });
        }
      }

      // 추가 이미지 업로드(레거시 필드 유지)
      let galleryImages: string[] = [];
      if (pendingFiles.images && Array.isArray(pendingFiles.images)) {
        const uploadPromises = (pendingFiles.images as File[]).map((file) =>
          uploadMagazineImage(file, currentAdminId)
        );
        galleryImages = await Promise.all(uploadPromises);
      } else if (editingMagazine?.images) {
        galleryImages = editingMagazine.images.filter((url) => !removedGalleryUrls.includes(url));
      }

      const blockImageUrls = resolvedBlocks
        .filter((b) => b.type === 'image' && b.url)
        .map((b) => b.url as string);
      const combinedImages = Array.from(new Set([...blockImageUrls, ...galleryImages]));

      // 태그 및 메타 키워드 배열 변환
      const tags = values.tags
        ? values.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag)
        : [];
      const metaKeywords = values.meta_keywords
        ? values.meta_keywords.split(',').map((kw: string) => kw.trim()).filter((kw: string) => kw)
        : [];

      const payload: Partial<Magazine> = {
        title: values.title,
        subtitle: values.subtitle || null,
        content: (() => {
          const computedContent = resolvedBlocks
            .filter((b) => b.type === 'text' && b.content)
            .map((b) => (b.content || '').trim())
            .filter(Boolean)
            .join('\n\n');
          return computedContent || values.content || ' ';
        })(),
        content_blocks: resolvedBlocks,
        category: values.category,
        status: values.status,
        cover_image_url: coverImageUrl,
        images: combinedImages.length > 0 ? combinedImages : null,
        video_url: values.video_url || null,
        tags: tags.length > 0 ? tags : null,
        meta_title: values.meta_title || null,
        meta_description: values.meta_description || null,
        meta_keywords: metaKeywords.length > 0 ? metaKeywords : null,
        slug: values.slug || null,
        display_order: values.display_order ? Number(values.display_order) : undefined,
        author_id: values.author_id || null,
        related_project: values.related_project || null,
      };

      if (values.status === 'published' && !values.published_at && !editingMagazine?.published_at) {
        payload.published_at = new Date().toISOString();
      }

      if (editingMagazine) {
        await updateMagazine(editingMagazine.id, payload, currentAdminId);
        await logAdminActivity(currentAdminId, 'magazine_update', null, { id: editingMagazine.id });
        toast.success('수정되었습니다.');
      } else {
        await createMagazine(payload as Omit<Magazine, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'like_count' | 'comment_count' | 'bookmark_count' | 'share_count'>);
        await logAdminActivity(currentAdminId, 'magazine_create', null, {});
        toast.success('생성되었습니다.');
      }

      setModalVisible(false);
      setEditingMagazine(null);
      form.resetFields();
      setPendingFiles({});
      loadMagazines();
    } catch (error: unknown) {
      console.error('저장 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '저장에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFileSelect = (file: File, fieldName: string) => {
    setPendingFiles((prev) => ({ ...prev, [fieldName]: file }));
    form.setFieldsValue({ [fieldName]: file.name });
    return false;
  };

  const handleMultipleFileSelect = (fileList: File[], fieldName: string) => {
    setPendingFiles((prev) => ({ ...prev, [fieldName]: fileList }));
    form.setFieldsValue({ [fieldName]: `${fileList.length}개 파일 선택됨` });
  };

  const handleBlockImageSelect = (file: File, index: number) => {
    const key = `content_blocks_${index}`;
    setPendingFiles((prev) => ({ ...prev, [key]: file }));
    setPreviewUrls((prev) => {
      // 기존 URL 정리 후 새 URL 생성
      const next = { ...prev };
      if (next[key]) {
        URL.revokeObjectURL(next[key]);
      }
      next[key] = URL.createObjectURL(file);
      return next;
    });
    return false;
  };

  const handleBlockTypeChange = (index: number, nextType: ContentBlockType) => {
    const blocks: ContentBlock[] = form.getFieldValue('content_blocks') || [];
    const current = blocks[index] || {};
    const updated: ContentBlock =
      nextType === 'text'
        ? { type: 'text', content: current.content || '' }
        : { type: 'image', url: current.url || null, caption: current.caption || null };

    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    form.setFieldsValue({ content_blocks: newBlocks });

    // 이미지 → 텍스트 전환 시 대기중 업로드를 정리
    if (nextType === 'text') {
      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[`content_blocks_${index}`];
        return next;
      });
      setPreviewUrls((prev) => {
        const next = { ...prev };
        if (next[`content_blocks_${index}`]) {
          URL.revokeObjectURL(next[`content_blocks_${index}`]);
          delete next[`content_blocks_${index}`];
        }
        return next;
      });
    }
  };

  const handleDragDrop = (from: number | null, to: number, move: (from: number, to: number) => void) => {
    if (from === null || from === to) return;
    move(from, to);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleToggleFlag = useCallback(
    async (record: Magazine, field: 'is_featured' | 'is_trending' | 'is_editor_pick', value: boolean) => {
      if (!currentAdminId) return;

      const revert = () => {
        setMagazines((prev) =>
          prev.map((mag) => (mag.id === record.id ? { ...mag, [field]: !value } : mag)),
        );
      };

      setMagazines((prev) =>
        prev.map((mag) => (mag.id === record.id ? { ...mag, [field]: value } : mag)),
      );

      try {
        await updateMagazine(record.id, { [field]: value } as Partial<Magazine>, currentAdminId);
        await logAdminActivity(currentAdminId, `magazine_${field}_toggle`, null, {
          id: record.id,
          value,
        });
        toast.success('노출 옵션이 업데이트되었습니다.');
      } catch (error) {
        console.error('토글 업데이트 실패:', error);
        toast.error('노출 옵션 업데이트에 실패했습니다.');
        revert();
      }
    },
    [currentAdminId],
  );


  const columns: ColumnsType<Magazine> = useMemo(() => [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 300,
    },
    {
      title: '홈 순서',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      render: (v) => (typeof v === 'number' ? v : '-'),
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: MagazineCategory) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: MagazineStatus) => {
        const statusMap: Record<MagazineStatus, { color: string; text: string }> = {
          draft: { color: 'default', text: '초안' },
          published: { color: 'green', text: '발행' },
          archived: { color: 'orange', text: '보관' },
          deleted: { color: 'red', text: '삭제' },
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '작성자',
      key: 'author',
      width: 120,
      render: (_, record) => {
        const author = profiles.find(p => p.id === record.author_id);
        return record.author_id ? (
          <span>{author?.nickname || '작성자 없음'}</span>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        );
      },
    },
    {
      title: '조회수',
      dataIndex: 'view_count',
      key: 'view_count',
      width: 80,
      render: (count: number | null) => count || 0,
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string | null) => date ? dayjs(date).format('YY/MM/DD HH:mm') : '-',
    },
    {
      title: '노출 옵션',
      key: 'featured_flags',
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Space align="center">
            <span style={{ fontSize: 12 }}>추천</span>
            <Switch
              size="small"
              checked={!!record.is_featured}
              onChange={(checked) => handleToggleFlag(record, 'is_featured', checked)}
            />
          </Space>
          <Space align="center">
            <span style={{ fontSize: 12 }}>트렌딩</span>
            <Switch
              size="small"
              checked={!!record.is_trending}
              onChange={(checked) => handleToggleFlag(record, 'is_trending', checked)}
            />
          </Space>
          <Space align="center">
            <span style={{ fontSize: 12 }}>에디터픽</span>
            <Switch
              size="small"
              checked={!!record.is_editor_pick}
              onChange={(checked) => handleToggleFlag(record, 'is_editor_pick', checked)}
            />
          </Space>
        </Space>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠어요?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [profiles, handleDelete, handleEdit, handleToggleFlag]);
  const filteredMagazines = useMemo(() => {
    return magazines;
  }, [magazines]);

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>매거진 관리</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            매거진 생성
          </Button>
        </div>

        <Space>
          <Input.Search
            placeholder="제목 또는 내용 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={filterCategory}
            onChange={setFilterCategory}
            style={{ width: 150 }}
          >
            <Select.Option value="all">전체 카테고리</Select.Option>
            <Select.Option value="트렌드">트렌드</Select.Option>
            <Select.Option value="인터뷰">인터뷰</Select.Option>
            <Select.Option value="가이드">가이드</Select.Option>
            <Select.Option value="뉴스">뉴스</Select.Option>
            <Select.Option value="리뷰">리뷰</Select.Option>
            <Select.Option value="케이스스터디">케이스스터디</Select.Option>
            <Select.Option value="인사이트">인사이트</Select.Option>
            <Select.Option value="브랜드 스토리">브랜드 스토리</Select.Option>
          </Select>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 150 }}
          >
            <Select.Option value="all">전체 상태</Select.Option>
            <Select.Option value="draft">초안</Select.Option>
            <Select.Option value="published">발행</Select.Option>
            <Select.Option value="archived">보관</Select.Option>
            <Select.Option value="deleted">삭제</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredMagazines}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Space>

      <Modal
        title={editingMagazine ? '매거진 수정' : '매거진 생성'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingMagazine(null);
          form.resetFields();
          setPendingFiles({});
          setPreviewUrls({});
          setRemovedGalleryUrls([]);
          clearSignedUrls();
        }}
        onOk={handleSubmit}
        confirmLoading={submitLoading}
        width={800}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            display_order: null,
            content_blocks: [{ type: 'text', content: '' }],
          }}
        >
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력해주세요.' }]}
          >
            <Input placeholder="매거진 제목" />
          </Form.Item>

          <Form.Item name="subtitle" label="부제목">
            <Input placeholder="부제목 (선택사항)" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="category"
              label="카테고리"
              rules={[{ required: true, message: '카테고리를 선택해주세요.' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="카테고리 선택">
                <Select.Option value="트렌드">트렌드</Select.Option>
                <Select.Option value="인터뷰">인터뷰</Select.Option>
                <Select.Option value="가이드">가이드</Select.Option>
                <Select.Option value="뉴스">뉴스</Select.Option>
                <Select.Option value="리뷰">리뷰</Select.Option>
                <Select.Option value="케이스스터디">케이스스터디</Select.Option>
                <Select.Option value="인사이트">인사이트</Select.Option>
                <Select.Option value="브랜드 스토리">브랜드 스토리</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label="상태"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Select.Option value="draft">초안</Select.Option>
                <Select.Option value="published">발행</Select.Option>
                <Select.Option value="archived">보관</Select.Option>
                <Select.Option value="deleted">삭제</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item name="author_id" label="작성자">
            <Select
              placeholder="작성자 선택 (선택사항)"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={profiles.map(p => ({ value: p.id, label: p.nickname || p.id }))}
              allowClear
            />
          </Form.Item>

          <Form.List
            name="content_blocks"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('블록을 1개 이상 추가해주세요.'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            {(fields, { add, remove, move }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Text strong>본문/이미지 블록</Typography.Text>
                {fields.map((field, index) => {
                  const blockType = form.getFieldValue(['content_blocks', field.name, 'type']);
                  return (
                    <div
                      key={field.key}
                      style={{ width: '100%' }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDragEnter={() => setDragOverIndex(index)}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDragDrop(dragIndex, index, move);
                      }}
                    >
                      <Card
                        size="small"
                        style={{
                          background: '#fafafa',
                          cursor: 'move',
                          padding: 4,
                          transition: 'transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease',
                          transform: (() => {
                            const isTarget = dragOverIndex !== null && dragOverIndex === index && dragIndex !== index;
                            if (isTarget && dragIndex !== null && dragIndex < index) return 'translateY(-28px) scale(0.995)';
                            if (isTarget && dragIndex !== null && dragIndex > index) return 'translateY(28px) scale(0.995)';
                            return 'scale(1)';
                          })(),
                          boxShadow:
                            dragOverIndex !== null && dragOverIndex === index
                              ? '0 8px 18px rgba(0,0,0,0.1)'
                              : 'none',
                          opacity: dragIndex === index ? 0.9 : 1,
                        }}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }}
                      >
                        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space align="center">
                            <Typography.Text type="secondary" style={{ width: 70 }}>
                              {blockType === 'image' ? '이미지' : '텍스트'}
                            </Typography.Text>
                            <Space size="small">
                              {blockType !== 'text' && (
                                <Button size="small" onClick={() => handleBlockTypeChange(index, 'text')}>
                                  텍스트로
                                </Button>
                              )}
                              {blockType !== 'image' && (
                                <Button size="small" onClick={() => handleBlockTypeChange(index, 'image')}>
                                  이미지로
                                </Button>
                              )}
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                드래그해서 순서 변경
                              </Typography.Text>
                            </Space>
                          </Space>
                          {fields.length > 1 && (
                            <Button
                              danger
                              type="link"
                              onClick={() => {
                                if (blockType === 'image') {
                                  const url = form.getFieldValue(['content_blocks', field.name, 'url']);
                                  if (url) {
                                    setRemovedGalleryUrls((prev) =>
                                      Array.from(new Set([...prev, url as string])),
                                    );
                                  }
                                  const pendingKey = `content_blocks_${field.name}`;
                                  setPendingFiles((prev) => {
                                    const next = { ...prev };
                                    delete next[pendingKey];
                                    return next;
                                  });
                                  setPreviewUrls((prev) => {
                                    const next = { ...prev };
                                    if (next[pendingKey]) {
                                      URL.revokeObjectURL(next[pendingKey]);
                                      delete next[pendingKey];
                                    }
                                    return next;
                                  });
                                }
                                remove(field.name);
                              }}
                            >
                              삭제
                            </Button>
                          )}
                        </Space>

                        {blockType === 'image' ? (
                          <>
                            <Form.Item name={[field.name, 'url']} label="이미지" rules={[{ required: true, message: '이미지를 업로드하세요.' }]}>
                              <Upload
                                beforeUpload={(file) => handleBlockImageSelect(file, index)}
                                showUploadList={false}
                              >
                                <Button icon={<UploadOutlined />}>
                                  {pendingFiles[`content_blocks_${index}`] ? '파일 선택됨' : '이미지 업로드'}
                                </Button>
                              </Upload>
                              {(previewUrls[`content_blocks_${index}`] ||
                                (form.getFieldValue(['content_blocks', field.name, 'url']) && !pendingFiles[`content_blocks_${index}`])) && (
                                  <div style={{ marginTop: 8 }}>
                                    <img
                                      src={
                                        previewUrls[`content_blocks_${index}`] ||
                                        signedUrls[`block_${index}`] ||
                                        form.getFieldValue(['content_blocks', field.name, 'url'])
                                      }
                                      alt="블록 이미지"
                                      crossOrigin="anonymous"
                                      style={{ maxWidth: 200, maxHeight: 150, objectFit: 'cover', borderRadius: 8 }}
                                    />
                                  </div>
                                )}
                            </Form.Item>
                            <Form.Item name={[field.name, 'caption']} label="캡션 (선택)">
                              <Input placeholder="캡션 입력 (선택사항)" />
                            </Form.Item>
                          </>
                        ) : (
                          <Form.Item
                            name={[field.name, 'content']}
                            label="텍스트"
                            rules={[{ required: true, message: '텍스트를 입력해주세요.' }]}
                          >
                            <TextArea rows={4} placeholder="본문 텍스트" />
                          </Form.Item>
                        )}
                      </Card>
                    </div>
                  );
                })}
                <Space>
                  <Button type="dashed" onClick={() => add({ type: 'text', content: '' })}>
                    텍스트 블록 추가
                  </Button>
                  <Button type="dashed" icon={<UploadOutlined />} onClick={() => add({ type: 'image', url: null })}>
                    이미지 블록 추가
                  </Button>
                </Space>
              </Space>
            )}
          </Form.List>
          <Form.Item name="cover_image_url" label="커버 이미지">
            <Upload
              beforeUpload={(file) => handleFileSelect(file, 'cover_image_url')}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>
                {pendingFiles.cover_image_url ? '파일 선택됨' : '이미지 업로드'}
              </Button>
            </Upload>
            {editingMagazine?.cover_image_url && !pendingFiles.cover_image_url && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={signedUrls['cover'] || editingMagazine.cover_image_url}
                  alt="커버"
                  crossOrigin="anonymous"
                  style={{ maxWidth: 200, maxHeight: 150, objectFit: 'cover' }}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item name="images" label="추가 이미지 (다중)">
            <Upload
              multiple
              beforeUpload={(_file, fileList) => {
                const files = fileList.map(f => (f as { originFileObj?: File }).originFileObj || f as File).filter((f): f is File => f instanceof File);
                handleMultipleFileSelect(files, 'images');
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>
                {pendingFiles.images ? `${(pendingFiles.images as File[]).length}개 파일 선택됨` : '이미지 업로드'}
              </Button>
            </Upload>
            {editingMagazine?.images && editingMagazine.images.length > 0 && !pendingFiles.images && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {editingMagazine.images
                  .filter((url) => !removedGalleryUrls.includes(url))
                  .map((url, idx) => (
                    <img
                      key={idx}
                      src={signedUrls[`gallery_${idx}`] || url}
                      alt={`이미지 ${idx + 1}`}
                      crossOrigin="anonymous"
                      style={{ maxWidth: 150, maxHeight: 100, objectFit: 'cover' }}
                    />
                  ))}
              </div>
            )}
          </Form.Item>

          <Form.Item name="video_url" label="비디오 URL">
            <Input placeholder="비디오 URL (선택사항)" />
          </Form.Item>

          <Form.Item name="tags" label="태그 (쉼표로 구분)">
            <Input placeholder="예: 패션, 브랜딩, 마케팅" />
          </Form.Item>

          <Form.Item
            name="display_order"
            label="홈 노출 순서 (0~4)"
            style={{ width: '100%' }}
            rules={[
              {
                validator: (_rule, value) => {
                  if (value === undefined || value === null || value === '') return Promise.resolve();
                  const num = Number(value);
                  if (Number.isNaN(num) || num < 0 || num > 4) {
                    return Promise.reject(new Error('0~4 사이 숫자를 입력하면 홈에 노출됩니다.'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={0} max={4} placeholder="비워두면 홈 미노출" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="related_project" label="연관 프로젝트">
            <Select
              placeholder="프로젝트 선택 (선택사항)"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={projects.map(p => ({ value: p.id, label: p.title }))}
              allowClear
            />
          </Form.Item>

          <Form.Item name="meta_title" label="메타 제목 (SEO)">
            <Input placeholder="검색 엔진 최적화용 제목" />
          </Form.Item>

          <Form.Item name="meta_description" label="메타 설명 (SEO)">
            <TextArea rows={2} placeholder="검색 엔진 최적화용 설명" />
          </Form.Item>

          <Form.Item name="meta_keywords" label="메타 키워드 (쉼표로 구분, SEO)">
            <Input placeholder="예: 브랜딩, 마케팅, 전략" />
          </Form.Item>

          <Form.Item name="slug" label="슬러그 (URL)">
            <Input placeholder="url-friendly-slug" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

