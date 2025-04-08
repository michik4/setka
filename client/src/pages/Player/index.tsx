import React from 'react';
import { PlayerProvider } from '../../contexts/PlayerContext';
import { PlayerWindowProvider } from '../../contexts/PlayerWindowContext';
import PlayerWindow from './PlayerWindow';

// Основной компонент страницы плеера
const PlayerPage: React.FC = () => {
  return (
    <PlayerProvider>
      <PlayerWindowProvider>
        <PlayerWindow />
      </PlayerWindowProvider>
    </PlayerProvider>
  );
};

export default PlayerPage; 