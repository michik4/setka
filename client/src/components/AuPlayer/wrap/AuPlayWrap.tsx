import React from 'react';
import AuPlayer from '../AuPlayer';
import styles from './AuPlayWrap.module.css';
import { usePlayer } from '../../../contexts/PlayerContext';

interface AuPlayerWrapProps {
    expandedMode?: boolean;
}

const AuPlayerWrap: React.FC<AuPlayerWrapProps> = ({ expandedMode = false }) => {
    const { isPlayerWindowOpen } = usePlayer();

    // Если окно плеера открыто, не отображаем AuPlayer
    if (isPlayerWindowOpen) {
        return (
            <div className={styles.playerOpenedInfo}>
                <p>Плеер открыт в отдельном окне</p>
            </div>
        );
    }

    return (
        <div className={`${styles.auPlayerWrap} ${expandedMode ? styles.expandedMode : ''}`}>
            <AuPlayer />
        </div>
    );
};

export default AuPlayerWrap;
