import type { ReactNode } from 'react';
import styles from './Menu.module.css';
import MyPageIcon from '../assets/icon/menu/MyPage.png';
import SettlementsIcon from '../assets/icon/menu/Settlements.png';
import PointsIcon from '../assets/icon/menu/Points.png';
import AdsIcon from '../assets/icon/menu/Ads.png';
import MessagesIcon from '../assets/icon/menu/Messages.png';
import ProfileIcon from '../assets/icon/menu/Profile.png';

type MenuItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

const menuItems: MenuItem[] = [
  {
    id: 'MyPage',
    label: '내 계정',
    icon: <img src={MyPageIcon} alt="내 계정" aria-hidden="true" />,
  },
  {
    id: 'Settlements',
    label: '프로젝트 정산',
    icon: <img src={SettlementsIcon} alt="프로젝트 정산" aria-hidden="true" />,
  },
  {
    id: 'Points',
    label: '라잇포인트',
    icon: <img src={PointsIcon} alt="라잇포인트" aria-hidden="true" />,
  },
  {
    id: 'Ads',
    label: '광고',
    icon: <img src={AdsIcon} alt="광고" aria-hidden="true" />,
  },
  {
    id: 'Messages',
    label: '메시지',
    icon: <img src={MessagesIcon} alt="메시지" aria-hidden="true" />,
  },
  {
    id: 'Profile',
    label: '프로필 꾸미기',
    icon: <img src={ProfileIcon} alt="프로필 꾸미기" aria-hidden="true" />,
  },
];

type MenuProps = {
  activeId?: string;
};

function Menu({ activeId = 'MyPage' }: MenuProps) {
  return (
    <nav className={styles.menu}>
      <ul className={styles.menuList}>
        {menuItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`${styles.menuItem} ${item.id === activeId ? styles.active : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Menu;
