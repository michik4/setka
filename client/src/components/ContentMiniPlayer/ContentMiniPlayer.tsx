import React, { useRef, useEffect, useState, useMemo } from 'react';
import MiniPlayer from '../MiniPlayer/MiniPlayer';
import { usePlayer } from '../../contexts/PlayerContext';
import { useTestFeatures } from '../../contexts/TestFeaturesContext';
import styles from './ContentMiniPlayer.module.css';

const ContentMiniPlayer: React.FC = () => {
    // Используем деструктуризацию с ограниченным набором свойств
    const { currentTrack } = usePlayer();
    const { isPlayerWindowEnabled } = useTestFeatures();
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInRightSidebar, setIsInRightSidebar] = useState(false);
    
    // Мемоизируем проверку на наличие записей в localStorage
    const playerWindowState = useMemo(() => {
        const playerWindowOpened = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        
        let isExternalPlayerOpen = false;
        
        if (isPlayerWindowEnabled) {
            if (playerWindowOpened && playerWindowClosed) {
                const openedTime = parseInt(playerWindowOpened || '0');
                const closedTime = parseInt(playerWindowClosed || '0');
                isExternalPlayerOpen = openedTime > closedTime;
            } else if (playerWindowOpened && !playerWindowClosed) {
                isExternalPlayerOpen = true;
            }
        }
        
        return { isExternalPlayerOpen };
    }, [isPlayerWindowEnabled]);
    
    // Определяем, находится ли плеер в правом сайдбаре
    useEffect(() => {
        if (containerRef.current) {
            const isInSidebar = containerRef.current.closest('.right-sidebar') !== null;
            setIsInRightSidebar(isInSidebar);
        }
    }, []);

    // Если нет текущего трека, не показываем компонент
    if (!currentTrack) return null;

    // Если плеер открыт в отдельном окне, показываем уведомление
    if (isPlayerWindowEnabled && playerWindowState.isExternalPlayerOpen) {
        return (
            <div className={styles.playerNotification} ref={containerRef}>
                <span>Плеер открыт в отдельном окне</span>
                <div className={styles.pulsingDot}></div>
            </div>
        );
    }

    // В остальных случаях показываем мини-плеер
    return (
        <div className={`${styles.contentMiniPlayer} ${isInRightSidebar ? styles.inRightSidebar : ''}`} ref={containerRef}>
            <MiniPlayer forceExpanded={true} />
        </div>
    );
};

export default ContentMiniPlayer; 