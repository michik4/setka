import React, { useEffect } from 'react';
import { PlayerProvider, usePlayer } from '../../contexts/PlayerContext';
import { PlayerWindowProvider } from '../../contexts/PlayerWindowContext';
import PlayerWindow from './PlayerWindow';
import './style.css';

// Основной компонент страницы плеера
const PlayerPage: React.FC = () => {
  // Устанавливаем этот экземпляр как источник звука при загрузке страницы
  useEffect(() => {
    // Устанавливаем метку открытия окна плеера
    localStorage.setItem('player_window_opened', Date.now().toString());
    
    // При закрытии окна устанавливаем метку закрытия
    const handleBeforeUnload = () => {
      localStorage.setItem('player_window_closed', Date.now().toString());
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Также устанавливаем метку закрытия при размонтировании компонента
      localStorage.setItem('player_window_closed', Date.now().toString());
    };
  }, []);

  return (
    <PlayerProvider>
      <PlayerWindowProvider>
        <PlayerWindow />
      </PlayerWindowProvider>
    </PlayerProvider>
  );
};

export default PlayerPage; 