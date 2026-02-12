/**
 * Brand Creator Types
 * 브랜드 온보딩 시 활동 분야별 크리에이터 타입 상수 정의
 * 
 * brand_creator.md 데이터를 기반으로 생성
 * projectConstants.ts의 CATEGORY_VALUES와 통일된 매핑 사용
 */

// brand_creator.md의 id → projectConstants 값 매핑
const BRAND_CREATOR_ID_TO_PROJECT_CATEGORY: Record<string, string> = {
  music: 'music',
  fashion: 'fashion',
  beauty: 'beauty',
  content: 'contents', // brand_creator.md는 "content", projectConstants는 "contents"
  lifestyle: 'life', // brand_creator.md는 "lifestyle", projectConstants는 "life"
  market: 'market',
  culture: 'ticket', // brand_creator.md는 "culture", projectConstants는 "ticket"
  digital: 'tech', // brand_creator.md는 "digital", projectConstants는 "tech"
  healing: 'healing',
  event: 'event',
  liveCommerce: 'liveShopping', // brand_creator.md는 "liveCommerce", projectConstants는 "liveShopping"
  finance: 'Investment', // brand_creator.md는 "finance", projectConstants는 "Investment"
};

// projectConstants 값 → 한글 activityField 역매핑
const PROJECT_CATEGORY_TO_KOREAN: Record<string, string> = {
  music: '음악',
  fashion: '패션',
  beauty: '뷰티',
  contents: '콘텐츠',
  life: '라이프',
  market: '마켓',
  ticket: '문화',
  tech: '디지털',
  healing: '힐링',
  event: '이벤트',
  liveShopping: '라이브쇼핑',
  Investment: '재테크',
};

// 원본 데이터 (brand_creator.md 기반)
const CREATOR_TYPES_BY_ID: Record<string, string[]> = {
  music: [
    '아티스트·퍼포머',
    '작곡·편곡·프로듀싱',
    '보컬·세션 연주',
    '녹음·믹싱·마스터링',
    '사운드디자인·효과음',
    'OST·BGM 제작',
    '라이브·공연 기획/운영',
    '음악 촬영·라이브 영상',
    '뮤직마케팅·유통',
    '음악 IP·콜라보 디렉팅',
  ],
  fashion: [
    '패션 브랜드 디렉팅',
    '스타일링·코디네이션',
    '디자인·패턴·샘플링',
    '의상 제작·생산 관리',
    '룩북·제품 촬영(포토/영상)',
    '모델·피팅모델 캐스팅',
    '패션 MD·머천다이징',
    '비주얼·아트디렉션',
    '패션 일러스트·그래픽',
    '브랜드 협업·캠페인 운영',
  ],
  beauty: [
    '메이크업 아티스트',
    '헤어·스타일링',
    '네일·뷰티 디테일',
    '스킨케어·피부관리 전문가',
    '화보·촬영 뷰티팀',
    '퍼스널컬러·이미지 컨설팅',
    '살롱·샵 협업 운영',
    '뷰티 콘텐츠 제작(포토/영상)',
    '제품 기획·브랜드 PM',
    '인플루언서·앰버서더 운영',
  ],
  content: [
    '브랜드 콘텐츠 기획·전략',
    '촬영(사진/영상) 프로덕션',
    '영상 편집·후반작업',
    '모션그래픽·애니메이션',
    '그래픽·편집디자인',
    '카피라이팅·스크립트',
    '숏폼 콘텐츠 제작',
    '유튜브·채널 운영',
    'SNS 운영·커뮤니티 매니징',
    '성과 리포팅·데이터 분석',
  ],
  lifestyle: [
    '라이프스타일 콘텐츠 크리에이터',
    '인테리어·공간 스타일링',
    '리빙·홈데코 제품 기획',
    '클래스·워크숍 기획/운영',
    '공예·핸드메이드 메이커',
    '반려동물 콘텐츠·브랜딩',
    '체험형 콘텐츠(리뷰/체험단) 운영',
    '로컬·커뮤니티 협업 기획',
    '브랜드 굿즈·패키징',
    '라이프스타일 캠페인 디렉팅',
  ],
  market: [
    '공동구매·라이브 판매 운영',
    '상품 기획·MD',
    '브랜드 커머스 운영(스마트스토어 등)',
    '셀러·인플루언서 세일즈 파트너',
    '제조·소싱·생산 관리',
    '패키징·물류·배송 운영',
    '상세페이지·커머스 디자인',
    '가격·프로모션 전략',
    'CRM·리뷰·재구매 운영',
    '커머스 데이터 분석·ROAS 최적화',
  ],
  culture: [
    '전시·공연 기획/프로듀싱',
    '아티스트·작가 섭외/매니지먼트',
    '큐레이션·프로그램 디렉팅',
    '공간 디자인·현장 연출',
    '포스터·키비주얼 디자인',
    '티켓·관객 운영/CS',
    '스폰서십·브랜드 협업',
    '문화 홍보·PR',
    '행사 촬영·아카이빙',
    'IP·굿즈·2차 사업화',
  ],
  digital: [
    '브랜드 웹사이트·랜딩 구축',
    '앱·서비스 개발(프론트/백)',
    'UI/UX 설계·리서치',
    '프로덕트 디자인·디자인 시스템',
    '데이터·분석·그로스',
    'AI·자동화·챗봇',
    '3D·인터랙티브·웹GL',
    'AR/VR·실감형 콘텐츠',
    '디지털 캠페인·퍼포먼스 마케팅',
    'QA·운영·유지보수',
  ],
  healing: [
    '웰니스 콘텐츠 제작',
    '요가·명상 클래스 운영',
    '테라피·케어 프로그램',
    '리트릿·여행 상품 기획',
    '캠핑·아웃도어 프로그램',
    '웰니스 브랜드 콜라보',
    '힐링 공간·팝업 기획',
    '체험단·리뷰 운영',
    '웰니스 커뮤니티 운영',
    '웰니스 캠페인 디렉팅',
  ],
  event: [
    '행사·이벤트 기획',
    '팝업스토어 기획/운영',
    '브랜드 런칭·쇼케이스',
    '공간 연출·VMD·세트',
    '현장 운영·스태핑',
    '행사 콘텐츠 제작(포토/영상)',
    '프로모션·체험 프로그램',
    '티켓·초청·게스트 매니징',
    '스폰서십·파트너십',
    'PR·미디어 대응',
  ],
  liveCommerce: [
    '라이브커머스 기획·연출',
    '쇼호스트·MC 섭외/매칭',
    '라이브 방송 운영(모니터링/CS)',
    '상품 구성·MD·가격 전략',
    '스크립트·세일즈 카피',
    '방송 촬영·송출·기술',
    '콘텐츠 제작(티저/클립/후기)',
    '인플루언서·게스트 협업',
    '성과 분석·전환 최적화',
    '채널 운영·정기 편성',
  ],
  finance: [
    '재테크 콘텐츠 제작(칼럼/영상)',
    '금융 교육·강의 기획',
    '데이터 리서치·시장 분석',
    '브랜드 제휴·캠페인 운영',
    '투자·경제 커뮤니티 운영',
    '세금·절세 콘텐츠/기획',
    '자산관리·재무 설계',
    '금융상품 리뷰·비교',
    '핀테크 서비스 기획·운영',
    '컴플라이언스·광고 심의 대응',
  ],
};

