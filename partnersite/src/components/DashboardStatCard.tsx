import type { ReactNode } from 'react';
import styles from './DashboardStatCard.module.css';
import ProjectIcon from '../assets/icon/mypage/project.png';
import ProjectViewsIcon from '../assets/icon/mypage/ProjectViews.png';
import ProjectLikesIcon from '../assets/icon/mypage/ProjectLikes.png';
import PartnershipRequestsnIcon from '../assets/icon/mypage/PartnershipRequests.png';

type DashboardStatCardProps = {
  value: string;
  caption: string;
  icon: ReactNode;
  accentClassName?: string;
};

export const dashboardStatCards: DashboardStatCardProps[] = [
  {
    value: '진행중 2개',
    caption: '전체 프로젝트 10개',
    icon: <img src={ProjectIcon} alt="프로젝트" aria-hidden="true" />
  },
  {
    value: '조회수 120',
    caption: '프로젝트 총 조회수',
    icon: <img src={ProjectViewsIcon} alt="조회수" aria-hidden="true" />
  },
  {
    value: '좋아요 수 560',
    caption: '프로젝트 총 좋아요 수',
    icon: <img className={styles.iconLike} src={ProjectLikesIcon} alt="좋아요" aria-hidden="true" />
  },
  {
    value: '파트너 문의 수 340',
    caption: '대화/파트너십요청, 초대요청 수',
    icon: <img className={styles.iconQuestion} src={PartnershipRequestsnIcon} alt="문의수" aria-hidden="true" />
  },
];

function DashboardStatCard({
  value,
  caption,
  icon,
  accentClassName,
}: DashboardStatCardProps) {
  return (
    <div className={`${styles.card} ${accentClassName ?? ''}`}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>
        <p className={styles.value}>{value}</p>
        <p className={styles.caption}>{caption}</p>
      </div>
    </div>
  );
}

export default DashboardStatCard;
