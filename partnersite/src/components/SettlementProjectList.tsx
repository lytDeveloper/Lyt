import styles from './SettlementProjectList.module.css';

import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';

import { Link } from 'react-router-dom';
import { settlementProjects } from '../data/settlementProjects';

function SettlementProjectList() {
  return (
    <div className={styles.projectList}>
      {settlementProjects.map((project) => (
        <Link key={project.id} to={`/settlements/${project.id}`} className={styles.cardLink}>
          <article className={styles.projectCard}>
            <div className={styles.projectHeader}>
              <div className={styles.thumbnail} aria-hidden="true">
                <span className={styles.thumbnailLabel}>{project.thumbnailLabel}</span>
              </div>
              <div className={styles.projectInfo}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <p className={styles.projectClient}>{project.client}</p>
                <div className={styles.projectMeta}>
                  <div className={styles.projectMetaIcon}>
                    <CalendarMonthOutlinedIcon sx={{ fontSize: 14 }} /> {project.date}
                  </div>
                  <div className={styles.projectMetaIcon}>
                    <PeopleOutlineOutlinedIcon sx={{ fontSize: 14 }} /> {project.membersCount}명
                  </div>
                  <div className={styles.projectMetaIcon}>
                    <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} /> {project.updatedAt}
                  </div>
                </div>
                <div className={styles.progressRow}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>진행률</span>
                    <span className={styles.progressValue}>{project.progress}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <span className={styles.progressBarFill} style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.teamSection}>
              <span className={styles.teamLabel}>팀 멤버</span>
              <div className={styles.teamList}>
                {project.members.map((member) => (
                  <div key={member.id} className={styles.teamItem}>
                    <div className={styles.memberAvatar} style={{ backgroundColor: member.color }}>
                      {member.name.slice(0, 1)}
                      <span className={member.isOnline ? styles.memberStatusOnline : styles.memberStatusOffline} />
                    </div>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{member.name}</span>
                      <span className={styles.memberRole}>{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}

export default SettlementProjectList;
