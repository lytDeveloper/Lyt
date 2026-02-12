import type { ChangeEvent } from 'react';
import styles from './SettlementDistributionStatusCard.module.css';

type SettlementDistributionStatusCardProps = {
  teamDistributionPercent: number;
  totalContribution: number;
  remainingAmount: number;
  onTeamDistributionPercentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  formatCurrency: (value: number) => string;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function SettlementDistributionStatusCard({
  teamDistributionPercent,
  totalContribution,
  remainingAmount,
  onTeamDistributionPercentChange,
  formatCurrency,
}: SettlementDistributionStatusCardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>배분 현황</h2>
      <div className={styles.distributionInputRow}>
        {/* <span className={styles.progressLabel}>팀원 배분 비율 (총 예산 기준)</span> */}
        <div className={styles.percentInputGroup}>
          <input
            className={styles.percentInput}
            type="number"
            min={0}
            max={100}
            value={teamDistributionPercent}
            onChange={onTeamDistributionPercentChange}
          />
          <span className={styles.percentSuffix}>%</span>
        </div>
      </div>
      <div className={styles.progressHeader}>
        <span className={styles.progressLabel}>총 배분률</span>
        <span className={styles.progressValue}>{totalContribution}%</span>
      </div>
      <div className={styles.progressBar}>
        <span className={styles.progressBarFill} style={{ width: `${clampPercent(totalContribution)}%` }} />
      </div>
      <div className={styles.remainingBox}>
        <span className={styles.remainingLabel}>미배분 금액</span>
        <span className={styles.remainingValue}>{formatCurrency(remainingAmount)}</span>
      </div>
    </div>
  );
}

export default SettlementDistributionStatusCard;
