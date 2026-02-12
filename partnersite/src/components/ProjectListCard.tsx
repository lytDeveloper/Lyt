import styles from './ProjectListCard.module.css';
import ProjectViewsIcon from '../assets/icon/mypage/ProjectViews.png';
import ProjectLikesIcon from '../assets/icon/mypage/ProjectLikes.png';
import UpIcon from '../assets/icon/mypage/up.png';
import UpDateIcon from '../assets/icon/mypage/upDate.png';

type ProjectItem = {
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  remain: string;
  status: string;
};

type SummaryItem = {
  icon: string;
  text: string;
  alt: string;
  iconClassName?: string;
};

type ProjectListCardProps = {
  title: string;
  summary: string | SummaryItem[];
  items: ProjectItem[];
};

export const projectCards: ProjectListCardProps[] = [
  {
    title: '가장 반응 좋은 프로젝트',
    summary: [
      { icon: ProjectViewsIcon, text: '조회수 1,030', alt: '조회수' },
      { icon: ProjectLikesIcon, text: '좋아요 1,240', alt: '좋아요' },
    ],
    items: [
      {
        title: '2025 Grand Noel: 빛의 정원',
        subtitle: '아미페르 콜라보',
        amount: '1,000만원',
        date: '2025년 12월 19일',
        remain: '15일',
        status: '진행중',
      },
    ],
  },
  {
    title: '최근 조회가 증가한 프로젝트',
    summary: [
      { icon: UpIcon, text: '조회수 1,030', alt: '조회수', iconClassName: styles.summaryIconSmall },
      { icon: UpIcon, text: '500', alt: '증가수', iconClassName: styles.summaryIconSmall },
    ],
    items: [
      {
        title: 'UNBOUND: Concrete Jungle',
        subtitle: 'RAW Edge x YANT',
        amount: '600만원',
        date: '2024년 02월 20일',
        remain: '28일',
        status: '진행중',
      },
    ],
  },
  {
    title: '최근 업데이트된 프로젝트',
    summary: [
      { icon: UpDateIcon, text: '업데이트 3시간 전', alt: '업데이트 시간', iconClassName: styles.summaryIconBig }
    ],
    items: [
      {
        title: '2025 Grand Noel: 빛의 정원',
        subtitle: '아미페르 콜라보',
        amount: '1,000만원',
        date: '2025년 12월 19일',
        remain: '15일',
        status: '진행중',
      },
    ],
  },
];

function ProjectListCard({ title, summary, items }: ProjectListCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.summary}>
            {typeof summary === 'string' ? (
              summary
            ) : (
              <span className={styles.summaryItems}>
                {summary.map((item) => (
                  <span key={item.text} className={styles.summaryItem}>
                    <img
                      className={`${styles.summaryIcon}${item.iconClassName ? ` ${item.iconClassName}` : ''}`}
                      src={item.icon}
                      alt={item.alt}
                    />
                    <span className={styles.summaryText}>{item.text}</span>
                  </span>
                ))}
              </span>
            )}
          </p>
        </div>
        {/* <button type="button" className={styles.link}>
          더보기
        </button> */}
      </div>
      <div className={styles.list}>
        {items.map((item, index) => (
          <article key={`${item.title}-${index}`} className={styles.item}>
            <div className={styles.thumbnail} aria-hidden="true" />
            <div className={styles.itemBody}>
              <div className={styles.itemHeader}>
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={styles.status}>{item.status}</span>
              </div>
              <p className={styles.itemSubtitle}>{item.subtitle}</p>
              <div className={styles.meta}>
                <span>{item.amount}</span>
                <span className={styles.dot} />
                <span>{item.date}</span>
                <span className={styles.dot} />
                <span>{item.remain}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProjectListCard;
