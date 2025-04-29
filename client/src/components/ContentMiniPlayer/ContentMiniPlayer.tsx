import React, { useRef, useEffect, useState, useMemo } from 'react';
import MiniPlayer from '../MiniPlayer/MiniPlayer';
import { usePlayer } from '../../contexts/PlayerContext';
import { useTestFeatures } from '../../contexts/TestFeaturesContext';
import styles from './ContentMiniPlayer.module.css';

const ContentMiniPlayer: React.FC = () => {
    const playerData = usePlayer();
    const { isPlayerWindowEnabled } = useTestFeatures();
    const playerWindowOpened = localStorage.getItem('player_window_opened');
    const playerWindowClosed = localStorage.getItem('player_window_closed');
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInRightSidebar, setIsInRightSidebar] = useState(false);
    
    // Используем useMemo для получения только тех данных, которые нужны для рендеринга
    const currentTrack = useMemo(() => playerData.currentTrack, [playerData.currentTrack]);
    
    // Определяем, находится ли плеер в правом сайдбаре
    useEffect(() => {
        if (containerRef.current) {
            const isInSidebar = containerRef.current.closest('.right-sidebar') !== null;
            setIsInRightSidebar(isInSidebar);
        }
    }, []);
    
    // Проверяем, открыт ли внешний плеер в отдельном окне
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

    // Если нет текущего трека, не показываем компонент
    if (!currentTrack) return null;

    // Если плеер открыт в отдельном окне, показываем уведомление
    if (isPlayerWindowEnabled && isExternalPlayerOpen) {
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