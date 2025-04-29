import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTestFeatures } from '../../contexts/TestFeaturesContext';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isMessengerEnabled } = useTestFeatures();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Формируем URL для страницы пользователя
  const profileUrl = user ? `/users/${user.id}` : '/';
  const photosUrl = user ? `/users/${user.id}/photos` : '/';
  const messagesUrl = user ? `/users/${user.id}/messages` : '/';
  const friendsUrl = user ? `/friends` : '/';

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
          <Link to={photosUrl} className={`${styles.navLink} ${isActive(photosUrl) ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M15.5 4.42c-.84-.63-1.87-1-3-1h-5c-1.13 0-2.16.37-3 1-.84.62-1.5 1.54-1.5 2.58v7c0 1.04.66 1.96 1.5 2.58.84.63 1.87 1 3 1h5c1.13 0 2.16-.37 3-1 .84-.62 1.5-1.54 1.5-2.58v-7c0-1.04-.66-1.96-1.5-2.58zm.5 9.58c0 .69-.44 1.31-1 1.72-.55.41-1.23.65-2 .65h-5c-.77 0-1.45-.24-2-.65-.56-.41-1-1.03-1-1.72v-7c0-.69.44-1.31 1-1.72.55-.41 1.23-.65 2-.65h5c.77 0 1.45.24 2 .65.56.41 1 1.03 1 1.72v7zm-7.5-8.5h5c.28 0 .5.22.5.5v5c0 .28-.22.5-.5.5h-5c-.28 0-.5-.22-.5-.5v-5c0-.28.22-.5.5-.5z"/>
              </svg>
            </div>
            <span>Фотографии</span>
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to={friendsUrl} className={`${styles.navLink} ${isActive(friendsUrl) || location.pathname.startsWith('/friends/') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 9.52c1.7 0 3.1-1.4 3.1-3.1 0-1.7-1.4-3.1-3.1-3.1-1.7 0-3.1 1.4-3.1 3.1 0 1.7 1.4 3.1 3.1 3.1zm0-4.7c.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6 0-.9.7-1.6 1.6-1.6zm-5.3 5.9c1.3 0 2.4-1.1 2.4-2.4 0-1.3-1.1-2.4-2.4-2.4-1.3 0-2.4 1.1-2.4 2.4 0 1.3 1.1 2.4 2.4 2.4zm0-3.7c.7 0 1.3.6 1.3 1.3 0 .7-.6 1.3-1.3 1.3-.7 0-1.3-.6-1.3-1.3 0-.7.6-1.3 1.3-1.3zm10.6 0c1.3 0 2.4-1.1 2.4-2.4 0-1.3-1.1-2.4-2.4-2.4-1.3 0-2.4 1.1-2.4 2.4 0 1.3 1.1 2.4 2.4 2.4zm0-3.7c.7 0 1.3.6 1.3 1.3 0 .7-.6 1.3-1.3 1.3-.7 0-1.3-.6-1.3-1.3 0-.7.6-1.3 1.3-1.3zM16.1 12c-.8-.6-1.7-.9-2.7-.9-1 0-1.9.3-2.7.9-.5.4-.9.8-1.2 1.3-.3-.5-.7-.9-1.2-1.3-.8-.6-1.7-.9-2.7-.9-.9 0-1.9.3-2.7.9C1.9 13.2 1 15 1 16.9v.7c0 .6.4 1 1 1h16c.6 0 1-.4 1-1v-.7c0-1.9-.8-3.7-2.9-4.9zM2.5 17.1v-.3c0-1.4.6-2.7 2.1-3.6.6-.4 1.3-.6 2-6.6.7 0 1.4.2 2 .6 1.2.8 1.9 2.2 1.9 3.6v.3H2.5zm15 0h-8v-.3c0-.9-.2-1.8-.7-2.5.1-.2.2-.3.4-.5.6-.4 1.3-.6 2-.6.7 0 1.4.2 2 .6 1.5.9 2.1 2.2 2.1 3.6v.3h.2z"/>
              </svg>
            </div>
            <span>Друзья</span>
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to="/groups" className={`${styles.navLink} ${isActive('/groups') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M6.5 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0-1.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm7 1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0-1.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-7 4.5a3.5 3.5 0 0 0-3.5 3.5c0 .64.16 1.23.43 1.76a.5.5 0 0 0 .87-.49A2.5 2.5 0 0 1 6.5 11 2.5 2.5 0 0 1 9 13.5c0 .17-.02.34-.05.5h2.1a3.5 3.5 0 0 0-.05-.5c0-1.94 1.56-3.5 3.5-3.5a3.5 3.5 0 0 0 3.5 3.5c.17 0 .33-.02.5-.05v-1.05c-.2.06-.4.1-.6.1a2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 2.5-2.5c.2 0 .4.04.6.1v-1.05a3.5 3.5 0 0 0-4 3.45c0 .17.02.33.05.5h-2.1c.03-.17.05-.33.05-.5a3.5 3.5 0 0 0-3.5-3.5Z"/>
              </svg>
            </div>
            <span>Сообщества</span>
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to="/music" className={`${styles.navLink} ${isActive('/music') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M14.3 4.42c-.17-.65-.8-1.01-1.44-.84L7.31 5.16A1.2 1.2 0 0 0 6.5 6.28v7.45a3.5 3.5 0 1 0 1.5 2.87v-5.24l5.5-1.5V11.1c.39-.09.82-.1 1.25-.01A3.5 3.5 0 1 0 16 8.86V5.27c0-.29-.08-.57-.22-.85zM4.5 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm9-1.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-8-8.04V6.28c0-.12.11-.21.23-.19l5.55 1.5c.06.01.1.08.08.14v1.96a.14.14 0 0 1-.17.11l-5.5-1.5a.14.14 0 0 1-.1-.14zm8.5-1.28V5.24a.2.2 0 0 1 .25-.2l1.63.44c.13.04.22.16.22.3v1.76a.2.2 0 0 1-.28.19l-1.75-.47a.1.1 0 0 1-.07-.08z"/>
              </svg>
            </div>
            <span>Музыка</span>
          </Link>
        </li>
        
        {isMessengerEnabled && (
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
        )}
        
        <li className={`${styles.navItem} ${styles.navDivider}`}>
          <div className={styles.dividerLine}></div>
        </li>
        
        <li className={styles.navItem}>
          <Link to="/test-features" className={`${styles.navLink} ${isActive('/test-features') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 2c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
              </svg>
            </div>
            <span>Тестовые функции</span>
          </Link>
        </li>
        
        <li className={styles.navItem}>
          <Link to="/settings" className={`${styles.navLink} ${isActive('/settings') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 13.33a3.33 3.33 0 1 0 0-6.66 3.33 3.33 0 0 0 0 6.66zm0-1.33a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                <path d="M17.41 11.63c-.54-.15-.94-.6-1.05-1.15-.07-.44.05-.89.34-1.23.37-.43.43-1.05.15-1.54L15.37 5.6c-.28-.49-.85-.73-1.4-.59-.54.14-.94.59-1.05 1.14-.12.6-.5 1.07-1.07 1.07H11.73c-.56 0-.95-.48-1.07-1.07-.11-.55-.52-1-.64-1.1-.2-.14-.41-.21-.63-.25-.04 0-.09-.02-.13-.02-.31 0-.6.1-.84.28l-1.48 2.1c-.28.49-.22 1.1.15 1.55.29.33.41.8.34 1.23-.11.55-.51 1-1.05 1.15-.54.15-.91.65-.91 1.21v2.36c0 .56.37 1.06.91 1.22.54.15.94.6 1.05 1.15.07.44-.05.89-.34 1.23-.37.43-.43 1.05-.15 1.54L8.63 17.4c.22.36.61.6 1.02.6h.01c.32 0 .6-.1.84-.28.2-.14.37-.33.48-.56.11-.22.17-.46.19-.7.02-.23.12-.44.28-.6a.83.83 0 0 1 .59-.28h.11c.56 0 .95.48 1.07 1.07.11.55.52 1 1.07 1.15.54.15 1.12-.07 1.4-.56l1.48-2.11c.28-.49.22-1.1-.15-1.55-.29-.33-.41-.8-.34-1.23.11-.55.51-1 1.05-1.15.54-.15.91-.65.91-1.21v-2.37c0-.56-.37-1.06-.91-1.21h-.02zm-.52 3.58c0 .13-.09.24-.21.28-.92.25-1.64 1-1.82 1.92-.15.76.08 1.53.58 2.12a.3.3 0 0 1 .03.35l-1.48 2.11c-.06.11-.2.12-.32.08-.12-.04-.21-.13-.24-.26-.19-.96-.98-1.71-1.93-1.71h-.11c-.95 0-1.8.64-2.25 1.62-.04.1-.16.16-.28.16-.06 0-.12-.02-.16-.06-.01 0-.01-.01-.02-.01l-1.48-2.11c-.06-.12-.04-.27.03-.35.51-.59.73-1.36.58-2.12-.18-.92-.9-1.67-1.82-1.92a.28.28 0 0 1-.21-.28v-2.36c0-.13.09-.24.21-.28.92-.25 1.64-1 1.82-1.92.14-.75-.08-1.52-.58-2.12a.3.3 0 0 1-.03-.35l1.48-2.1c.07-.11.2-.12.32-.08.12.04.21.13.24.26.19.96.98 1.71 1.93 1.71h.11c.95 0 1.74-.76 1.93-1.71.03-.13.12-.22.24-.26.12-.04.25-.03.32.08l1.48 2.1c.08.13.05.29-.03.38-.51.59-.73 1.36-.58 2.12.18.92.9 1.67 1.82 1.92.13.04.21.15.21.28v2.36h-.01z"/>
              </svg>
            </div>
            <span>Настройки</span>
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to="/about" className={`${styles.navLink} ${isActive('/about') ? styles.active : ''}`}>
            <div className={styles.navIcon}>
              <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                <path d="M10 13.33a3.33 3.33 0 1 0 0-6.66 3.33 3.33 0 0 0 0 6.66zm0-1.33a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
              </svg>
            </div>
            <span>О Всети</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar; 