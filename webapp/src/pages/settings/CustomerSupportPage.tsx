import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Chip,
    Paper,
    InputBase,
    Skeleton,
    Dialog,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import WindowOutlinedIcon from '@mui/icons-material/WindowOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TextsmsOutlinedIcon from '@mui/icons-material/TextsmsOutlined';
import InquiryModal from '../../components/common/InquiryModal';
import { ReportModal } from '../../components/common';
import FeedbackModal from '../../components/common/FeedbackModal';
import TabBarFill from '../../components/common/TabBarFill';
import TabBarBottomline from '../../components/common/TabBarBottomline';
import { supabase } from '../../lib/supabase';
import NotificationImg from '../../assets/icon/customerSupport/notification.png';
import FeedbackImg from '../../assets/icon/customerSupport/feedback.png';
import ContactImg from '../../assets/icon/customerSupport/contact.png';
import ReportImg from '../../assets/icon/customerSupport/report.png';
import ManualImg1 from '../../assets/manual/manual1.png';
import ManualImg2 from '../../assets/manual/manual2.png';
import ManualImg3 from '../../assets/manual/manual3.png';
import ManualImg4 from '../../assets/manual/manual4.png';
import ManualImg5 from '../../assets/manual/manual5.png';
import ManualImg6 from '../../assets/manual/manual6.png';
type TabValue = 'faq' | 'history' | 'guide';
type FaqTab = 'all' | 'account' | 'project' | 'collaboration' | 'message' | 'tech';
type HistoryTab = 'all' | 'pending' | 'progress' | 'done';

// Inquiry types matching database schema
type InquiryType = 'ban_appeal' | 'general' | 'account' | 'project' | 'payment' | 'bug' | 'technical' | 'other';
type InquiryStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

interface InquiryItem {
    inquiry_id: string;
    user_id: string;
    username: string | null;
    nickname: string | null;
    inquiry_type: InquiryType;
    subject: string;
    contents: string;
    created_at: string;
    status: InquiryStatus;
    manager_profile_id: string | null;
    answered_at: string | null;
    answer_content: string | null;
    attachments: string[] | null;
}

interface FaqItem {
    id: string;
    category: Exclude<FaqTab, 'all'>;
    question: string;
    answer: string | React.ReactNode;
}

// Labels and colors for inquiry types and statuses
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
    in_progress: '처리중',
    resolved: '답변 완료',
    closed: '종료',
};

