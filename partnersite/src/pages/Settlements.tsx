import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Menu from '../layout/Menu';
import SettlementProjectList from '../components/SettlementProjectList';
import styles from './Settlements.module.css';

function Settlements() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <aside className={styles.sidebar}>
            <Menu activeId="Settlements" />
          </aside>
          <section className={styles.content}>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>프로젝트 정산</h1>
              <p className={styles.pageSubtitle}>완료된 프로젝트의 파트너별 기여도에 따라 수익을 배분하세요.</p>
            </div>
            <section className={styles.section}>
              <SettlementProjectList />
            </section>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Settlements;