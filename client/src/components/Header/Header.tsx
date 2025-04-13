import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Header.module.css';
import MiniPlayer from '../MiniPlayer/MiniPlayer';

export const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link to="/" className={styles.logo}>Сетка</Link>
                {user && (
                    <div className={styles.userActions}>
                        <div className={styles.playerControls}>
                            <div className={styles.miniPlayerWrapper}>
                                <MiniPlayer />
                            </div>
                        </div>
                        <div className={styles.userInfo}>
                            <Link 
                                to={`/users/${user.id}`} 
                                className={styles.userName}
                            >
                                {user.firstName} {user.lastName}
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
        </header>
    );
}; 