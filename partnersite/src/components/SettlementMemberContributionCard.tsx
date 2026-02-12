import type { ChangeEvent } from 'react';
import type { SettlementProjectMember } from '../data/settlementProjects';
import styles from './SettlementMemberContributionCard.module.css';

type SettlementMemberContributionCardProps = {
  member: SettlementProjectMember;
  contribution: number;
  expectedAmount: number;
  onContributionChange: (event: ChangeEvent<HTMLInputElement>) => void;
  formatCurrency: (value: number) => string;
};

function SettlementMemberContributionCard({
  member,
  contribution,
  expectedAmount,
  onContributionChange,
  formatCurrency,
}: SettlementMemberContributionCardProps) {
  return (
    <article className={styles.memberCard}>
      <div className={styles.memberHeader}>
        <div className={styles.memberInfo}>
          <div className={styles.memberAvatar} style={{ backgroundColor: member.color }}>
            {member.name.slice(0, 1)}
            <span className={member.isOnline ? styles.memberStatusOnline : styles.memberStatusOffline} />
          </div>
          <div>
            <p className={styles.memberName}>{member.name}</p>
            <p className={styles.memberRole}>{member.role}</p>
          </div>
        </div>
        <div className={styles.percentInputGroup}>
          <input
            className={styles.percentInput}
            type="number"
            min={0}
            max={100}
            value={contribution}
            onChange={onContributionChange}
          />
          <span className={styles.percentSuffix}>%</span>
        </div>
      </div>
      <div className={styles.sliderRow}>
        <span className={styles.sliderLabel}>기여도</span>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={100}
          value={contribution}
          onChange={onContributionChange}
        />
      </div>
      <div className={styles.expectedIncome}>
        <span className={styles.expectedIncomeLabel}>예상 수령액</span>
        <span className={styles.expectedIncomeValue}>{formatCurrency(expectedAmount)}</span>
      </div>
    </article>
  );
}

export default SettlementMemberContributionCard;