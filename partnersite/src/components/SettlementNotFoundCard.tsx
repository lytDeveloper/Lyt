import { Link } from 'react-router-dom';
import styles from './SettlementNotFoundCard.module.css';

function SettlementNotFoundCard() {
  return (
    <div className={styles.notFoundCard}>
      <p className={styles.notFoundText}>프로젝트 목록으로 돌아가서 다시 선택해 주세요.</p>
      <Link className={styles.backButton} to="/">
        프로젝트 목록으로 이동
      </Link>
    </div>
  );
}

export default SettlementNotFoundCard;
