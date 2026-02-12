import styles from './Main.module.css';
import bgImage from '../assets/images/main_bg.png';

function Main() {
  // const path = process.env.PUBLIC_URL;

  return (
    <main className={styles.main} style={{ backgroundImage: `url(${bgImage})` }}>
      <section className={styles.section1}>
        <div className={styles.glowEffect}></div>
        <div className={styles.textWrapper}>
          <h2 className={styles.title}>
            각자의 자리에서 가진 영향력을 연결해 <br /> 브랜드와 콘텐츠가 함께 성장하는 공간, 라잇
          </h2>
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

export default Main;