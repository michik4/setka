import { useEffect, ReactNode, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';
import './App.css';
import { AuthPage } from './pages/AuthPage';
import { FeedPage } from './pages/FeedPage';
import { UserPage } from './pages/UserPage/UserPage';
import { PhotosPage } from './pages/PhotosPage';
import { AlbumPage } from './pages/AlbumPage';
import { MusicPage } from './pages/MusicPage';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import { PlayerProvider } from './contexts/PlayerContext';
import { PlayerWindowProvider } from './contexts/PlayerWindowContext';
import PlayerPage from './pages/Player';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app">
        <Header />
        <div className="main">
          <div className="content">
            <div className="loading">Загрузка...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Компонент для страницы плеера в отдельном окне
const PlayerPageContainer: React.FC = () => {
  // Устанавливаем флаг открытия окна плеера
  useEffect(() => {
    // Устанавливаем флаг открытия окна плеера
    localStorage.setItem('player_window_opened', Date.now().toString());
    console.log('Окно плеера открыто, установлена метка:', Date.now().toString());
    
    // При закрытии окна плеера
    const handleUnload = () => {
      const timestamp = Date.now().toString();
      localStorage.setItem('player_window_closed', timestamp);
      console.log('Окно плеера закрыто, установлена метка:', timestamp);
    };
    
    window.addEventListener('unload', handleUnload);
    
    // Через небольшую задержку проверяем и делаем окно плеера мастером
    setTimeout(() => {
      const { becomeMasterPlayer } = window.playerApi || {};
      if (typeof becomeMasterPlayer === 'function') {
        console.log('Окно плеера становится мастером');
        becomeMasterPlayer();
      } else {
        console.warn('Функция becomeMasterPlayer недоступна');
      }
    }, 500);
    
    return () => {
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  return (
    <PlayerWindowProvider>
      <PlayerPage />
    </PlayerWindowProvider>
  );
};

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [playerWindowOpen, setPlayerWindowOpen] = useState<boolean>(false);

  // Проверяем, находимся ли мы на странице плеера
  const isPlayerPage = window.location.pathname === '/player';

  // Добавляем прослушиватель для обнаружения открытия плеера в отдельном окне
  useEffect(() => {
    // Добавляем обработчик события хранилища для коммуникации между окнами
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'player_window_opened') {
        setPlayerWindowOpen(true);
      } else if (event.key === 'player_window_closed') {
        setPlayerWindowOpen(false);
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    // Проверяем, есть ли уже открытое окно плеера
    const checkPlayerWindowState = () => {
      const playerWindowTimestamp = localStorage.getItem('player_window_opened');
      const playerWindowClosed = localStorage.getItem('player_window_closed');
      
      // Проверяем наличие обоих значений
      if (playerWindowTimestamp && playerWindowClosed) {
        // Преобразуем строки в числа для корректного сравнения
        const openedTime = parseInt(playerWindowTimestamp);
        const closedTime = parseInt(playerWindowClosed);
        
        // Проверяем, что временная метка открытия новее, чем метка закрытия
        if (openedTime > closedTime) {
          setPlayerWindowOpen(true);
        } else {
          setPlayerWindowOpen(false);
        }
      } else if (playerWindowTimestamp && !playerWindowClosed) {
        // Есть только метка открытия - окно открыто
        setPlayerWindowOpen(true);
      } else {
        // Нет метки открытия или есть только метка закрытия - окно закрыто
        setPlayerWindowOpen(false);
      }
    };
    
    // Проверяем состояние при загрузке
    checkPlayerWindowState();
    
    // Установим интервал для периодической проверки состояния
    const checkInterval = setInterval(checkPlayerWindowState, 5000);

    // При открытии плеера в новом окне (добавляем только обработчик)
    const handleNewWindowClick = () => {
      // Открываем новое окно через открытие ссылки
      const width = 550;
      const height = 630;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        '/player',
        'MusicPlayer',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
      );
      
      // Устанавливаем флаг открытия
      localStorage.setItem('player_window_opened', Date.now().toString());
    };

    // Находим все кнопки открытия плеера в новом окне и добавляем обработчик
    document.querySelectorAll('.newWindowButton').forEach(btn => {
      btn.addEventListener('click', handleNewWindowClick);
    });

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      document.querySelectorAll('.newWindowButton').forEach(btn => {
        btn.removeEventListener('click', handleNewWindowClick);
      });
      clearInterval(checkInterval);
    };
  }, []);

  // Если мы на странице плеера, показываем только плеер
  if (isPlayerPage) {
    return (
      <BrowserRouter>
        <PlayerProvider>
          <Routes>
            <Route path="/player" element={<PlayerPageContainer />} />
          </Routes>
        </PlayerProvider>
      </BrowserRouter>
    );
  }

  const renderContent = () => {
    if (!user) {
      return <AuthPage />;
    }

    return (
      <div className="main">
        <Sidebar />
        <div className="content">
          {playerWindowOpen && (
            <div className="player-window-notification">
              Плеер открыт в отдельном окне
              <div className="notification-indicator"></div>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <FeedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:userId"
              element={
                <ProtectedRoute>
                  <UserPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:userId/photos"
              element={
                <ProtectedRoute>
                  <PhotosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/albums/:albumId"
              element={
                <ProtectedRoute>
                  <AlbumPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:userId/music"
              element={
                <ProtectedRoute>
                  <MusicPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/music"
              element={
                <ProtectedRoute>
                  <MusicPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <PlayerProvider>
        <div className="app">
          <Header />
          {renderContent()}
        </div>
      </PlayerProvider>
    </BrowserRouter>
  );
};

export default App;
