import styles from './Header.module.css';
import logoImage from '../assets/images/logo.png';

function Header() {
  return (
    <body>
      <header className={styles.header}>
        <div className={`${styles.headerContainer} ${styles.layout}`}>
          <img src={logoImage} alt="logo" className={styles.logo} />
          <div className={styles.login}>
            <button className={styles.loginBtn}>로그인</button>
          </div>
        </div>
      </header>
    </body>

  );
}

export default Header;