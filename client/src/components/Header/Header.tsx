import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

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
                <h1 className={styles.logo}>Сетка</h1>
                {user && (
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>
                            {user.firstName} {user.lastName}
                        </span>
                        <button 
                            onClick={handleLogout}
                            className={styles.logoutButton}
                        >
                            Выйти
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}; 