import React from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import styles from './PlayerPopupButton.module.css';

const PlayerPopupButton: React.FC = () => {
    const { currentTrack } = usePlayer();
    
    // Открытие плеера в отдельном окне
    const openPlayerWindow = () => {
        // Открытие в новом окне без меню и панелей
        const playerWindow = window.open(
            '/player',
            'playerWindow',
            'width=400,height=600,resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no'
        );
        
        if (playerWindow) {
            // Фокусируем новое окно
            playerWindow.focus();
        }
    };
    
    // Кнопка не отображается, если нет текущего трека
    if (!currentTrack) {
        return null;
    }
    
    return (
        <button 
            className={styles.popupButton} 
            onClick={openPlayerWindow}
            title="Открыть плеер в отдельном окне"
        >
            <svg 
                viewBox="0 0 24 24" 
                width="20" 
                height="20" 
                fill="currentColor"
                className={styles.popupIcon}
            >
                <path d="M18 7h4v2h-4v4h-2V9h-4V7h4V3h2v4zm-8 13H4v-6h2v4h4v2zm0-18H4v6h2V4h4V2z" />
            </svg>
            <span className={styles.tooltipText}>Отдельное окно</span>
        </button>
    );
};

export default PlayerPopupButton; 