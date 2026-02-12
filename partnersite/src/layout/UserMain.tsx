import styles from './UserMain.module.css';
import bgImage from '../assets/images/main_bg.png';

function UserMain() {
  // const path = process.env.PUBLIC_URL;

  return (
    <main className={styles.main} style={{ backgroundImage: `url(${bgImage})` }}>
      <section className={styles.section1}>
        <div className={styles.glowEffect}></div>
        <div className={styles.textWrapper}>
          <div className={styles.textWrapperInner}>
            <h2 className={styles.title}>
              라잇, 앱으로 더 많은 가능성을 찾으세요.
            </h2>
            <div className={styles.buttonWrapper}>
              <a href="#" className={styles.button}>
                계정 관리하기
              </a>
              <a href="#" className={styles.button}>
                앱 열기
              </a>
            </div>
          </div>

          <div className={styles.inquiryWrapper}>
            <p className={styles.inquiry}>
              질문이 있으신가요?
            </p>
            <button className={styles.inquiryBtn}>
              문의하기
            </button>
          </div>
        </div>




      </section>
    </main>
  );
}

export default UserMain;