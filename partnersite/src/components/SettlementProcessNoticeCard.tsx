import styles from './SettlementProcessNoticeCard.module.css';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
function SettlementProcessNoticeCard() {
  return (
    <div className={styles.noticeCard}>
      <div className={styles.noticeIconContainer}>
        <InfoOutlinedIcon sx={{ fontSize: 18 }} className={styles.noticeIcon} />
        <h3 className={styles.noticeTitle}>정산 프로세스</h3>
      </div>

      <ul className={styles.noticeList}>
        <li>총 기여도는 정확히 100%여야 해요.</li>
        <li>정산 요청 제출 후 플랫폼에서 배분 내역을 검토해요.</li>
        <li>검토 완료 후 자동으로 파트너들에게 지급돼요.</li>
        <li>정산 내역은 모든 파트너가 확인할 수 있어요.</li>
        <li>검토 중에는 배분율을 수정할 수 없어요.</li>
      </ul>
    </div>
  );
}

export default SettlementProcessNoticeCard;