export default function CustomerSupportPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<TabValue>('faq');

    // 페이지 초기 진입시 스크롤을 최상단으로 설정
    useEffect(() => {
        // 즉시 실행
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // 렌더링 후 추가 실행 (RAF 사용)
        const rafId = requestAnimationFrame(() => {
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
            }
            window.scrollTo(0, 0);
        });

        // 콘텐츠 로드 후 최종 실행
        const timer = setTimeout(() => {
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
            }
            window.scrollTo(0, 0);
        }, 100);

        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(timer);
        };
    }, []); // 마운트 시에만 실행

    // 탭 변경시 스크롤을 최상단으로 설정
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [activeTab]); // 탭 변경 시에만 실행

    const [faqTab, setFaqTab] = useState<FaqTab>('all');
    const [historyTab, setHistoryTab] = useState<HistoryTab>('all');
    const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

    // Inquiry history state
    const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
    const [loadingInquiries, setLoadingInquiries] = useState(false);
    const [inquiryError, setInquiryError] = useState<string | null>(null);

    // FAQ Data
    const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
    const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedPanel(isExpanded ? panel : false);
    };

    // Load user's inquiries from database
    const loadInquiries = async () => {
        setLoadingInquiries(true);
        setInquiryError(null);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setInquiryError('로그인이 필요해요.');
                return;
            }

            const { data, error } = await supabase
                .from('inquiries')
                .select('inquiry_id, user_id, username, nickname, inquiry_type, subject, contents, created_at, status, manager_profile_id, answered_at, answer_content, attachments')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('문의 내역 조회 실패:', error);
                setInquiryError('문의 내역을 불러오는데 실패했어요.');
                return;
            }

            setInquiries(data ?? []);
        } catch (err) {
            console.error('문의 내역 조회 중 오류:', err);
            setInquiryError('문의 내역을 불러오는 중 오류가 발생했어요.');
        } finally {
            setLoadingInquiries(false);
        }
    };

    // Load inquiries when history tab is selected
    useEffect(() => {
        if (activeTab === 'history') {
            loadInquiries();
        }
    }, [activeTab]);

    // Reload inquiries when modal closes (in case a new inquiry was submitted)
    const handleInquiryModalClose = () => {
        setInquiryModalOpen(false);
        if (activeTab === 'history') {
            loadInquiries();
        }
    };

    // Filter inquiries based on search and status
    const filteredInquiries = useMemo(() => {
        return inquiries.filter((inquiry) => {
            // Search filter
            const matchesSearch = searchText
                ? [inquiry.subject, inquiry.contents, inquiry.inquiry_id]
                    .filter(Boolean)
                    .some((value) => value?.toLowerCase().includes(searchText.toLowerCase()))
                : true;

            // Status filter
            const matchesStatus = (() => {
                if (historyTab === 'all') return true;
                if (historyTab === 'pending') return inquiry.status === 'pending';
                if (historyTab === 'progress') return inquiry.status === 'in_progress';
                if (historyTab === 'done') return inquiry.status === 'resolved' || inquiry.status === 'closed';
                return true;
            })();

            return matchesSearch && matchesStatus;
        });
    }, [inquiries, searchText, historyTab]);

    // Count by status
    const statusCounts = useMemo(() => {
        return {
            all: inquiries.length,
            pending: inquiries.filter(i => i.status === 'pending').length,
            progress: inquiries.filter(i => i.status === 'in_progress').length,
            done: inquiries.filter(i => i.status === 'resolved' || i.status === 'closed').length,
        };
    }, [inquiries]);

    // Format date helper
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '');
    };

    // Get status display info
    const getStatusDisplay = (status: InquiryStatus) => {
        const colors: Record<InquiryStatus, { bg: string; color: string }> = {
            pending: { bg: theme.palette.grey[100], color: theme.palette.icon.default },
            in_progress: { bg: theme.palette.grey[100], color: theme.palette.icon.default },
            resolved: { bg: theme.palette.icon.default, color: theme.palette.primary.contrastText },
            closed: { bg: theme.palette.grey[200], color: theme.palette.text.secondary },
        };
        return {
            label: statusLabels[status],
            ...colors[status],
        };
    };

    const faqList: FaqItem[] = [
        // ============ 계정 (account) - 6개 ============
        {
            id: 'account-1',
            category: 'account',
            question: '프로필 정보를 어떻게 수정하나요?',
            answer: '하단 네비게이션의 "프로필" 탭을 선택한 후, 설정 메뉴에서 프로필 편집을 클릭하세요. 닉네임, 소개글, 활동 분야, 포트폴리오, 커버 이미지 등을 수정할 수 있습니다.'
        },
        {
            id: 'account-2',
            category: 'account',
            question: '프로필 유형(역할)을 변경할 수 있나요?',
            answer: '라잇에서는 브랜드, 아티스트, 크리에이티브, 팬 등 다양한 프로필 유형을 지원합니다. 프로필 전환은 프로필 탭 상단의 프로필 전환 버튼을 통해 가능하며, 새로운 역할로 추가 프로필을 생성할 수도 있습니다.'
        },
        {
            id: 'account-3',
            category: 'account',
            question: '차단한 계정은 어디서 관리하나요?',
            answer: '프로필 > 설정 > 차단 계정 관리에서 차단한 사용자 목록을 확인하고 차단을 해제할 수 있습니다. 차단된 사용자는 내 프로필과 프로젝트를 볼 수 없으며, 메시지도 보낼 수 없습니다.'
        },
        {
            id: 'account-4',
            category: 'account',
            question: '계정을 삭제하고 싶어요',
            answer: (
                <>
                    계정 삭제는 <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/settings/account-withdrawal')}>여기</span>에서 가능해요. <br />
                    삭제 시 모든 데이터가 영구적으로 삭제되며 복구가 불가능하니 꼭 유의해 주세요.
                </>
            )
        },
        {
            id: 'account-5',
            category: 'account',
            question: '알림 설정은 어디서 변경하나요?',
            answer: '프로필 > 설정 > 알림 설정에서 푸시 알림, 이메일 알림, 마케팅 수신 동의 등을 개별적으로 켜고 끌 수 있습니다. 프로젝트 지원, 메시지, 리뷰 등 알림 유형별로 세부 설정이 가능합니다.'
        },
        {
            id: 'account-6',
            category: 'account',
            question: '북마크와 아카이브 기능은 어떻게 사용하나요?',
            answer: '관심 있는 프로젝트나 파트너 카드에서 북마크 아이콘을 탭하면 저장됩니다. 저장된 항목은 프로필 > 북마크 관리에서 확인할 수 있으며, 아카이브에서는 과거 활동 내역을 볼 수 있습니다.'
        },

        // ============ 프로젝트 (project) - 6개 ============
        {
            id: 'project-1',
            category: 'project',
            question: '프로젝트는 어떻게 생성하나요?',
            answer: '탐색 탭 > 우측 하단 "+" 버튼을 탭하세요. 3단계(기본 정보 → 상세 설정 → 완료)를 거쳐 프로젝트를 생성합니다. 제목, 카테고리, 예산 범위, 모집 인원, 마감일, 필요 스킬 등을 입력해야 합니다.'
        },
        {
            id: 'project-2',
            category: 'project',
            question: '프로젝트 생성 시 주의사항이 있나요?',
            answer: '명확한 목표, 예산, 일정을 상세히 기재할수록 적합한 파트너 매칭 확률이 높아집니다. 허위 정보 기재 시 서비스 이용이 제한될 수 있으며, 커버 이미지와 태그를 잘 활용하면 노출이 증가합니다.'
        },
        {
            id: 'project-3',
            category: 'project',
            question: '프로젝트에 어떻게 지원하나요?',
            answer: '탐색에서 원하는 프로젝트 카드를 탭하고 상세 페이지에서 "지원하기" 버튼을 누르세요. 지원서에는 자기소개, 포트폴리오 링크, 가능 일정 등을 작성합니다. 지원 후 프로젝트 생성자가 수락하면 팀에 합류됩니다.'
        },
        {
            id: 'project-4',
            category: 'project',
            question: '지원을 취소하거나 수정할 수 있나요?',
            answer: '관리 탭 > 내 지원 현황에서 대기 중인 지원을 확인하고 취소할 수 있습니다. 단, 이미 수락된 지원은 취소가 어려우며, 프로젝트 생성자와 협의가 필요합니다.'
        },
        {
            id: 'project-5',
            category: 'project',
            question: '프로젝트에 팀원을 초대하는 방법은?',
            answer: '프로젝트 상세 > 팀 관리에서 "초대하기" 버튼을 탭하세요. 파트너 검색 후 초대 메시지와 함께 제안을 보낼 수 있습니다. 초대받은 사람이 수락하면 자동으로 팀에 합류됩니다.'
        },
        {
            id: 'project-6',
            category: 'project',
            question: '프로젝트 상태는 어떻게 변경하나요?',
            answer: '관리 > 내 프로젝트에서 해당 프로젝트를 선택하고 상태 변경 버튼을 누르세요. "모집중 → 진행중 → 완료" 순으로 전환 가능합니다. 완료 처리 시 팀원들에게 리뷰 작성 요청이 발송됩니다.'
        },

        // ============ 협업 (collaboration) - 5개 ============
        {
            id: 'collaboration-1',
            category: 'collaboration',
            question: '협업과 프로젝트의 차이점은 무엇인가요?',
            answer: '협업은 더 자유로운 형태의 공동 작업에 적합하며, 프로젝트와 달리 예산 없이도 진행할 수 있습니다.'
        },
        {
            id: 'collaboration-2',
            category: 'collaboration',
            question: '협업은 어떻게 생성하나요?',
            answer: '탐색 탭에서 "협업" 카테고리를 선택한 후 "+" 버튼을 탭하세요. 협업 목표, 필요 역할, 진행 기간 등을 입력하고 팀원 모집을 시작할 수 있습니다.'
        },
        {
            id: 'collaboration-3',
            category: 'collaboration',
            question: '협업에 지원하고 팀에 참여하는 방법은?',
            answer: '협업 상세 페이지에서 "참여 신청" 버튼을 누르고 본인 소개와 참여 동기를 작성하세요. 협업 리더가 신청을 승인하면 팀 채팅방에 자동으로 초대됩니다.'
        },
        {
            id: 'collaboration-4',
            category: 'collaboration',
            question: '협업 중 문제가 발생하면 어떻게 하나요?',
            answer: '먼저 팀 채팅방에서 당사자와 소통을 시도해 주세요. 해결이 어려운 경우 고객센터 > 신고하기를 통해 상황을 알려주시면 중재 절차를 안내해 드립니다. 심각한 위반 시 해당 사용자 제재 조치가 이루어집니다.'
        },
        {
            id: 'collaboration-5',
            category: 'collaboration',
            question: '협업 완료 후 리뷰는 어떻게 작성하나요?',
            answer: '협업 상태가 "완료"로 변경되면 참여한 팀원들에게 리뷰 작성 알림이 발송됩니다. 프로필 > 작성한 리뷰 또는 알림에서 리뷰를 작성할 수 있으며, 별점과 상세 후기를 남길 수 있습니다.'
        },

        // ============ 메시지 (message) - 5개 ============
        {
            id: 'message-1',
            category: 'message',
            question: '새 채팅방은 어떻게 만드나요?',
            answer: '프로젝트/협업 생성 시, 대화 요청 수락시 자동으로 채팅방이 생성됩니다.'
        },
        {
            id: 'message-2',
            category: 'message',
            question: '채팅에서 파일이나 이미지를 보내려면?',
            answer: '채팅 입력창 좌측의 "+" 또는 이미지 아이콘을 탭하세요. 갤러리에서 이미지를 선택하거나 파일을 첨부할 수 있습니다. 파일당 최대 10MB까지 전송 가능하며, 이미지는 미리보기로 표시됩니다.'
        },
        {
            id: 'message-3',
            category: 'message',
            question: '채팅방에서 나가거나 삭제하는 방법은?',
            answer: '채팅방 상단 설정(점 3개) > "채팅방 나가기"를 선택하세요. 나가면 해당 대화 내역을 더 이상 볼 수 없습니다. 내가 만든 채팅방은 삭제할 수 있으며, 삭제 시 모든 참여자의 채팅 기록이 삭제됩니다.'
        },
        {
            id: 'message-4',
            category: 'message',
            question: '특정 채팅방 알림만 끄고 싶어요',
            answer: '해당 채팅방 > 상단 설정 > "알림 끄기"를 선택하면 해당 채팅방의 푸시 알림만 비활성화됩니다. 메시지는 정상적으로 수신되며, 앱 내에서 확인할 수 있습니다.'
        },
        {
            id: 'message-5',
            category: 'message',
            question: '채팅방에 다른 사람을 초대하려면?',
            answer: '그룹 채팅방 > 설정 > "참여자 관리" > "초대하기"를 선택하세요. 검색으로 사용자를 찾아 초대할 수 있습니다. 초대는 채팅방 관리자(owner/admin)만 가능합니다.'
        },

        // ============ 기술 (tech) - 5개 ============
        {
            id: 'tech-1',
            category: 'tech',
            question: '파일 업로드가 안 될 때는?',
            answer: (
                <>
                    다음 사항을 확인해 주세요:<br />
                    • 파일 용량이 10MB를 초과하지 않는지<br />
                    • 지원 형식(JPG, PNG, PDF, DOC, ZIP 등)인지<br />
                    • 인터넷 연결 상태가 양호한지<br />
                    문제가 지속되면 앱을 재시작하거나 캐시를 삭제해 보세요.
                </>
            )
        },
        {
            id: 'tech-2',
            category: 'tech',
            question: '지원되는 파일 형식과 용량은?',
            answer: '이미지: JPG, PNG, GIF, WebP (각 10MB), 문서: PDF, DOC, DOCX, HWP (각 10MB), 압축파일: ZIP, RAR (각 10MB). 동영상은 현재 직접 업로드를 지원하지 않으며, 외부 링크(YouTube 등)를 첨부해 주세요.'
        },
        {
            id: 'tech-3',
            category: 'tech',
            question: '앱이 느리거나 멈출 때 해결 방법은?',
            answer: (
                <>
                    다음 방법을 순서대로 시도해 주세요:<br />
                    1. 앱 완전 종료 후 재시작<br />
                    2. 기기 재부팅<br />
                    3. 앱 캐시 삭제 (설정 {'>'} 앱 {'>'} 라잇 {'>'} 저장공간 {'>'} 캐시 삭제)<br />
                    4. 앱 최신 버전으로 업데이트<br />
                    계속 문제가 발생하면 고객센터로 문의해 주세요.
                </>
            )
        },
        {
            id: 'tech-4',
            category: 'tech',
            question: '푸시 알림이 오지 않아요',
            answer: (
                <>
                    다음을 확인해 주세요:<br />
                    • 기기 설정에서 라잇 앱 알림이 허용되어 있는지<br />
                    • 앱 내 설정 {'>'} 알림 설정이 활성화되어 있는지<br />
                    • 절전 모드나 방해금지 모드가 켜져 있지 않은지<br />
                    iOS의 경우 알림 권한을 다시 요청하려면 앱을 삭제 후 재설치해야 할 수 있습니다.
                </>
            )
        },
        {
            id: 'tech-5',
            category: 'tech',
            question: '로그인이 안 되거나 자동 로그아웃돼요',
            answer: (
                <>
                    • 소셜 로그인(Google, Apple, Kakao) 계정이 올바른지 확인하세요<br />
                    • 인터넷 연결 상태를 점검하세요<br />
                    • 앱을 최신 버전으로 업데이트하세요<br />
                    • 다른 기기에서 로그인한 경우 세션이 만료될 수 있습니다<br />
                    문제가 지속되면 support@bridge.com으로 문의해 주세요.
                </>
            )
        },
    ];


    const guideSteps = [
        {
            step: 1,
            title: 'Home',
            subTitle: '전체 흐름을 빠르게 훑어보세요',
            desc: '영감과 기회가 모여 있는 시작점이에요.',
            image: ManualImg1,
            // Placeholder for image
            color: '#3B82F6',
        },
        {
            step: 2,
            title: 'Create',
            subTitle: '간편한 프로젝트/협업 생성',
            desc: '필요한 정보만 넣으면 바로 프로젝트와 협업이 만들어져요.',
            image: ManualImg2,
            color: '#10B981',
        },
        {
            step: 3,
            title: 'Manage',
            subTitle: '프로젝트 관리가 더 쉬워졌어요',
            desc: '내가 참여 중인 프로젝트와 협업을 한곳에서 깔끔하게 관리할 수 있어요.',
            image: ManualImg3,
            color: '#8B5CF6',
        },
        {
            step: 4,
            title: 'Workspace',
            subTitle: '프로젝트와 협업의 전 과정을 한곳에서',
            desc: '그룹 채팅, 개인 메시지, 역할 관리, 파일 공유, 일정·마감까지 모든 커뮤니케이션을 한 화면에서 처리할 수 있어요.',
            image: ManualImg4,
            color: '#F59E0B',
        },
        {
            step: 5,
            title: 'Profile',
            subTitle: '나를 한눈에 보여주는 프로필',
            desc: '나의 활동과 강점을 가장 명확하게 보여주는 공간이에요.',
            image: ManualImg5,
            color: '#EAB308',
        },
        {
            step: 6,
            title: 'Lounge',
            subTitle: '지금의 흐름을 보는 라운지',
            desc: '읽고, 보고, 반응하고. 가볍게 머무를 수 있는 공간이에요.',
            image: ManualImg6,
            color: '#DB2777',
        },
    ];

    return (
        <Box
            ref={containerRef}
            sx={{
                pb: `${BOTTOM_NAV_HEIGHT}px`,
                minHeight: '100vh',
                bgcolor: '#ffffff',
                maxWidth: '768px',
                margin: '0 auto',
                position: 'relative',
                overflow: 'auto'
            }}>
            {/* Header */}
            <Box sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1100,
                // bgcolor: 'white',
                // borderBottom: '1px solid #F3F4F6',
                px: 2,
                height: '56px',
                pt: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'transparent',
                backdropFilter: 'blur(3px) saturate(180%)',
                WebkitBackdropFilter: 'blur(3px) saturate(180%)',
            }}>
                <IconButton edge="start" onClick={() => navigate(-1)} sx={{ color: '#111827' }}>
                    <ChevronLeftIcon />
                </IconButton>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    고객 지원
                </Typography>
            </Box>


            {/* Top Icons Grid */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 4, pt: 2, pb: 4, borderBottom: `1px solid ${theme.palette.grey[100]}` }}>
                {[
                    {
                        icon: <Box component="img" src={NotificationImg} alt="서비스 공지" sx={{ width: 40, height: 40 }} />,
                        label: '서비스 공지',
                        action: () => navigate('/settings/announcements')
                    },
                    {
                        icon: <Box component="img" src={ContactImg} alt="문의하기" sx={{ width: 40, height: 40 }} />,
                        label: '문의하기',
                        action: () => setInquiryModalOpen(true)
                    },
                    {
                        icon: <Box component="img" src={FeedbackImg} alt="피드백" sx={{ width: 40, height: 40 }} />,
                        label: '피드백',
                        action: () => setFeedbackModalOpen(true)
                    },
                    {
                        icon: <Box component="img" src={ReportImg} alt="신고하기" sx={{ width: 40, height: 40 }} />,
                        label: '신고하기',
                        color: theme.palette.status.Error,
                        action: () => setReportModalOpen(true)
                    },
                ].map((item, index) => (
                    <Box
                        key={index}
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.1, cursor: 'pointer' }}
                        onClick={item.action}
                    >
                        <Box sx={{
                            p: 0,
                        }}>
                            {item.icon}
                        </Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: item.color || '#374151' }}>
                            {item.label}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Tabs */}
            <Box sx={{ mt: 2, px: 2 }}>
                <TabBarFill<TabValue>
                    tabs={[
                        { key: 'faq', label: '자주 묻는 질문' },
                        { key: 'history', label: '문의내역 확인' },
                        { key: 'guide', label: '사용 가이드' },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </Box>

            {/* Tab Content */}
            <Box sx={{ minHeight: 400 }}>
                {activeTab === 'faq' && (
                    <Box sx={{ bgcolor: theme.palette.background.paper, minHeight: 'calc(100vh - 56px-101px-44px-44px)' }}>
                        {/* Filter Tabs */}
                        <Box sx={{ px: 2 }}>
                            <TabBarBottomline<FaqTab>
                                tabs={[
                                    {
                                        key: 'all',
                                        label: (
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <WindowOutlinedIcon sx={{ fontSize: 16 }} />
                                                전체
                                            </Box>
                                        ),
                                    },
                                    {
                                        key: 'account',
                                        label: (
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <AccountCircleOutlinedIcon sx={{ fontSize: 16 }} />
                                                계정
                                            </Box>
                                        ),
                                    },
                                    {
                                        key: 'project',
                                        label: (
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <FolderOutlinedIcon sx={{ fontSize: 16 }} />
                                                프로젝트
                                            </Box>
                                        ),
                                    },
                                    {
                                        key: 'collaboration',
                                        label: (
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <PeopleAltOutlinedIcon sx={{ fontSize: 16 }} />
                                                협업
                                            </Box>
                                        ),
                                    },
                                    {
                                        key: 'message',
                                        label: (
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <TextsmsOutlinedIcon sx={{ fontSize: 16 }} />
                                                메시지
                                            </Box>
                                        ),
                                    },
                                    {
                                        key: 'tech',
                                        label: (
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                                                기술
                                            </Box>
                                        ),
                                    },
                                ]}
                                activeTab={faqTab}
                                onTabChange={setFaqTab}
                            />
                        </Box>

                        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {faqList
                                .filter((faq) => faqTab === 'all' || faq.category === faqTab)
                                .map((faq) => (
                                    <Accordion
                                        key={faq.id}
                                        expanded={expandedPanel === faq.id}
                                        onChange={handleAccordionChange(faq.id)}
                                        elevation={0}
                                        sx={{
                                            borderRadius: '12px !important',
                                            '&:before': { display: 'none' },
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#9CA3AF' }} />}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
                                                {faq.question}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ bgcolor: '#F9FAFB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                                            <Typography sx={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>
                                                {faq.answer}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                        </Box>

                        {/* Terms and Policy Section */}
                        <Box sx={{ px: 2, mt: 4, mb: 6 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827', mb: 1.5 }}>
                                약관 및 정책
                            </Typography>
                            <Paper
                                elevation={0}
                                onClick={() => navigate('/settings/terms')}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: '#ffffff',
                                    border: `1px solid ${theme.palette.grey[200]}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'background-color 0.2s',
                                    '&:active': {
                                        bgcolor: theme.palette.grey[50],
                                    },
                                    mb: 1
                                }}
                            >
                                <Typography sx={{ fontSize: 15, fontWeight: 500, color: '#1F2937' }}>
                                    이용약관
                                </Typography>
                                <ChevronRightIcon sx={{ color: '#9CA3AF' }} />
                            </Paper>
                            <Paper
                                elevation={0}
                                onClick={() => navigate('/settings/refund-policy')}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: '#ffffff',
                                    border: `1px solid ${theme.palette.grey[200]}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'background-color 0.2s',
                                    '&:active': {
                                        bgcolor: theme.palette.grey[50],
                                    }
                                }}
                            >
                                <Typography sx={{ fontSize: 15, fontWeight: 500, color: '#1F2937' }}>
                                    환불 정책
                                </Typography>
                                <ChevronRightIcon sx={{ color: '#9CA3AF' }} />
                            </Paper>
                        </Box>
                        {/* footer */}
                        <Box sx={{ px: 2, mt: 4, mb: 6 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1, color: theme.palette.subText.default }}>주식회사 콜에이전시
                            </Typography>
                            <Box sx={{ mb: 0.5, display: 'flex', gap: 1 }}>
                                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>대표: 허승훈
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>사업자등록번호: 731-10-02682</Typography>
                            </Box>
                            <Box sx={{ mb: 0.5, }}>
                                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, wordBreak: 'keep-all' }}>주소: 경기도 남양주시 순화궁로 418, 현대그리너리캠퍼스별가람역 주건축물제1동 14층 제비14-0029호(별내동)</Typography>
                            </Box>
                            <Box sx={{ mb: 0.5, }}>
                                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>라잇 고객센터 0507-1433-7780</Typography>
                            </Box>
                            <Box sx={{ mb: 0.5, }}>
                                <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>주식회사 콜에이전시</Typography>
                            </Box>

                        </Box>
                    </Box>
                )}

                {activeTab === 'history' && (
                    <Box sx={{ bgcolor: '#ffffff' }}>
                        {/* Status Filter */}
                        <Box sx={{ px: 2 }}>
                            <TabBarBottomline<HistoryTab>
                                tabs={[
                                    { key: 'all', label: `전체 ${statusCounts.all}` },
                                    { key: 'pending', label: `답변대기 ${statusCounts.pending}` },
                                    { key: 'progress', label: `처리중 ${statusCounts.progress}` },
                                    { key: 'done', label: `답변완료 ${statusCounts.done}` },
                                ]}
                                activeTab={historyTab}
                                onTabChange={setHistoryTab}
                            />
                        </Box>

                        {/* Search */}
                        <Box sx={{ px: 2 }}>
                            <Paper elevation={0} sx={{
                                p: '2px 4px', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '24px',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                backdropFilter: 'blur(10px)', mb: 2
                            }}>
                                <InputBase
                                    sx={{ ml: 1, flex: 1, fontSize: 13 }}
                                    placeholder="제목, 문의번호로 검색"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                />
                                <IconButton type="button" sx={{ p: '10px' }}>
                                    <SearchIcon sx={{ fontSize: 19, color: theme.palette.icon.inner }} />
                                </IconButton>
                            </Paper>
                        </Box>

                        {/* Loading State */}
                        {loadingInquiries && (
                            <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 4 }} />
                                ))}
                            </Box>
                        )}

                        {/* Error State */}
                        {inquiryError && !loadingInquiries && (
                            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 14, color: theme.palette.error.main, mb: 2 }}>
                                    {inquiryError}
                                </Typography>
                                <Button variant="outlined" size="small" onClick={loadInquiries}>
                                    다시 시도
                                </Button>
                            </Box>
                        )}

                        {/* Empty State */}
                        {!loadingInquiries && !inquiryError && filteredInquiries.length === 0 && (
                            <Box sx={{ px: 2, py: 6, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 14, color: '#9CA3AF', mb: 1 }}>
                                    {searchText ? '검색 결과가 없어요.' : '문의 내역이 없어요.'}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>
                                    궁금한 점이 있으시면 문의해주세요.
                                </Typography>
                            </Box>
                        )}

                        {/* List */}
                        {!loadingInquiries && !inquiryError && filteredInquiries.length > 0 && (
                            <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {filteredInquiries.map((item) => {
                                    const statusDisplay = getStatusDisplay(item.status);
                                    return (
                                        <Paper key={item.inquiry_id} elevation={0} sx={{ p: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', borderRadius: 4 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
                                                    {inquiryTypeLabels[item.inquiry_type]}
                                                </Typography>
                                                <Chip
                                                    label={statusDisplay.label}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: 10,
                                                        bgcolor: statusDisplay.bg,
                                                        color: statusDisplay.color,
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                                                    문의번호 {item.inquiry_id.slice(0, 8)}
                                                </Typography>
                                                <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                                                    작성일 {formatDate(item.created_at)}
                                                </Typography>
                                                {item.answered_at && (
                                                    <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                                                        답변일 {formatDate(item.answered_at)}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography sx={{ fontSize: 13, color: '#4B5563', fontWeight: 500, mb: 1 }}>
                                                {item.subject}
                                            </Typography>

                                            {/* Show answer if available */}
                                            {item.answer_content && (item.status === 'resolved' || item.status === 'closed') && (
                                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: theme.palette.grey[50], borderRadius: 2 }}>
                                                    <Typography sx={{ fontSize: 11, color: theme.palette.primary.main, fontWeight: 600, mb: 0.5 }}>
                                                        답변
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12, color: '#4B5563', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                        {item.answer_content}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Show attachments if available */}
                                            {item.attachments && item.attachments.length > 0 && (
                                                <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    {item.attachments.map((url, idx) => (
                                                        <Box
                                                            key={idx}
                                                            component="img"
                                                            src={url}
                                                            alt={`첨부 ${idx + 1}`}
                                                            crossOrigin="anonymous"
                                                            sx={{
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: 1,
                                                                objectFit: 'cover',
                                                                border: `1px solid ${theme.palette.grey[200]}`,
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setPreviewImage(url)}
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        </Paper>
                                    );
                                })}
                            </Box>
                        )}

                        {/* Contact Info */}
                        <Box sx={{ p: 3, boxShadow: '0 1px 1px rgba(0,0,0,0.1)', borderRadius: 4, mx: 2, my: 3 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>기타 연락처</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <EmailOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
                                <Box>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>이메일</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#6B7280' }}>contact@colagency.com</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <PhoneOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
                                <Box>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>전화</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#6B7280' }}>0507-1433-7780 (평일 9:00-18:00)</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <TextsmsOutlinedIcon sx={{ color: theme.palette.icon.default, fontSize: 20 }} />
                                <Box>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>채널톡</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#6B7280' }}>라잇</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )}

                {activeTab === 'guide' && (
                    <Box sx={{ bgcolor: '#ffffff', p: 3 }}>
                        <Box sx={{ mb: 4 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1F2937', mb: 1 }}>라잇 시작하기</Typography>
                            <Typography sx={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                                라잇 플랫폼을 처음 사용하시나요? <br />단계별 가이드를 따라해보세요.
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {guideSteps.map((step) => (
                                <Box key={step.step}>
                                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                                        <Box sx={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            bgcolor: theme.palette.primary.main, color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14, fontWeight: 700, flexShrink: 0
                                        }}>
                                            {step.step}
                                        </Box>
                                        <Box>
                                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.palette.text.primary, mb: 0.5, wordBreak: 'keep-all' }}>
                                                {step.title}
                                            </Typography>
                                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.palette.subText.default, wordBreak: 'keep-all' }}>
                                                {step.subTitle}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, fontWeight: 500, color: theme.palette.text.secondary, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                                                {step.desc}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {/* Step Image */}
                                    <Box
                                        component="img"
                                        src={step.image}
                                        alt={step.title}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: 3,
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            display: 'block',
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>

                        {/* Contact CTA */}
                        <Box sx={{ mt: 6, p: 2.5, bgcolor: theme.palette.grey[50], borderRadius: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <HeadsetMicOutlinedIcon sx={{ fontSize: 16, color: theme.palette.icon.default }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: theme.palette.text.primary }}>
                                    도움이 더 필요하신가요?
                                </Typography>
                            </Box>
                            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mb: 2, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                                더 자세한 사용법이나 개별 상담이 필요하시면 언제든 문의해주세요.
                            </Typography>
                            <Button
                                variant="contained"
                                disableElevation
                                onClick={() => setInquiryModalOpen(true)}
                                sx={{
                                    bgcolor: '#2563EB',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    py: 0.8,
                                    width: '40%',
                                }}
                            >
                                문의하기
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>


            <BottomNavigationBar />

            <InquiryModal
                open={inquiryModalOpen}
                onClose={handleInquiryModalClose}
            />

            {/* 이미지 미리보기 Dialog */}
            <Dialog
                open={!!previewImage}
                onClose={() => setPreviewImage(null)}
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        overflow: 'visible',
                    }
                }}
            >
                {previewImage && (
                    <Box
                        component="img"
                        src={previewImage}
                        alt="첨부 이미지"
                        crossOrigin="anonymous"
                        onClick={() => setPreviewImage(null)}
                        sx={{
                            maxWidth: '90vw',
                            maxHeight: '80vh',
                            objectFit: 'contain',
                            borderRadius: 2,
                            cursor: 'pointer',
                        }}
                    />
                )}
            </Dialog>

            {/* Report Modal */}
            <ReportModal
                open={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
            />

            {/* Feedback Modal */}
            <FeedbackModal
                open={feedbackModalOpen}
                onClose={() => setFeedbackModalOpen(false)}
            />
        </Box >
    );
}
