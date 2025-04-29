import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import NotificationDrawer from '../Notifications/NotificationDrawer';
import styles from './Header.module.css';

export const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    // Пример количества непрочитанных уведомлений (в будущем должно приходить из сервера)
    const unreadNotificationsCount = 2;

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    };

    const toggleNotifications = () => {
        setNotificationsOpen(!notificationsOpen);
    };

    // Проверяю, есть ли иконка мессенджера в хедере
    // Если есть, то обновляю ее отображение в зависимости от опции isMessengerEnabled

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link to="/" className={styles.logo}>Сетка</Link>
                {user && (
                    <div className={styles.userActions}>
                        <div className={styles.userInfo}>
                            <button 
                                className={styles.notificationButton}
                                onClick={toggleNotifications}
                                aria-label="Уведомления"
                            >
                                <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                                    <path d="M10 20c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zm6-6V9c0-3.07-1.63-5.64-4.5-6.32V2C11.5.84 10.66 0 9.5 0S7.5.84 7.5 2v.68C4.64 3.36 3 5.92 3 9v5l-2 2v1h16v-1l-2-2zm-2 1H5V9c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                                </svg>
                                {unreadNotificationsCount > 0 && (
                                    <span className={styles.notificationBadge}>
                                        {unreadNotificationsCount}
                                    </span>
                                )}
                            </button>
                            <Link 
                                to={`/users/${user.id}`} 
                                className={styles.userName}
                            >
                                {user.firstName} {user.lastName}
                            </Link>
                            <Link
                                to="/settings"
                                className={styles.settingsButton}
                            >
                                <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
                                    <path d="M10 13.33a3.33 3.33 0 1 0 0-6.66 3.33 3.33 0 0 0 0 6.66zm0-1.33a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                                    <path d="M17.41 11.63c-.54-.15-.94-.6-1.05-1.15-.07-.44.05-.89.34-1.23.37-.43.43-1.05.15-1.54L15.37 5.6c-.28-.49-.85-.73-1.4-.59-.54.14-.94.59-1.05 1.14-.12.6-.5 1.07-1.07 1.07H11.73c-.56 0-.95-.48-1.07-1.07-.11-.55-.52-1-.64-1.1-.2-.14-.41-.21-.63-.25-.04 0-.09-.02-.13-.02-.31 0-.6.1-.84.28l-1.48 2.1c-.28.49-.22 1.1.15 1.55.29.33.41.8.34 1.23-.11.55-.51 1-1.05 1.15-.54.15-.91.65-.91 1.21v2.36c0 .56.37 1.06.91 1.22.54.15.94.6 1.05 1.15.07.44-.05.89-.34 1.23-.37.43-.43 1.05-.15 1.54L8.63 17.4c.22.36.61.6 1.02.6h.01c.32 0 .6-.1.84-.28.2-.14.37-.33.48-.56.11-.22.17-.46.19-.7.02-.23.12-.44.28-.6a.83.83 0 0 1 .59-.28h.11c.56 0 .95.48 1.07 1.07.11.55.52 1 1.07 1.15.54.15 1.12-.07 1.4-.56l1.48-2.11c.28-.49.22-1.1-.15-1.55-.29-.33-.41-.8-.34-1.23.11-.55.51-1 1.05-1.15.54-.15.91-.65.91-1.21v-2.37c0-.56-.37-1.06-.91-1.21h-.02zm-.52 3.58c0 .13-.09.24-.21.28-.92.25-1.64 1-1.82 1.92-.15.76.08 1.53.58 2.12a.3.3 0 0 1 .03.35l-1.48 2.11c-.06.11-.2.12-.32.08-.12-.04-.21-.13-.24-.26-.19-.96-.98-1.71-1.93-1.71h-.11c-.95 0-1.8.64-2.25 1.62-.04.1-.16.16-.28.16-.06 0-.12-.02-.16-.06-.01 0-.01-.01-.02-.01l-1.48-2.11c-.06-.12-.04-.27.03-.35.51-.59.73-1.36.58-2.12-.18-.92-.9-1.67-1.82-1.92a.28.28 0 0 1-.21-.28v-2.36c0-.13.09-.24.21-.28.92-.25 1.64-1 1.82-1.92.14-.75-.08-1.52-.58-2.12a.3.3 0 0 1-.03-.35l1.48-2.1c.07-.11.2-.12.32-.08.12.04.21.13.24.26.19.96.98 1.71 1.93 1.71h.11c.95 0 1.74-.76 1.93-1.71.03-.13.12-.22.24-.26.12-.04.25-.03.32.08l1.48 2.1c.08.13.05.29-.03.38-.51.59-.73 1.36-.58 2.12.18.92.9 1.67 1.82 1.92.13.04.21.15.21.28v2.36h-.01z"/>
                                </svg>
                            </Link>
                            <button 
                                onClick={handleLogout}
                                className={styles.logoutButton}
                            >
                                Выйти
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Контейнер для уведомлений */}
            {notificationsOpen && (
                <NotificationDrawer 
                    isOpen={notificationsOpen} 
                    onClose={() => setNotificationsOpen(false)}
                />
            )}
        </header>
    );
}; 