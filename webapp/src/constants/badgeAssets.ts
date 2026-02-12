import { BADGE_IDS } from '../services/badgeAutoGrantService';

// 배지 이미지 에셋 임포트
import Badge01 from '../assets/badges/Badge_01.png';
import Badge02 from '../assets/badges/Badge_02.png';
import Badge03 from '../assets/badges/Badge_03.png';
import Badge04 from '../assets/badges/Badge_04.png';
import Badge05 from '../assets/badges/Badge_05.png';
import Badge06 from '../assets/badges/Badge_06.png';
import Badge07 from '../assets/badges/Badge_07.png';
import Badge08 from '../assets/badges/Badge_08.png';
import Badge09 from '../assets/badges/Badge_09.png';
import Badge10 from '../assets/badges/Badge_10.png';

/**
 * 배지 ID와 로컬 에셋 매핑
 */
export const BADGE_ASSET_MAP: Record<string, string> = {
    [BADGE_IDS.CONNECTOR]: Badge01,
    [BADGE_IDS.PROFILE_COMPLETE]: Badge02,
    [BADGE_IDS.COMMUNICATOR]: Badge03,
    [BADGE_IDS.PROJECT_MASTER]: Badge04,
    [BADGE_IDS.COLLAB_MASTER]: Badge05,
    [BADGE_IDS.LINK_MAKER]: Badge06,
    [BADGE_IDS.EXPLORER]: Badge07,
    [BADGE_IDS.PERSISTENT]: Badge08,
    [BADGE_IDS.COLLECTOR]: Badge09,
    [BADGE_IDS.REPRESENTATIVE]: Badge10,
};

/**
 * 배지 ID에 해당하는 로컬 에셋 경로 반환
 */
export const getBadgeAsset = (badgeId: string | null | undefined): string | null => {
    if (!badgeId) return null;
    return BADGE_ASSET_MAP[badgeId] || null;
};