// 한글 activityField → 크리에이터 타입 배열 매핑 생성
function buildKoreanToCreatorTypesMapping(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  // brand_creator.md의 각 id에 대해
  for (const [brandCreatorId, creatorTypes] of Object.entries(CREATOR_TYPES_BY_ID)) {
    // projectConstants 값으로 변환
    const projectCategory = BRAND_CREATOR_ID_TO_PROJECT_CATEGORY[brandCreatorId];
    if (!projectCategory) {
      console.warn(`[brandCreatorTypes] Unknown brand creator id: ${brandCreatorId}`);
      continue;
    }
    
    // 한글 activityField로 변환
    const koreanField = PROJECT_CATEGORY_TO_KOREAN[projectCategory];
    if (!koreanField) {
      console.warn(`[brandCreatorTypes] Unknown project category: ${projectCategory}`);
      continue;
    }
    
    // 매핑 저장
    result[koreanField] = creatorTypes;
  }
  
  return result;
}

/**
 * 한글 activityField를 키로 하는 크리에이터 타입 매핑
 */
export const BRAND_CREATOR_TYPES: Record<string, string[]> = buildKoreanToCreatorTypesMapping();

/**
 * 주어진 활동 분야(한글)에 해당하는 크리에이터 타입 목록을 반환
 * 
 * @param activityField - 한글 활동 분야명 (예: '음악', '패션', '뷰티' 등)
 * @returns 해당 분야의 크리에이터 타입 배열 (10개), 없으면 빈 배열
 */
export function getCreatorTypesByActivityField(activityField: string | null | undefined): string[] {
  if (!activityField) {
    return [];
  }
  
  return BRAND_CREATOR_TYPES[activityField] || [];
}

