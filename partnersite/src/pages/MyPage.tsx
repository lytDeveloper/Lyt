import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Menu from '../layout/Menu';
import DashboardStatCard, { dashboardStatCards } from '../components/DashboardStatCard';
import ProjectListCard, { projectCards } from '../components/ProjectListCard';
import DonutChartCard, { donutChartCardData } from '../components/DonutChartCard';
import RecentStatsChartCard from '../components/RecentStatsChartCard';
import styles from './Mypage.module.css';

function Mypage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <aside className={styles.sidebar}>
            <Menu activeId="MyPage" />
          </aside>
          <section className={styles.content}>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>내 계정</h1>
              <p className={styles.pageSubtitle}>내 프로젝트의 성과와 현황을 한눈에 확인해요</p>
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>대시보드</h2>
              </div>
              <div className={styles.statGrid}>
                {dashboardStatCards.map((card) => (
                  <DashboardStatCard key={card.value} {...card} />
                ))}
              </div>
              <RecentStatsChartCard />
            </section>

            <section className={styles.lowerGrid}>
              {projectCards.map((card) => (
                <ProjectListCard key={card.title} title={card.title} summary={card.summary} items={card.items || []} />
              ))}
              <DonutChartCard {...donutChartCardData} />
            </section>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Mypage;
