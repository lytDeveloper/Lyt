import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Menu from '../layout/Menu';
import styles from './SettlementContributionPage.module.css';
import { getSettlementProjectById } from '../data/settlementProjects';
import SettlementNotFoundCard from '../components/SettlementNotFoundCard';
import SettlementProjectSummaryCard from '../components/SettlementProjectSummaryCard';
import SettlementDistributionStatusCard from '../components/SettlementDistributionStatusCard';
import SettlementMemberContributionCard from '../components/SettlementMemberContributionCard';
import SettlementProcessNoticeCard from '../components/SettlementProcessNoticeCard';

import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function SettlementContributionPage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const project = getSettlementProjectById(projectId);
  const [saveMessage, setSaveMessage] = useState('');
  const [teamDistributionPercent, setTeamDistributionPercent] = useState(70);
  const [contributionByMember, setContributionByMember] = useState<Record<string, number>>({});

  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    if (!project) {
      setContributionByMember({});
      return;
    }

    const initialContributions = project.members.reduce<Record<string, number>>((acc, member) => {
      acc[member.id] = 0;
      return acc;
    }, {});
    setContributionByMember(initialContributions);
    setTeamDistributionPercent(70);
    setSaveMessage('');
  }, [project]);

  if (!project) {
    return (
      <>
        <Header />
        <main className={styles.page}>
          <div className={styles.container}>
            <aside className={styles.sidebar}>
              <Menu activeId="Settlements" />
            </aside>
            <section className={styles.content}>
              <button type="button" className={styles.backButton} onClick={handleGoBack}>
                <ArrowBackIosNewRoundedIcon sx={{ fontSize: 18 }} className={styles.backButtonIcon} />
              </button>
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>프로젝트 정산</h1>
                <p className={styles.pageSubtitle}>요청하신 프로젝트를 찾을 수 없습니다.</p>
              </div>
              <SettlementNotFoundCard />
            </section>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const feeAmount = project.totalAmount * (project.platformFeeRate / 100);
  const distributableAmount = project.totalAmount - feeAmount;
  const teamDistributionAmount = (project.totalAmount * teamDistributionPercent) / 100;
  const exceedsDistributableAmount = teamDistributionAmount > distributableAmount;
  const totalContribution = project.members.reduce((sum, member) => sum + (contributionByMember[member.id] ?? 0), 0);
  const remainingPercent = 100 - totalContribution;
  const remainingAmount = teamDistributionAmount;
  const isValidTotal = totalContribution === 100 && !exceedsDistributableAmount;

  const handleContributionChange = (memberId: string, rawValue: string) => {
    const enteredValue = clampPercent(Number(rawValue) || 0);

    setContributionByMember((prev) => ({
      ...prev,
      [memberId]: enteredValue,
    }));
    setSaveMessage('');
  };

  const handleInputChange = (memberId: string) => (event: ChangeEvent<HTMLInputElement>) => {
    handleContributionChange(memberId, event.target.value);
  };

  const handleTeamDistributionPercentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTeamDistributionPercent(clampPercent(Number(event.target.value) || 0));
    setSaveMessage('');
  };

  const handleSave = () => {
    if (!isValidTotal) {
      return;
    }

    setSaveMessage('정산안이 임시 저장되었습니다.');
  };

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <aside className={styles.sidebar}>
            <Menu activeId="Settlements" />
          </aside>
          <section className={styles.content}>

            <div className={styles.pageHeader}>
              <button type="button" className={styles.backButton} onClick={handleGoBack}>
                <ArrowBackIosNewRoundedIcon sx={{ fontSize: 29 }} className={styles.backButtonIcon} />
              </button>
              <div className={styles.pageTitleContainer}>
                <h1 className={styles.pageTitle}>프로젝트 정산</h1>
                <p className={styles.pageSubtitle}>파트너별 기여도에 따라 수익을 배분하세요.</p>
              </div>

            </div>

            <SettlementProjectSummaryCard
              title={project.title}
              client={project.client}
              totalAmount={project.totalAmount}
              platformFeeRate={project.platformFeeRate}
              feeAmount={feeAmount}
              formatCurrency={formatCurrency}
            />

            <SettlementDistributionStatusCard
              teamDistributionPercent={teamDistributionPercent}
              totalContribution={totalContribution}
              remainingAmount={remainingAmount}
              onTeamDistributionPercentChange={handleTeamDistributionPercentChange}
              formatCurrency={formatCurrency}
            />
            <h3 className={styles.memberListTitle}>파트너별 기여도 배분</h3>
            <div className={styles.memberList}>
              {project.members.map((member) => {
                const contribution = contributionByMember[member.id] ?? 0;
                const expectedAmount = (teamDistributionAmount * contribution) / 100;

                return (
                  <SettlementMemberContributionCard
                    key={member.id}
                    member={member}
                    contribution={contribution}
                    expectedAmount={expectedAmount}
                    onContributionChange={handleInputChange(member.id)}
                    formatCurrency={formatCurrency}
                  />
                );
              })}
            </div>

            {!isValidTotal && (
              <p className={styles.validationText}>
                {exceedsDistributableAmount
                  ? `현재 팀원 배분 금액이 수수료 제외 가능 금액(${formatCurrency(distributableAmount)})을 초과했습니다. 배분 비율을 낮춰주세요.`
                  : `현재 총 기여도는 ${totalContribution}%입니다.${remainingPercent > 0
                    ? ` 남은 비율 ${remainingPercent}%를 조정해 100%로 맞춰주세요.`
                    : ` ${Math.abs(remainingPercent)}% 초과되었습니다. 100%로 맞춰주세요.`
                  }`}
              </p>
            )}

            <button
              type="button"
              className={styles.saveButton}
              disabled={!isValidTotal}
              onClick={handleSave}
            >
              정산 요청 제출
            </button>

            {saveMessage && <p className={styles.saveMessage}>{saveMessage}</p>}

            <SettlementProcessNoticeCard />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default SettlementContributionPage;