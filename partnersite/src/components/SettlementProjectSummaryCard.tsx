import styles from './SettlementProjectSummaryCard.module.css';

type SettlementProjectSummaryCardProps = {
  title: string;
  client: string;
  totalAmount: number;
  platformFeeRate: number;
  feeAmount: number;
  formatCurrency: (value: number) => string;
};

function SettlementProjectSummaryCard({
  title,
  client,
  totalAmount,
  platformFeeRate,
  feeAmount,
  formatCurrency,
}: SettlementProjectSummaryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitleRow}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <span className={styles.badge}>완료</span>
      </div>
      <p className={styles.cardClient}>{client}</p>
      <div className={styles.amountRow}>
        <div>
          <p className={styles.amountLabel}>총 예산</p>
          <p className={styles.amountValue}>{formatCurrency(totalAmount)}</p>
        </div>
        <div className={styles.amountAlignRight}>
          <p className={styles.amountLabel}>플랫폼 수수료 ({platformFeeRate}%)</p>
          <p className={styles.feeValue}>-{formatCurrency(feeAmount)}</p>
        </div>
      </div>
    </div>
  );
}

export default SettlementProjectSummaryCard;
