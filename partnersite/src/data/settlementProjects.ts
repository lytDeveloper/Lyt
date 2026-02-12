export type SettlementProjectMember = {
  id: string;
  name: string;
  role: string;
  color: string;
  isOnline: boolean;
  initialContribution: number;
};

export type SettlementProject = {
  id: string;
  title: string;
  client: string;
  date: string;
  membersCount: number;
  updatedAt: string;
  progress: number;
  thumbnailLabel: string;
  totalAmount: number;
  platformFeeRate: number;
  members: SettlementProjectMember[];
};

export const settlementProjects: SettlementProject[] = [
  {
    id: 'project-ux',
    title: '모바일 앱 UI/UX 디자인',
    client: '테크스타트업',
    date: '2024년 2월 15일',
    membersCount: 3,
    updatedAt: '2시간 전',
    progress: 100,
    thumbnailLabel: 'UX',
    totalAmount: 50000000,
    platformFeeRate: 0,
    members: [
      { id: 'member-kjy', name: '김민수', role: '디지털', color: '#3B82F6', isOnline: true, initialContribution: 20 },
      { id: 'member-ljh', name: '이지은', role: '디지털', color: '#F59E0B', isOnline: true, initialContribution: 30 },
      { id: 'member-pjh', name: '박준호', role: '디지털', color: '#1D4ED8', isOnline: true, initialContribution: 20 },
    ],
  },
  {
    id: 'project-web',
    title: '웹사이트 리뉴얼 프로젝트',
    client: '이커머스 회사',
    date: '2024년 3월 1일',
    membersCount: 2,
    updatedAt: '1일 전',
    progress: 100,
    thumbnailLabel: 'WEB',
    totalAmount: 23000000,
    platformFeeRate: 5,
    members: [
      { id: 'member-cjh', name: '최준호', role: '디지털', color: '#10B981', isOnline: true, initialContribution: 45 },
      { id: 'member-hsy', name: '한소영', role: '디지털', color: '#A855F7', isOnline: false, initialContribution: 55 },
    ],
  },
  {
    id: 'project-festival',
    title: '인디 음악 페스티벌 기획',
    client: '인디뮤지션',
    date: '2024년 3월 1일',
    membersCount: 3,
    updatedAt: '2시간 전',
    progress: 100,
    thumbnailLabel: 'INDIE',
    totalAmount: 32000000,
    platformFeeRate: 5,
    members: [
      { id: 'member-csy', name: '최세영', role: '뷰티', color: '#EF4444', isOnline: true, initialContribution: 40 },
      { id: 'member-pms', name: '박민수', role: '음악', color: '#06B6D4', isOnline: true, initialContribution: 35 },
      { id: 'member-lsr', name: '이사랑', role: '디지털', color: '#8B5CF6', isOnline: false, initialContribution: 25 },
    ],
  },
];

export const getSettlementProjectById = (projectId: string) =>
  settlementProjects.find((project) => project.id === projectId);
