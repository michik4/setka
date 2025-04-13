import React, { useEffect, useState } from 'react';
import AuPlayer from '../AuPlayer';
import styles from './AuPlayWrap.module.css';
import { usePlayer } from '../../../contexts/PlayerContext';

interface AuPlayerWrapProps {
    expandedMode?: boolean;
}

const AuPlayWrap: React.FC<AuPlayerWrapProps> = ({ expandedMode = false }) => {
    const { isPlayerWindowOpen } = usePlayer();
    const [isPlayerActive, setIsPlayerActive] = useState(false);
    
    // Проверяем, открыто ли окно плеера
    useEffect(() => {
        const checkPlayerWindow = () => {
            const playerWindowOpened = localStorage.getItem('player_window_opened');
            const playerWindowClosed = localStorage.getItem('player_window_closed');
            
            if (playerWindowOpened && playerWindowClosed) {
                const openedTime = parseInt(playerWindowOpened);
                const closedTime = parseInt(playerWindowClosed);
                setIsPlayerActive(openedTime > closedTime);
            } else if (playerWindowOpened && !playerWindowClosed) {
                setIsPlayerActive(true);
            } else {
                setIsPlayerActive(false);
            }
        };
        
        // Проверяем при загрузке
        checkPlayerWindow();
        
        // Следим за изменениями в localStorage
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'player_window_opened' || e.key === 'player_window_closed') {
                checkPlayerWindow();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        // Регулярно проверяем статус окна
        const interval = setInterval(checkPlayerWindow, 2000);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);
    
    // Если окно плеера открыто, не отображаем основной плеер
    if (isPlayerActive || isPlayerWindowOpen) {
        return null;
    }
    
    return (
        <div className={`${styles.auPlayWrap} ${expandedMode ? styles.expanded : ''}`}>
            <AuPlayer />
        </div>
    );
};

export default AuPlayWrap;
