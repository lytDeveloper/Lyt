/**
 * User Type Options for Fan Onboarding (Step3_Persona)
 * 12 categories × 10 options = 120 total options
 */

export interface UserTypeOption {
  id: string;
  label: string;
  description: string;
  category: string;
}

/**
 * Category mapping from Korean to English
 * Based on projectConstants.ts EXTENDED_CATEGORIES
 */
export const CATEGORY_MAPPING: Record<string, string> = {
  '음악': 'music',
  '패션': 'fashion',
  '뷰티': 'beauty',
  '콘텐츠': 'contents',
  '라이프': 'life',
  '문화': 'ticket',
  '디지털': 'tech',
  '힐링': 'healing',
  '이벤트': 'event',
  '라이브쇼핑': 'liveShopping',
  '재테크': 'Investment',
  '마켓': 'market',
};

export const USER_TYPE_OPTIONS: UserTypeOption[] = [
  // ===== 음악 (music) - 10개 =====
  {
    id: '신곡선도청취자',
    label: '신곡을 먼저 듣는 리스너',
    description: '새로운 음악을 가장 먼저 발견해요.',
    category: 'music',
  },
  {
    id: '장르탐험가',
    label: '장르를 넘나드는 탐험가',
    description: '다양한 장르의 음악을 즐겨요.',
    category: 'music',
  },
  {
    id: '인디서포터',
    label: '인디 아티스트 후원자',
    description: '숨은 아티스트를 응원해요.',
    category: 'music',
  },
  {
    id: '플리수집가',
    label: '플레이리스트 큐레이터',
    description: '상황별 음악을 모으는 걸 좋아해요.',
    category: 'music',
  },
  {
    id: '라이브팬',
    label: '무대를 사랑하는 관객',
    description: '공연과 라이브 현장을 즐겨요.',
    category: 'music',
  },
  {
    id: 'ost애호가',
    label: 'OST 감상가',
    description: '영상 속 음악에 빠져들어요.',
    category: 'music',
  },
  {
    id: '사운드중시형',
    label: '사운드를 따지는 리스너',
    description: '음질과 사운드를 중요하게 봐요.',
    category: 'music',
  },
  {
    id: '차트체커',
    label: '차트를 읽는 리스너',
    description: '요즘 뜨는 음악을 놓치지 않아요.',
    category: 'music',
  },
  {
    id: '감정청취자',
    label: '감정으로 듣는 리스너',
    description: '기분에 따라 음악을 선택해요.',
    category: 'music',
  },
  {
    id: '스토리팬',
    label: '가사를 곱씹는 청취자',
    description: '메시지와 스토리를 중요하게 들어요.',
    category: 'music',
  },

  // ===== 패션 (fashion) - 10개 =====
  {
    id: '트렌드관찰자',
    label: '트렌드를 읽는 관찰자',
    description: '유행의 흐름을 빠르게 캐치해요.',
    category: 'fashion',
  },
  {
    id: '스타일수집가',
    label: '스타일 레퍼런스 수집가',
    description: '다양한 스타일을 참고해요.',
    category: 'fashion',
  },
  {
    id: '브랜드팬',
    label: '브랜드 취향 소유자',
    description: '선호 브랜드가 명확해요.',
    category: 'fashion',
  },
  {
    id: '룩북애호가',
    label: '룩북 감상가',
    description: '화보와 룩북을 즐겨봐요.',
    category: 'fashion',
  },
  {
    id: '핏중시형',
    label: '핏을 가장 중요하게 보는 타입',
    description: '착용감을 우선으로 선택해요.',
    category: 'fashion',
  },
  {
    id: '미니멀지향',
    label: '미니멀 스타일 지향자',
    description: '깔끔한 스타일을 선호해요.',
    category: 'fashion',
  },
  {
    id: '포인트러버',
    label: '개성 포인트 스타일러',
    description: '확실한 포인트를 좋아해요.',
    category: 'fashion',
  },
  {
    id: '스트릿팬',
    label: '스트릿 감성 추구자',
    description: '자유로운 패션을 즐겨요.',
    category: 'fashion',
  },
  {
    id: '가치소비자',
    label: '가치를 보는 소비자',
    description: '지속가능성을 고려해요.',
    category: 'fashion',
  },
  {
    id: '코디참고형',
    label: '코디 참고형 유저',
    description: '스타일 참고용으로 살펴봐요.',
    category: 'fashion',
  },

  // ===== 뷰티 (beauty) - 10개 =====
  {
    id: '신상체험러',
    label: '신상을 먼저 써보는 체험러',
    description: '새로운 제품을 시도해요.',
    category: 'beauty',
  },
  {
    id: '루틴관리형',
    label: '꾸준한 루틴 관리자',
    description: '일상적인 관리가 중요해요.',
    category: 'beauty',
  },
  {
    id: '피부중심형',
    label: '피부 중심 케어러',
    description: '기초 관리에 집중해요.',
    category: 'beauty',
  },
  {
    id: '메이크업러버',
    label: '메이크업 애호가',
    description: '다양한 메이크업을 즐겨요.',
    category: 'beauty',
  },
  {
    id: '정보중시형',
    label: '성분과 리뷰를 보는 타입',
    description: '정보를 꼼꼼히 확인해요.',
    category: 'beauty',
  },
  {
    id: '트렌드팔로워',
    label: '뷰티 트렌드 팔로워',
    description: '유행을 빠르게 따라가요.',
    category: 'beauty',
  },
  {
    id: '크리에이터팔로워',
    label: '뷰티 크리에이터 팔로워',
    description: '크리에이터 콘텐츠를 참고해요.',
    category: 'beauty',
  },
  {
    id: '내추럴지향',
    label: '자연스러움을 추구하는 타입',
    description: '과하지 않은 스타일을 좋아해요.',
    category: 'beauty',
  },
  {
    id: '전문관리관심',
    label: '전문 관리 관심형',
    description: '시술·전문 케어에 관심 있어요.',
    category: 'beauty',
  },
  {
    id: '셀프케어러',
    label: '혼자 관리하는 셀프케어러',
    description: '셀프 관리 시간을 즐겨요.',
    category: 'beauty',
  },

  // ===== 콘텐츠 (contents) - 10개 =====
  {
    id: '숏폼소비자',
    label: '숏폼 콘텐츠 소비자',
    description: '짧고 빠른 콘텐츠를 선호해요.',
    category: 'contents',
  },
  {
    id: '비주얼중시형',
    label: '비주얼 중심 감상자',
    description: '이미지와 영상이 중요해요.',
    category: 'contents',
  },
  {
    id: '스토리애호가',
    label: '이야기를 즐기는 감상자',
    description: '내용과 흐름을 중요하게 봐요.',
    category: 'contents',
  },
  {
    id: '창작자서포터',
    label: '창작자를 응원하는 유저',
    description: '크리에이터를 지지해요.',
    category: 'contents',
  },
  {
    id: '콘텐츠흐름인지형',
    label: '앞서가는 콘텐츠 감상자',
    description: '요즘 인기 콘텐츠를 살펴봐요.',
    category: 'contents',
  },
  {
    id: '아이디어참고형',
    label: '아이디어 참고형 소비자',
    description: '기획 참고용으로 활용해요.',
    category: 'contents',
  },
  {
    id: '브랜드콘텐츠관심',
    label: '브랜드 콘텐츠 관심자',
    description: '브랜드 스토리를 즐겨요.',
    category: 'contents',
  },
  {
    id: '플랫폼탐험가',
    label: '플랫폼 탐험 유저',
    description: '다양한 채널을 이용해요.',
    category: 'contents',
  },
  {
    id: '오디오콘텐츠팬',
    label: '오디오 콘텐츠 팬',
    description: '팟캐스트·음성 콘텐츠를 들어요.',
    category: 'contents',
  },
  {
    id: '추천의존형',
    label: '추천을 신뢰하는 타입',
    description: '추천된 흐름 속에서 새로운 콘텐츠를 만나요.',
    category: 'contents',
  },

  // ===== 라이프 (life) - 10개 =====
  {
    id: '공간가꾸는타입',
    label: '공간을 가꾸는 라이프러',
    description: '일상 공간을 꾸미는 데 관심 있어요.',
    category: 'life',
  },
  {
    id: '취미생활가',
    label: '취미를 즐기는 생활러',
    description: '소소한 취미를 중요하게 여겨요.',
    category: 'life',
  },
  {
    id: '홈라이프지향',
    label: '집 중심 라이프 지향자',
    description: '집에서의 시간을 소중히 해요.',
    category: 'life',
  },
  {
    id: '반려동반생활형',
    label: '반려와 동반하는 라이프스타일',
    description: '반려동물과의 일상을 중요하게 여겨요.',
    category: 'life',
  },
  {
    id: '자기관리형',
    label: '자기관리 루틴러',
    description: '생활 습관을 관리해요.',
    category: 'life',
  },
  {
    id: '소확행추구',
    label: '소확행 추구자',
    description: '작은 행복을 중요하게 여겨요.',
    category: 'life',
  },
  {
    id: '감성소비자',
    label: '감성 소비자',
    description: '감성적인 요소를 보고 선택해요.',
    category: 'life',
  },
  {
    id: '클래스체험러',
    label: '클래스 체험러',
    description: '원데이 클래스에 관심 있어요.',
    category: 'life',
  },
  {
    id: '일상업그레이드형',
    label: '일상을 업그레이드하는 타입',
    description: '작은 변화로 삶의 질을 높여요.',
    category: 'life',
  },
  {
    id: '루틴기록러',
    label: '일상을 기록하는 타입',
    description: '일상을 기록하며 관리해요.',
    category: 'life',
  },

  // ===== 문화 (ticket) - 10개 =====
  {
    id: '전시관람러',
    label: '전시 관람 애호가',
    description: '전시와 아트를 즐겨요.',
    category: 'ticket',
  },
  {
    id: '공연관객',
    label: '공연을 즐기는 관객',
    description: '무대 예술을 좋아해요.',
    category: 'ticket',
  },
  {
    id: '문화탐험가',
    label: '문화 경험 탐험가',
    description: '새로운 문화 경험을 찾아요.',
    category: 'ticket',
  },
  {
    id: '작가집중형',
    label: '한 작가의 세계를 따라가는 관람자',
    description: '특정 작가의 작업을 꾸준히 살펴봐요.',
    category: 'ticket',
  },
  {
    id: '예술감상러',
    label: '예술 감상형 유저',
    description: '작품 자체에 집중해요.',
    category: 'ticket',
  },
  {
    id: '페스티벌러버',
    label: '페스티벌 러버',
    description: '현장 분위기를 즐겨요.',
    category: 'ticket',
  },
  {
    id: '안내따르는관람자',
    label: '안내를 따라 관람하는 타입',
    description: '선별된 추천을 따라 작품을 만나요.',
    category: 'ticket',
  },
  {
    id: '문화기록가',
    label: '문화 기록가',
    description: '관람 후 기록을 남겨요.',
    category: 'ticket',
  },
  {
    id: '아트굿즈관심',
    label: '아트 굿즈 관심러',
    description: '전시 관련 굿즈를 좋아해요.',
    category: 'ticket',
  },
  {
    id: '문화영감수집',
    label: '영감 수집가',
    description: '문화에서 영감을 받아요.',
    category: 'ticket',
  },

  // ===== 디지털 (tech) - 10개 =====
  {
    id: '기술관심러',
    label: '기술 트렌드 관심자',
    description: '신기술 소식에 관심 있어요.',
    category: 'tech',
  },
  {
    id: '기술정보소비형',
    label: '기술 정보를 꾸준히 살피는 타입',
    description: '트렌드보다 맥락과 흐름을 중요하게 봐요.',
    category: 'tech',
  },
  {
    id: 'uiux관찰자',
    label: 'UI/UX 관찰자',
    description: '디자인 흐름을 살펴봐요.',
    category: 'tech',
  },
  {
    id: '효율중심형',
    label: '효율을 기준으로 도구를 고르는 타입',
    description: '시간과 생산성을 최우선으로 생각해요.',
    category: 'tech',
  },
  {
    id: '디지털창작관심',
    label: '디지털 창작 관심러',
    description: '디지털 창작물에 관심 있어요.',
    category: 'tech',
  },
  {
    id: 'ai활용',
    label: 'AI활용 지향형',
    description: 'AI를 실제 작업에 적용하려 해요.',
    category: 'tech',
  },
  {
    id: '문제해결형',
    label: '문제를 직접 해결하는 사용자',
    description: '에러나 불편을 스스로 해결하려 해요.',
    category: 'tech',
  },
  {
    id: '분석선호형',
    label: '분석을 선호하는 사용자',
    description: '데이터와 비교를 중요하게 봐요.',
    category: 'tech',
  },
  {
    id: '디지털취향러',
    label: '디지털 취향형 유저',
    description: '디지털 감성을 중요하게 봐요.',
    category: 'tech',
  },
  {
    id: '프로토타입관심',
    label: '프로토타입 관심자',
    description: '초기 서비스에 흥미 있어요.',
    category: 'tech',
  },

  // ===== 힐링 (healing) - 10개 =====
  {
    id: '휴식중시형',
    label: '휴식을 우선하는 타입',
    description: '쉼의 시간을 중요하게 여겨요.',
    category: 'healing',
  },
  {
    id: '마음관리러',
    label: '마음 관리 실천가',
    description: '정신적 안정에 관심 있어요.',
    category: 'healing',
  },
  {
    id: '자연힐링파',
    label: '자연 힐링 선호자',
    description: '자연 속에서 회복해요.',
    category: 'healing',
  },
  {
    id: '웰니스관심',
    label: '웰니스 관심러',
    description: '건강한 삶을 추구해요.',
    category: 'healing',
  },
  {
    id: '명상입문자',
    label: '명상 입문자',
    description: '명상과 호흡에 관심 있어요.',
    category: 'healing',
  },
  {
    id: '요가·스트레칭실천형',
    label: '요가·스트레칭 러버',
    description: '몸과 마음을 함께 관리해요.',
    category: 'healing',
  },
  {
    id: '감정회복형',
    label: '감정 회복형 유저',
    description: '정서적 안정이 필요해요.',
    category: 'healing',
  },
  {
    id: '슬로우라이프',
    label: '슬로우 라이프 지향자',
    description: '느린 삶을 선호해요.',
    category: 'healing',
  },
  {
    id: '힐링체험러',
    label: '힐링 체험러',
    description: '힐링 프로그램을 경험해요.',
    category: 'healing',
  },
  {
    id: '리셋추구형',
    label: '리셋을 원하는 타입',
    description: '재충전의 계기를 찾아요.',
    category: 'healing',
  },

  // ===== 이벤트 (event) - 10개 =====
  {
    id: '행사참여러',
    label: '행사 참여형 유저',
    description: '오프라인 행사를 즐겨요.',
    category: 'event',
  },
  {
    id: '팝업공간선호형',
    label: '팝업스토어 탐방러',
    description: '팝업 공간을 좋아해요.',
    category: 'event',
  },
  {
    id: '정보탐색형',
    label: '정보를 얻기 위해 참여하는 타입',
    description: '새 소식과 인사이트를 얻으려 행사에 가요.',
    category: 'event',
  },
  {
    id: '몰입관람형',
    label: '행사 흐름에 몰입하는 관람자',
    description: '방해 없이 전체 흐름을 즐겨요.',
    category: 'event',
  },
  {
    id: '관계형참여자',
    label: '사람을 만나기 위해 참여하는 타입',
    description: '네트워킹과 교류를 목적으로 행사에 참여해요.',
    category: 'event',
  },
  {
    id: '분위기중시형',
    label: '분위기 중시 관객',
    description: '공간과 분위기를 중요하게 봐요.',
    category: 'event',
  },
  {
    id: '기록활용형',
    label: '기록을 남기기 위해 참여하는 타입',
    description: '행사를 콘텐츠나 기록으로 활용해요.',
    category: 'event',
  },
  {
    id: '신규이벤트탐색',
    label: '신규 이벤트 탐색가',
    description: '새로운 행사를 찾아요.',
    category: 'event',
  },
  {
    id: '짧은체류형',
    label: '핵심만 보고 나오는 참여자',
    description: '관심 있는 부분만 빠르게 경험해요.',
    category: 'event',
  },
  {
    id: '동반참여형',
    label: '누군가와 함께 참여하는 타입',
    description: '혼자보다 함께하는 경험을 선호해요.',
    category: 'event',
  },

  // ===== 라이브쇼핑 (liveShopping) - 10개 =====
  {
    id: '라이브시청러',
    label: '라이브 시청형 유저',
    description: '실시간 방송을 즐겨봐요.',
    category: 'liveShopping',
  },
  {
    id: '구매결정빠름',
    label: '즉시 구매형',
    description: '보고 바로 결정해요.',
    category: 'liveShopping',
  },
  {
    id: '혜택중시형',
    label: '혜택 중시 소비자',
    description: '할인과 특전을 봐요.',
    category: 'liveShopping',
  },
  {
    id: '호스트신뢰형',
    label: '진행자 신뢰형',
    description: '쇼호스트를 믿고 구매해요.',
    category: 'liveShopping',
  },
  {
    id: '소통참여형',
    label: '채팅 참여형 시청자',
    description: '실시간 소통을 즐겨요.',
    category: 'liveShopping',
  },
  {
    id: '상품비교형',
    label: '상품 비교형',
    description: '여러 상품을 비교해요.',
    category: 'liveShopping',
  },
  {
    id: '후기중시형',
    label: '후기 중시 구매자',
    description: '리뷰를 꼭 확인해요.',
    category: 'liveShopping',
  },
  {
    id: '브랜드중심형',
    label: '브랜드 중심 소비자',
    description: '브랜드를 보고 선택해요.',
    category: 'liveShopping',
  },
  {
    id: '타이밍구매형',
    label: '구매 타이밍을 노리는 유저',
    description: '혜택이 가장 좋을 때를 기다려요.',
    category: 'liveShopping',
  },
  {
    id: '신상품체크러',
    label: '신상품 체크러',
    description: '신제품을 빠르게 봐요.',
    category: 'liveShopping',
  },

  // ===== 재테크 (Investment) - 10개 =====
  {
    id: '재테크입문자',
    label: '재테크 입문자',
    description: '기초부터 배우고 있어요.',
    category: 'Investment',
  },
  {
    id: '정보수집형',
    label: '정보 수집형 투자자',
    description: '자료를 먼저 살펴봐요.',
    category: 'Investment',
  },
  {
    id: '안정추구형',
    label: '안정 추구형',
    description: '리스크를 최소화해요.',
    category: 'Investment',
  },
  {
    id: '수익중심형',
    label: '수익 중심형',
    description: '수익률을 중요하게 봐요.',
    category: 'Investment',
  },
  {
    id: '장기계획형',
    label: '장기 계획형',
    description: '미래를 보고 준비해요.',
    category: 'Investment',
  },
  {
    id: '경제관심러',
    label: '경제 이슈 관심자',
    description: '경제 흐름을 체크해요.',
    category: 'Investment',
  },
  {
    id: '투자콘텐츠소비',
    label: '투자 콘텐츠 소비자',
    description: '관련 콘텐츠를 자주 봐요.',
    category: 'Investment',
  },
  {
    id: '자산관리형',
    label: '자산 관리형',
    description: '자산을 체계적으로 관리해요.',
    category: 'Investment',
  },
  {
    id: '재무설계관심',
    label: '재무 설계 관심자',
    description: '계획적인 관리에 관심 있어요.',
    category: 'Investment',
  },
  {
    id: '현실중심형',
    label: '현실적인 투자자',
    description: '무리하지 않는 투자를 해요.',
    category: 'Investment',
  },

  // ===== 마켓 (market) - 10개 =====
  {
    id: '합리비교형',
    label: '꼼꼼히 비교하는 구매자',
    description: '가격, 구성, 혜택을 기준으로 비교해요.',
    category: 'market',
  },
  {
    id: '인기기준구매형',
    label: '인기 있는 제품을 고르는 타입',
    description: '지금 주목받는 제품을 기준으로 선택해요.',
    category: 'market',
  },
  {
    id: '신상선호형',
    label: '신상 헌터',
    description: '새로 나온 제품을 빠르게 찾아요.',
    category: 'market',
  },
  {
    id: '리뷰검증형',
    label: '실사용 중시형',
    description: '다른 사람의 리뷰를 중요하게 봐요.',
    category: 'market',
  },
  {
    id: '가치소비지향형',
    label: '의미 있는 소비를 하는 타입',
    description: '의미 있는 소비를 중요하게 생각해요.',
    category: 'market',
  },
  {
    id: '희소성중시',
    label: '한정판 러버',
    description: '한정 수량이나 특별한 제품에 관심이 많아요.',
    category: 'market',
  },
  {
    id: '소비관찰형',
    label: '사람들이 뭘 사는지 보는 타입',
    description: '구매보다는 흐름을 관찰해요.',
    category: 'market',
  },
  {
    id: '즉시결정형',
    label: '마음에 들면 바로 결정하는 타입',
    description: '고민보다 직감을 믿고 구매해요.',
    category: 'market',
  },
  {
    id: '구경중심형',
    label: '아이쇼핑러',
    description: '구매하지 않아도 구경하는 시간이 좋아요.',
    category: 'market',
  },
  {
    id: '취향수집형',
    label: '취향 콜렉터',
    description: '마음에 드는 아이템을 모으는 걸 즐겨요.',
    category: 'market',
  },
];
