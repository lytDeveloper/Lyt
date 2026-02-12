import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Upload,
  Radio,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { checkIsAdmin } from '../utils/auth';
import { logAdminActivity } from '../utils/adminActivity';
import { toast } from 'react-toastify';
import {
  listSliderImages,
  createSliderImage,
  updateSliderImage,
  deleteSliderImage,
  updateSliderImageOrder,
  listTrendingProjects,
  createTrendingProject,
  updateTrendingProject,
  listProjectsForTrending,
  deleteTrendingProject,
  updateTrendingProjectOrder,
  uploadHomepageImage,
} from '../api/homepage';
import type {
  HomepageSliderImage,
  HomepageTrendingProject,
  Magazine,
} from '../types/database.types';
import { listMagazines, updateMagazine } from '../api/magazines';
import dayjs from 'dayjs';
import { useSignedImages } from '../hooks/useSignedImage';

function normalizeLinkUrl(link?: string | null): string | undefined {
  if (!link) return undefined;
  const trimmed = link.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

const { Title } = Typography;

type SectionType =
  | 'slider'
  | 'trending'
  | 'magazine';

export default function HomepageManagement() {
  const [loading, setLoading] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectionType>('slider');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // 각 섹션별 데이터
  const [sliderImages, setSliderImages] = useState<HomepageSliderImage[]>([]);
  const [trendingProjects, setTrendingProjects] = useState<HomepageTrendingProject[]>([]);
  const [projectPool, setProjectPool] = useState<HomepageTrendingProject[]>([]);
  const [homepageMagazines, setHomepageMagazines] = useState<Magazine[]>([]);
  const [draggingMagazineId, setDraggingMagazineId] = useState<string | null>(null);
  const [draggingSliderId, setDraggingSliderId] = useState<string | null>(null);
  const [draggingTrendingId, setDraggingTrendingId] = useState<string | null>(null);

  // homepage-images 버킷 서명 URL 적용 (slider 이미지)
  const sliderImageUrls = useMemo(() => sliderImages.map((s) => s.image_url), [sliderImages]);
  const signedSliderUrls = useSignedImages(sliderImageUrls);
  const sliderImageUrlMap = useMemo(() => {
    const map = new Map<string, string | null>();
    sliderImages.forEach((s, idx) => {
      map.set(s.id, signedSliderUrls[idx] ?? s.image_url ?? null);
    });
    return map;
  }, [sliderImages, signedSliderUrls]);

  // homepage-images 버킷 서명 URL 적용 (slider 비디오)
  const sliderVideoUrls = useMemo(() => sliderImages.map((s) => s.video_url), [sliderImages]);
  const signedVideoUrls = useSignedImages(sliderVideoUrls);
  const sliderVideoUrlMap = useMemo(() => {
    const map = new Map<string, string | null>();
    sliderImages.forEach((s, idx) => {
      const originalUrl = s.video_url;
      const signedUrl = signedVideoUrls[idx];

      // 디버깅 로그
      if (originalUrl) {
        console.log('[HomepageManagement] 비디오 URL 매핑:', {
          id: s.id,
          original: originalUrl,
          signed: signedUrl,
          isSigned: signedUrl?.includes('/sign/') ?? false
        });
      }

      map.set(s.id, signedUrl ?? originalUrl ?? null);
    });
    return map;
  }, [sliderImages, signedVideoUrls]);

  // 매거진 드래그 정렬 헬퍼
  const reorderActiveMagazines = useCallback(
    (list: Magazine[], fromId: string, toId: string) => {
      const active = list
        .filter((m) => m.is_active !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const fromIdx = active.findIndex((m) => m.id === fromId);
      const toIdx = active.findIndex((m) => m.id === toId);
      if (fromIdx === -1 || toIdx === -1) return { nextList: list, reorderedActive: active };

      const reordered = [...active];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      const orderMap = new Map<string, number>();
      reordered.forEach((m, idx) => orderMap.set(m.id, idx));

      const nextList = list.map((m) =>
        orderMap.has(m.id) ? { ...m, display_order: orderMap.get(m.id) ?? m.display_order } : m
      );
      return { nextList, reorderedActive: reordered };
    },
    []
  );

  const reorderList = useCallback(
    <T extends { id: string; display_order?: number | null }>(
      list: T[],
      fromId: string,
      toId: string
    ) => {
      const fromIdx = list.findIndex((i) => i.id === fromId);
      const toIdx = list.findIndex((i) => i.id === toId);
      if (fromIdx === -1 || toIdx === -1) return list;

      const reordered = [...list];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      return reordered.map((item, idx) => ({ ...item, display_order: idx })) as T[];
    },
    []
  );

  const persistMagazineOrder = useCallback(
    async (ordered: Magazine[]) => {
      if (!currentAdminId) return;
      const active = ordered
        .filter((m) => m.is_active !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      for (let i = 0; i < active.length; i++) {
        const item = active[i];
        if (item.display_order !== i) {
          await updateMagazine(item.id, { display_order: i }, currentAdminId);
        }
      }
      await logAdminActivity(currentAdminId, 'homepage_magazine_reorder', null, {});
      toast.success('매거진 순서가 변경되었습니다.');
    },
    [currentAdminId]
  );

  const orderedMagazines = useMemo(() => {
    return [...homepageMagazines].sort((a, b) => {
      const activeA = a.is_active !== false;
      const activeB = b.is_active !== false;
      if (activeA !== activeB) return activeA ? -1 : 1;
      return (a.display_order ?? 999) - (b.display_order ?? 999);
    });
  }, [homepageMagazines]);

  // 모달 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<
    HomepageSliderImage | HomepageTrendingProject | Magazine | null
  >(null);
  const [form] = Form.useForm();
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | File[] | null>>({});
  const [selectedFileNames, setSelectedFileNames] = useState<Record<string, string>>({});
  const mediaTypeValue = Form.useWatch('media_type', form);
  const currentSliderMediaType =
    mediaTypeValue ||
    (editingItem && 'media_type' in editingItem ? editingItem.media_type : undefined) ||
    'image';

  useEffect(() => {
    if (activeTab !== 'slider') return;
    if (currentSliderMediaType === 'video') {
      setPendingFiles((prev) => ({ ...prev, image_url: null }));
      form.setFieldsValue({ image_url: null });
    } else {
      setPendingFiles((prev) => ({ ...prev, video_url: null }));
      form.setFieldsValue({ video_url: null });
    }
  }, [activeTab, currentSliderMediaType, form]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const admin = await checkIsAdmin();
    if (!admin || (admin.role !== 'super_admin' && !admin.permissions.includes('content_management'))) {
      toast.error('콘텐츠 관리 권한이 없습니다.');
      return;
    }
    setCurrentAdminId(admin.profile_id);
  };

  const loadData = useCallback(async (section: SectionType) => {
    if (!currentAdminId) return;

    setLoading(true);
    try {
      switch (section) {
        case 'slider': {
          const sliderData = await listSliderImages();
          setSliderImages(sliderData);
          break;
        }
        case 'trending': {
          const trendingData = await listTrendingProjects();
          const allProjects = await listProjectsForTrending();
          setTrendingProjects(trendingData);
          setProjectPool(allProjects);
          break;
        }
        case 'magazine': {
          // 모든 발행된 매거진 가져오기 (홈 노출 여부는 is_active와 display_order로 구분)
          const allMagazines = await listMagazines({ status: 'published' });
          // display_order가 있는 것들을 먼저 정렬하고, 없는 것들은 나중에
          const sortedMagazines = allMagazines.sort((a, b) => {
            const aOrder = a.display_order ?? 999;
            const bOrder = b.display_order ?? 999;
            return aOrder - bOrder;
          });
          setHomepageMagazines(sortedMagazines);
          break;
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '데이터 로드에 실패했습니다.';
      console.error('데이터 로드 실패:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentAdminId]);

  useEffect(() => {
    if (currentAdminId) {
      loadData(activeTab);
    }
  }, [activeTab, currentAdminId, loadData]);

  const persistSliderOrder = useCallback(
    async (ordered: HomepageSliderImage[]) => {
      if (!currentAdminId) return;
      try {
        await updateSliderImageOrder(ordered.map((item) => item.id), currentAdminId);
        await logAdminActivity(currentAdminId, 'homepage_slider_reorder', null, {});
        toast.success('순서가 변경되었습니다.');
        loadData('slider');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '순서 변경에 실패했습니다.';
        console.error('슬라이더 순서 변경 실패:', error);
        toast.error(errorMessage);
      }
    },
    [currentAdminId, loadData]
  );

  const persistTrendingOrder = useCallback(
    async (ordered: HomepageTrendingProject[]) => {
      if (!currentAdminId) return;
      try {
        await updateTrendingProjectOrder(ordered.map((item) => item.id));
        await logAdminActivity(currentAdminId, 'homepage_trending_reorder', null, {});
        toast.success('순서가 변경되었습니다.');
        loadData('trending');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '순서 변경에 실패했습니다.';
        console.error('트렌딩 순서 변경 실패:', error);
        toast.error(errorMessage);
      }
    },
    [currentAdminId, loadData]
  );


  const handleCreate = () => {
    if (activeTab === 'magazine') {
      toast.info('매거진 콘텐츠 수정/생성은 매거진 관리에서만 가능합니다.');
      return;
    }
    setEditingItem(null);
    form.resetFields();
    if (activeTab === 'slider') {
      form.setFieldsValue({ media_type: 'image', is_active: true });
    }
    if (activeTab === 'trending') {
      form.setFieldsValue({
        project_id: undefined,
        display_order: trendingProjects.length,
      });
    }
    setPendingFiles({});
    setSelectedFileNames({});
    setUploadProgress({});
    setModalVisible(true);
  };

  const handleEdit = useCallback((record: HomepageSliderImage | HomepageTrendingProject | Magazine) => {
    if (activeTab === 'magazine') {
      toast.info('매거진 내용 수정은 매거진 관리 화면에서 진행해주세요.');
      return;
    }
    setEditingItem(record);
    form.setFieldsValue(record);
    if (activeTab === 'slider' && 'media_type' in record) {
      form.setFieldsValue({
        media_type: record.media_type || 'image',
      });
    }
    if (activeTab === 'trending') {
      form.setFieldsValue({
        project_id: record.id,
        display_order: record.display_order ?? 0,
      });
    }
    setPendingFiles({});
    setSelectedFileNames({});
    setUploadProgress({});
    setModalVisible(true);
  }, [activeTab, form]);

  const handleDelete = useCallback(async (id: string, section: SectionType) => {
    if (!currentAdminId) return;

    try {
      switch (section) {
        case 'slider':
          await deleteSliderImage(id);
          break;
        case 'trending':
          await deleteTrendingProject(id);
          break;
      }

      await logAdminActivity(currentAdminId, `homepage_${section}_delete`, null, { id });
      toast.success('삭제되었습니다.');
      loadData(section);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '삭제에 실패했습니다.';
      console.error('삭제 실패:', error);
      toast.error(errorMessage);
    }
  }, [currentAdminId, loadData]);

  const handleMove = useCallback(async (id: string, direction: 'up' | 'down', section: SectionType) => {
    if (!currentAdminId) return;

    try {
      let items: (HomepageSliderImage | HomepageTrendingProject | Magazine)[] = [];
      switch (section) {
        case 'slider':
          items = [...sliderImages];
          break;
        case 'trending':
          items = [...trendingProjects];
          break;
        case 'magazine':
          items = homepageMagazines
            .filter((m) => m.is_active !== false && m.display_order !== null && m.display_order !== undefined)
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          break;
      }

      const currentIndex = items.findIndex((item) => item.id === id);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= items.length) return;

      // 순서 교환
      [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]];

      const ids = items.map((item) => item.id);

      switch (section) {
        case 'slider':
          await updateSliderImageOrder(ids, currentAdminId);
          break;
        case 'trending':
          await updateTrendingProjectOrder(ids);
          break;
        case 'magazine': {
          // magazines 테이블의 display_order 업데이트
          for (let i = 0; i < items.length; i++) {
            const item = items[i] as Magazine;
            await updateMagazine(item.id, { display_order: i }, currentAdminId);
          }
          break;
        }
      }

      await logAdminActivity(currentAdminId, `homepage_${section}_reorder`, null, { id, direction });
      toast.success('순서가 변경되었습니다.');
      loadData(section);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '순서 변경에 실패했습니다.';
      console.error('순서 변경 실패:', error);
      toast.error(errorMessage);
    }
  }, [currentAdminId, sliderImages, trendingProjects, homepageMagazines, loadData]);

  const handleSliderDrop = useCallback(
    async (targetId: string) => {
      if (!currentAdminId || !draggingSliderId || draggingSliderId === targetId) return;
      const reordered = reorderList(sliderImages, draggingSliderId, targetId);
      setSliderImages(reordered);
      setDraggingSliderId(null);
      await persistSliderOrder(reordered);
    },
    [currentAdminId, draggingSliderId, sliderImages, reorderList, persistSliderOrder]
  );

  const handleTrendingDrop = useCallback(
    async (targetId: string) => {
      if (!currentAdminId || !draggingTrendingId || draggingTrendingId === targetId) return;
      const reordered = reorderList(trendingProjects, draggingTrendingId, targetId);
      setTrendingProjects(reordered);
      setDraggingTrendingId(null);
      await persistTrendingOrder(reordered);
    },
    [currentAdminId, draggingTrendingId, trendingProjects, reorderList, persistTrendingOrder]
  );


  const handleToggleMagazineActive = useCallback(
    async (record: Magazine, nextActive: boolean) => {
      if (!currentAdminId) return;
      try {
        const activeItems = homepageMagazines.filter(
          (m) => m.is_active !== false && m.display_order !== null && m.display_order !== undefined && m.id !== record.id
        );
        const activeCount = activeItems.length;
        if (nextActive && activeCount >= 5) {
          toast.error('홈 매거진은 최대 5개까지만 노출할 수 있습니다.');
          return;
        }

        // display_order 설정: 활성화 시 마지막 순서로, 비활성화 시 null
        const newDisplayOrder = nextActive
          ? record.display_order !== null && record.display_order !== undefined
            ? record.display_order
            : activeCount
          : null;

        await updateMagazine(
          record.id,
          {
            is_active: nextActive,
            display_order: newDisplayOrder ?? 0,
          },
          currentAdminId
        );
        await logAdminActivity(currentAdminId, 'homepage_magazine_toggle', null, {
          id: record.id,
          is_active: nextActive,
          display_order: newDisplayOrder,
        });
        toast.success('활성 상태가 변경되었습니다.');
        loadData('magazine');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '변경에 실패했습니다.';
        console.error('매거진 활성 변경 실패:', error);
        toast.error(errorMessage);
      }
    },
    [currentAdminId, homepageMagazines, loadData]
  );

  const handleToggleSliderActive = useCallback(
    async (record: HomepageSliderImage, nextActive: boolean) => {
      if (!currentAdminId) return;
      try {
        await updateSliderImage(
          record.id,
          {
            is_active: nextActive,
          },
          currentAdminId
        );
        await logAdminActivity(currentAdminId, 'homepage_slider_toggle', null, {
          id: record.id,
          is_active: nextActive,
        });
        toast.success('활성 상태가 변경되었습니다.');
        setSliderImages((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, is_active: nextActive } : item))
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '변경에 실패했습니다.';
        console.error('슬라이더 활성 변경 실패:', error);
        toast.error(errorMessage);
      }
    },
    [currentAdminId]
  );

  const handleSubmit = async () => {
    if (!currentAdminId) return;

    setSubmitLoading(true);
    try {
      const values = await form.validateFields();
      const payload = { ...values };

      for (const [fieldName, file] of Object.entries(pendingFiles)) {
        if (!file) continue;

        // 배열인 경우 각각 업로드
        if (Array.isArray(file)) {
          const urls: string[] = [];
          for (const f of file) {
            // slider 폴더 사용하지 않음 (signed URL 생성 문제 방지)
            const url = await uploadHomepageImage(f, currentAdminId, undefined, (progress) => {
              setUploadProgress((prev) => ({ ...prev, [fieldName]: progress }));
            });
            urls.push(url);
          }
          payload[fieldName] = urls;
        } else {
          // 진행률 콜백 추가
          setUploadProgress((prev) => ({ ...prev, [fieldName]: 0 }));
          // slider 폴더 사용하지 않음 (signed URL 생성 문제 방지)
          const url = await uploadHomepageImage(file, currentAdminId, undefined, (progress) => {
            console.log(`[HomepageManagement] 업로드 진행률 - ${fieldName}: ${progress}%`);
            setUploadProgress((prev) => ({ ...prev, [fieldName]: progress }));
          });
          console.log(`[HomepageManagement] 업로드 완료 - ${fieldName}:`, url);
          payload[fieldName] = url;
        }
      }

      if (activeTab === 'slider') {
        payload.media_type = payload.media_type || 'image';
        if (payload.media_type === 'video') {
          // 비디오 업로드 시 image_url은 null로 설정
          payload.image_url = null;
          // video_url이 없으면 에러
          if (!payload.video_url) {
            throw new Error('비디오 파일을 업로드해주세요.');
          }
          console.log('[HomepageManagement] 비디오 URL 저장:', payload.video_url);
        } else {
          // 이미지 업로드 시 video_url은 null로 설정
          payload.video_url = null;
          // image_url이 없으면 에러
          if (!payload.image_url) {
            throw new Error('이미지 파일을 업로드해주세요.');
          }
        }
      }

      if (activeTab === 'magazine') {
        setSubmitLoading(false);
        return;
      }

      switch (activeTab) {
        case 'slider':
          if (editingItem) {
            await updateSliderImage(editingItem.id, payload, currentAdminId);
            await logAdminActivity(currentAdminId, 'homepage_slider_update', null, { id: editingItem.id });
            toast.success('수정되었습니다.');
          } else {
            await createSliderImage(payload, currentAdminId);
            await logAdminActivity(currentAdminId, 'homepage_slider_create', null, {});
            toast.success('생성되었습니다.');
          }
          break;
        case 'trending':
          if (!payload.project_id && !editingItem) {
            toast.error('프로젝트를 선택해주세요.');
            break;
          }
          if (editingItem) {
            await updateTrendingProject(editingItem.id, {
              display_order: payload.display_order ?? 0,
              is_trending: true,
            });
            await logAdminActivity(currentAdminId, 'homepage_trending_update', null, { id: editingItem.id });
            toast.success('수정되었습니다.');
          } else {
            await createTrendingProject({
              project_id: payload.project_id,
              display_order: payload.display_order ?? trendingProjects.length,
            });
            await logAdminActivity(currentAdminId, 'homepage_trending_create', null, {});
            toast.success('생성되었습니다.');
          }
          break;
      }

      setModalVisible(false);
      setEditingItem(null);
      form.resetFields();
      setPendingFiles({});
      setSelectedFileNames({});
      setUploadProgress({});

      // 업로드 직후 CDN 캐시 지연을 고려하여 약간의 지연 후 데이터 로드
      // 비디오의 경우 특히 CDN 전파 시간이 필요할 수 있음
      const isVideoUpload = activeTab === 'slider' && payload.media_type === 'video' && payload.video_url;
      if (isVideoUpload) {
        // 비디오 업로드 시 1초 대기 후 데이터 로드
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      loadData(activeTab);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '저장에 실패했습니다.';
      console.error('저장 실패:', error);
      toast.error(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFileSelect = (file: File, fieldName: string) => {
    setPendingFiles((prev) => ({ ...prev, [fieldName]: file }));
    setSelectedFileNames((prev) => ({ ...prev, [fieldName]: file.name }));
    form.setFieldsValue({ [fieldName]: file.name });
    return false;
  };

  // 슬라이더 이미지 컬럼
  const sliderColumns: ColumnsType<HomepageSliderImage> = useMemo(() => [
    {
      title: '순서',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 80,
    },
    {
      title: '미디어 유형',
      dataIndex: 'media_type',
      key: 'media_type',
      width: 100,
      render: (type: string | null) =>
        type === 'video' ? <Tag color="blue">영상</Tag> : <Tag>이미지</Tag>,
    },
    {
      title: '미디어',
      key: 'media',
      width: 220,
      render: (_, record) => {
        if (record.media_type === 'video' && record.video_url) {
          const signedVideoUrl = sliderVideoUrlMap.get(record.id) || record.video_url;
          return (
            <video
              key={signedVideoUrl}
              src={signedVideoUrl}
              muted
              loop
              playsInline
              crossOrigin="anonymous"
              style={{ width: 160, height: 140, objectFit: 'cover', borderRadius: 6 }}
              onError={(e) => {
                console.error('[Video] 로드 실패:', signedVideoUrl, e);
                // 에러 발생 시 비디오 요소를 숨기고 에러 메시지 표시
                const target = e.currentTarget;
                target.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.textContent = '비디오 로드 실패';
                errorDiv.style.cssText = 'width: 160px; height: 140px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 6px; color: #999; font-size: 12px;';
                target.parentNode?.appendChild(errorDiv);
              }}
              onLoadedData={() => {
                console.log('[Video] 로드 성공:', signedVideoUrl);
              }}
            />
          );
        }
        return (
          <img
            src={sliderImageUrlMap.get(record.id) || record.image_url || ''}
            alt="슬라이더"
            crossOrigin="anonymous"
            style={{ width: 160, height: 140, objectFit: 'cover', borderRadius: 6 }}
            onError={(e) => {
              console.error('[Image] 로드 실패:', record.image_url);
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="140"%3E%3Crect fill="%23f0f0f0" width="160" height="140"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E이미지 없음%3C/text%3E%3C/svg%3E';
            }}
          />
        );
      },
    },
    {
      title: '링크 URL',
      dataIndex: 'link_url',
      key: 'link_url',
      width: 200,
      ellipsis: true,
      render: (link: string) => {
        const href = normalizeLinkUrl(link);
        return href ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {link}
          </a>
        ) : (
          '-'
        );
      },
    },
    {
      title: '활성',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (_v, record) => (
        <Switch
          checked={!!record.is_active}
          onChange={(checked) => handleToggleSliderActive(record, checked)}
        />
      ),
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v) => dayjs(v).format('YY/MM/DD HH:mm'),
    },
    {
      title: '작업',
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={() => handleMove(record.id, 'up', 'slider')}
            disabled={record.display_order === 0}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={() => handleMove(record.id, 'down', 'slider')}
            disabled={record.display_order === sliderImages.length - 1}
          />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            수정
          </Button>
          <Popconfirm title="정말 삭제하시겠어요?" onConfirm={() => handleDelete(record.id, 'slider')}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [sliderImages.length, handleDelete, handleEdit, handleMove, handleToggleSliderActive, sliderImageUrlMap, sliderVideoUrlMap]);

  // 급상승 프로젝트 컬럼
  const trendingColumns: ColumnsType<HomepageTrendingProject> = useMemo(() => [
    {
      title: '순서',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 80,
      render: (v: number | null) => (v ?? '-'),
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      width: 140,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string | null) => status || '-',
    },
    {
      title: '커버',
      dataIndex: 'cover_image_url',
      key: 'cover_image_url',
      width: 160,
      render: (url: string | null) =>
        url ? (
          <img
            src={url}
            alt="cover"
            crossOrigin="anonymous"
            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }}
          />
        ) : (
          '-'
        ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={() => handleMove(record.id, 'up', 'trending')}
            disabled={(record.display_order ?? 0) === 0}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={() => handleMove(record.id, 'down', 'trending')}
            disabled={(record.display_order ?? trendingProjects.length - 1) === trendingProjects.length - 1}
          />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            수정
          </Button>
          <Popconfirm title="정말 삭제하시겠어요?" onConfirm={() => handleDelete(record.id, 'trending')}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [trendingProjects.length, handleDelete, handleEdit, handleMove]);

  // 매거진 컬럼 (콘텐츠 수정/삭제 없음, 노출/순서만 관리)
  const magazineColumns: ColumnsType<Magazine> = useMemo(() => {
    return [
      {
        title: '순서',
        dataIndex: 'display_order',
        key: 'display_order',
        width: 80,
      },
      {
        title: '제목',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
      },
      {
        title: '부제',
        dataIndex: 'subtitle',
        key: 'subtitle',
        ellipsis: true,
        render: (v) => v || '-',
      },
      {
        title: '대표 이미지',
        dataIndex: 'cover_image_url',
        key: 'cover_image_url',
        width: 140,
        render: (url: string | null) =>
          url ? (
            <img
              src={url}
              alt="매거진 대표 이미지"
              crossOrigin="anonymous"
              style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }}
            />
          ) : (
            '-'
          ),
      },
      {
        title: '활성',
        dataIndex: 'is_active',
        key: 'is_active',
        width: 100,
        render: (v, record) => (
          <Switch checked={!!v} onChange={(checked) => handleToggleMagazineActive(record, checked)} />
        ),
      },
      {
        title: '작업',
        key: 'actions',
        width: 200,
        render: () => (
          <span style={{ color: '#999' }}>
            드래그하여 순서 변경
          </span>
        ),
      },
    ];
  }, [handleToggleMagazineActive]);

  const handleMagazineDrop = useCallback(
    async (targetId: string) => {
      if (!draggingMagazineId || draggingMagazineId === targetId) return;
      const { nextList } = reorderActiveMagazines(homepageMagazines, draggingMagazineId, targetId);
      setHomepageMagazines(nextList);
      setDraggingMagazineId(null);
      await persistMagazineOrder(nextList);
    },
    [draggingMagazineId, homepageMagazines, persistMagazineOrder, reorderActiveMagazines]
  );

  const renderForm = () => {
    switch (activeTab) {
      case 'slider':
        return (
          <>
            <Form.Item label="미디어 유형" name="media_type" initialValue="image">
              <Radio.Group>
                <Radio.Button value="image">이미지</Radio.Button>
                <Radio.Button value="video">영상</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {currentSliderMediaType === 'video' ? (
              <>
                <Form.Item
                  label="영상"
                  name="video_url"
                  rules={[{ required: true, message: '영상 파일을 업로드하거나 URL을 입력해주세요.' }]}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Upload
                        showUploadList={false}
                        beforeUpload={(file) => handleFileSelect(file, 'video_url')}
                        accept="video/*"
                      >
                        <Button
                          icon={<UploadOutlined />}
                          loading={uploadProgress['video_url'] !== undefined && uploadProgress['video_url'] < 100}
                        >
                          비디오 파일 업로드 (자동 WebM 변환)
                        </Button>
                      </Upload>
                      {selectedFileNames['video_url'] && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          선택됨: {selectedFileNames['video_url']}
                        </Typography.Text>
                      )}
                    </Space>
                    {uploadProgress['video_url'] !== undefined && uploadProgress['video_url'] < 100 && (
                      <Progress
                        percent={uploadProgress['video_url']}
                        status="active"
                        format={(percent) => `${percent ?? 0}% ${(percent ?? 0) < 80 ? '(변환 중...)' : '(업로드 중...)'}`}
                      />
                    )}
                    <Input placeholder="또는 비디오 URL 직접 입력" />
                  </Space>
                </Form.Item>
              </>
            ) : (
              <Form.Item
                label="이미지 파일"
                name="image_url"
                rules={[{ required: true, message: '이미지 파일을 업로드하거나 URL을 입력해주세요.' }]}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Upload
                      showUploadList={false}
                      beforeUpload={(file) => handleFileSelect(file, 'image_url')}
                      accept="image/*"
                    >
                      <Button icon={<UploadOutlined />}>이미지 파일 업로드 (자동 WebP 변환)</Button>
                    </Upload>
                    {selectedFileNames['image_url'] && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        선택됨: {selectedFileNames['image_url']}
                      </Typography.Text>
                    )}
                  </Space>
                  {uploadProgress['image_url'] !== undefined && uploadProgress['image_url'] < 100 && (
                    <Progress
                      percent={uploadProgress['image_url']}
                      status="active"
                      format={(percent) => `${percent ?? 0}% ${(percent ?? 0) < 80 ? '(변환 중...)' : '(업로드 중...)'}`}
                    />
                  )}
                  <Input placeholder="또는 이미지 URL 직접 입력" />
                </Space>
              </Form.Item>
            )}
            <Form.Item label="링크 URL" name="link_url">
              <Input placeholder="이미지 클릭 시 이동할 URL (선택)" />
            </Form.Item>
            <Form.Item label="배경색" name="background_color">
              <Input placeholder="#FFB6C1 (선택)" />
            </Form.Item>
            <Form.Item label="활성화" name="is_active" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </>
        );
      case 'trending':
        return (
          <>
            <Form.Item
              label="프로젝트 선택"
              name="project_id"
              rules={[{ required: true, message: '프로젝트를 선택해주세요.' }]}
            >
              <Select
                showSearch
                placeholder="프로젝트 검색"
                filterOption={(input: string, option?: { label?: string }) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={projectPool.map((p) => ({
                  value: p.id,
                  label: `${p.title}${p.category ? ` / ${p.category}` : ''}`,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="노출 순서"
              name="display_order"
              initialValue={trendingProjects.length}
              rules={[{ required: true, message: '노출 순서를 입력해주세요.' }]}
            >
              <Input type="number" min={0} />
            </Form.Item>
          </>
        );
      case 'magazine':
        return (
          <>
            <Typography.Text>
              매거진 콘텐츠 수정/생성은 별도 매거진 관리 화면에서 진행해주세요. 여기서는 홈 노출 여부와 순서만 조정할 수 있습니다.
            </Typography.Text>
          </>
        );
      default:
        return null;
    }
  };

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'slider':
        return '이미지 슬라이더';
      case 'trending':
        return '급상승 프로젝트';
      case 'magazine':
        return '홈 매거진';
      default:
        return '';
    }
  };

  return (
    <div>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            라잇 화면 관리
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            disabled={activeTab === 'magazine'}
          >
            추가
          </Button>
        </Space>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as SectionType)}
          items={[
            {
              key: 'slider',
              label: '이미지 슬라이더',
            },
            {
              key: 'trending',
              label: '급상승 프로젝트',
            },
            {
              key: 'magazine',
              label: '매거진(최대 5개)',
            },
          ]}
        />

        {activeTab === 'slider' && (
          <Table<HomepageSliderImage>
            rowKey="id"
            loading={loading}
            dataSource={sliderImages}
            columns={sliderColumns}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              draggable: true,
              onDragStart: () => setDraggingSliderId(record.id),
              onDragOver: (e) => e.preventDefault(),
              onDrop: () => {
                void handleSliderDrop(record.id);
              },
              onDragEnd: () => setDraggingSliderId(null),
              style: { cursor: 'move' },
            })}
          />
        )}
        {activeTab === 'trending' && (
          <Table<HomepageTrendingProject>
            rowKey="id"
            loading={loading}
            dataSource={trendingProjects}
            columns={trendingColumns}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              draggable: true,
              onDragStart: () => setDraggingTrendingId(record.id),
              onDragOver: (e) => e.preventDefault(),
              onDrop: () => {
                void handleTrendingDrop(record.id);
              },
              onDragEnd: () => setDraggingTrendingId(null),
              style: { cursor: 'move' },
            })}
          />
        )}
        {activeTab === 'magazine' && (
          <Table<Magazine>
            rowKey="id"
            loading={loading}
            dataSource={orderedMagazines}
            columns={magazineColumns}
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              draggable: record.is_active !== false,
              onDragStart: () => {
                if (record.is_active !== false) setDraggingMagazineId(record.id);
              },
              onDragOver: (e) => {
                if (record.is_active !== false) e.preventDefault();
              },
              onDrop: () => {
                if (record.is_active !== false) void handleMagazineDrop(record.id);
              },
              style: record.is_active !== false ? { cursor: 'move' } : { opacity: 0.7 },
            })}
          />
        )}
      </Card>

      {activeTab !== 'magazine' && (
        <Modal
          title={editingItem ? `${getSectionTitle()} 수정` : `${getSectionTitle()} 추가`}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditingItem(null);
            form.resetFields();
            setPendingFiles({});
            setSelectedFileNames({});
            setUploadProgress({});
          }}
          onOk={handleSubmit}
          confirmLoading={submitLoading}
          width={600}
          destroyOnHidden
        >
          <Form form={form} layout="vertical">
            {modalVisible ? renderForm() : null}
          </Form>
        </Modal>
      )}
    </div>
  );
}

