import { useState, type CSSProperties } from 'react';
import styles from './DonutChartCard.module.css';

export type DonutLegendTone = 'brand' | 'artist' | 'creative' | 'fan';

export type DonutLegendItem = {
  label: string;
  value: string;
  tone: DonutLegendTone;
};

type DonutChartCardProps = {
  title: string;
  summary: string;
  legend: DonutLegendItem[];
};

export const donutChartCardData: DonutChartCardProps = {
  title: '최근 활동한 사용자 유형',
  summary: '내 프로젝트를 본 사용자의 비율',
  legend: [
    { label: '브랜드', value: '30%', tone: 'brand' },
    { label: '아티스트', value: '20%', tone: 'artist' },
    { label: '크리에이터', value: '30%', tone: 'creative' },
    { label: '팬', value: '20%', tone: 'fan' },
  ],
};

function DonutChartCard({ title, summary, legend }: DonutChartCardProps) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const values = legend.map((item) => {
    const parsed = Number.parseFloat(item.value.replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const total = values.reduce((sum, value) => sum + value, 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeValue = activeIndex === null ? null : values[activeIndex];
  const displayValue = activeValue ?? total;
  let offset = 0;

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.summary}>{summary}</p>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.chartWrap}>
          <svg className={styles.chart} viewBox="0 0 120 120" aria-hidden="true">
            <circle className={styles.base} cx="60" cy="60" r={radius} />
            {legend.map((item, index) => {
              if (total <= 0) return null;
              const value = values[index];
              const isLast = index === legend.length - 1;
              const length = isLast
                ? Math.max(circumference - offset, 0)
                : (value / total) * circumference;
              const midAngle = ((offset + length / 2) / circumference) * Math.PI * 2;
              const hoverOffset = 6;
              const offsetX = Math.cos(midAngle) * hoverOffset;
              const offsetY = Math.sin(midAngle) * hoverOffset;
              const circle = (
                <circle
                  key={item.label}
                  className={`${styles.segment} ${styles[item.tone]} ${styles.segmentPop}`}
                  cx="60"
                  cy="60"
                  r={radius}
                  style={{
                    strokeDasharray: `${length} ${circumference - length}`,
                    strokeDashoffset: `-${offset}`,
                    '--offset-x': `${offsetX}px`,
                    '--offset-y': `${offsetY}px`,
                  } as CSSProperties}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className={styles.centerText}>
            <span className={styles.centerValue}>{Math.round(displayValue)}%</span>
            {activeIndex !== null && (
              <span className={styles.centerLabel}>{legend[activeIndex].label}</span>
            )}
          </div>
        </div>
        <div className={styles.legend}>
          {legend.map((item) => (
            <div key={item.label} className={styles.legendItem}>
              <span className={`${styles.dot} ${styles[item.tone]}`} />
              <span className={styles.legendLabel}>{item.label}</span>
              <span className={styles.legendValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DonutChartCard;
