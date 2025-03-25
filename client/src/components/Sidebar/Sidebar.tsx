import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Формируем URL для страницы пользователя
  const profileUrl = user ? `/users/${user.id}` : '/';

  return (
    <nav className={styles.sidebar}>
      <ul className={styles.nav}>
        <li className={styles.navItem}>
          <Link to={profileUrl} className={`${styles.navLink} ${isActive(profileUrl) ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M5.84 15.63a6.97 6.97 0 0 0 8.32 0 8.2 8.2 0 0 0-8.32 0zM4.7 14.57a7 7 0 1 1 10.6 0 9.7 9.7 0 0 0-10.6 0zM10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm-1.5 7a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm1.5-3a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
              </svg>
            </div>
            <span>Моя страница</span>
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to="/feed" className={`${styles.navLink} ${isActive('/feed') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M13.08 2H6.92C4.23 2 2 4.23 2 6.92v6.17C2 15.77 4.23 18 6.92 18h6.17c2.68 0 4.92-2.23 4.92-4.92V6.92C18 4.23 15.77 2 13.08 2zm3.92 12c0 2.21-1.79 4-4 4H7c-2.21 0-4-1.79-4-4V7c0-2.21 1.79-4 4-4h6c2.21 0 4 1.79 4 4v7z"/>
              </svg>
            </div>
            <span>Новости</span>
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to="/messages" className={`${styles.navLink} ${isActive('/messages') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M6.83 15.75c.2-.23.53-.31.82-.2.81.3 1.7.45 2.6.45 3.77 0 6.75-2.7 6.75-6s-2.98-6-6.75-6S3.5 6.7 3.5 10c0 1.21.4 2.37 1.14 3.35.1.14.16.31.15.49-.04.76-.4 1.78-1.08 3.13 1.48-.11 2.5-.53 3.12-1.22zM3.24 18.5a1.2 1.2 0 0 1-1.1-1.77A10.77 10.77 0 0 0 3.5 13.5a7.5 7.5 0 1 1 13.5-4.42c.35 4.2-2.98 7.92-7.25 7.92-.67 0-1.33-.07-1.97-.2-.42.34-1.07.75-1.95 1.18-.88.43-1.62.6-2.22.54l-.37-.02z"/>
              </svg>
            </div>
            <span>Мессенджер</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar; 