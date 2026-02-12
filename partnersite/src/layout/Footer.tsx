import styles from './Footer.module.css';

function Footer() {
  // const path = process.env.PUBLIC_URL;

  return (
    <footer className={styles.footer}>
      <div className={styles.copyright}>
        <div className={styles.footerInfo}>
          <span>주식회사 콜에이전시</span>
          <span className={styles.separator}>|</span>
          <span>대표: 허승훈</span>
          <span className={styles.separator}>|</span>
          <span>사업자등록번호: 731-10-02682</span>
        </div>
        <div className={styles.footerInfo}>
          <span>주소: 경기도 남양주시 순화궁로 418, 현대그리너리캠퍼스별가람역 주건축물제1동 14층 제비14-0029호(별내동)</span>
        </div>
        <div className={styles.footerInfo}>
          <span>전화번호: 0507-1433-7780</span>
          <span className={styles.separator}>|</span>
          <span>이메일: contact@colagency.com</span>
          <span className={styles.separator}>|</span>
          <a href="https://app.lyt-app.io/settings/terms" className={styles.footerLink}>개인정보 처리방침</a>
        </div>
        <div className={styles.footerInquiryBtnWrapper}>
          <button className={styles.footerInquiryBtn}>문의하기</button>
        </div>
        <div className={styles.footerCopyright}>
          © 2026 Colagency. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;