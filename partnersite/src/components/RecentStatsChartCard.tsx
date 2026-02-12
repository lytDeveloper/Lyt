import styles from './RecentStatsChartCard.module.css';

const X_POSITIONS = [40, 130, 220, 310, 400, 490, 580];
const CHART_TOP = 20;
const CHART_BOTTOM = 180;
const CHART_RANGE = CHART_BOTTOM - CHART_TOP;
const MAX_VALUE = 500;

const valueToY = (value: number) =>
  CHART_BOTTOM - (value / MAX_VALUE) * CHART_RANGE;

const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
};

const getRecentDates = (days: number) => {
  const today = new Date();
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${month}/${day}`;
  });
};

function RecentStatsChartCard() {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>최근 7일 현황</h3>
        <div className={styles.legend}>
          <span className={`${styles.legendItem} ${styles.legendPurple}`}>조회수</span>
          <span className={`${styles.legendItem} ${styles.legendPink}`}>좋아요</span>
          <span className={`${styles.legendItem} ${styles.legendBlue}`}>문의수</span>
        </div>
      </div>

      <div className={styles.chartArea}>
        <div className={styles.yAxis}>
          {['500', '400', '300', '200', '100', '0'].map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
        <svg className={styles.chart} viewBox="0 0 600 200" aria-hidden="true">
          {X_POSITIONS.map((x) => (
            <line key={x} x1={x} y1="20" x2={x} y2="180" stroke={`var(--color-grey2)`} />
          ))}

          {[
            {
              label: '조회수',
              color: 'var(--color2)',
              values: [250, 156, 344, 281, 375, 188, 250],
            },
            {
              label: '좋아요',
              color: 'var(--color1)',
              values: [0, 16, 125, 266, 188, 122, 0],
            },
            {
              label: '문의수',
              color: 'var(--color3)',
              values: [188, 313, 63, 188, 281, 0, 125],
            },
          ].map((series) => {
            const points = series.values.map((value, index) => ({
              x: X_POSITIONS[index],
              y: valueToY(value),
              value,
            }));

            return (
              <g key={series.label} className={styles.series}>
                <path
                  d={buildSmoothPath(points)}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="1.5"
                />
                {points.map((point, index) => (
                  <g
                    key={`${series.label}-${index}`}
                    className={styles.pointGroup}
                    style={{ color: series.color }}
                    transform={`translate(${point.x} ${point.y})`}
                  >
                    <circle className={styles.pointCircle} r="4" />
                    <g transform="translate(0 -24)">
                      <g className={styles.svgTooltip}>
                        <rect className={styles.svgTooltipBg} x="-26" y="-22" width="52" height="28" rx="10" />
                        <text className={styles.svgTooltipValue} textAnchor="middle" x="0" y="-8">
                          {point.value}
                        </text>
                        <text className={styles.svgTooltipLabel} textAnchor="middle" x="0" y="4">
                          {series.label}
                        </text>
                        <path className={styles.svgTooltipArrow} d="M -6 6 L 6 6 L 0 12 Z" />
                      </g>
                    </g>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>

        <div className={styles.xAxis}>
          {getRecentDates(7).map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RecentStatsChartCard;
