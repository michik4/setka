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
import MusicPage from './pages/MusicPage';
import { MusicAlbumPage } from './pages/MusicAlbumPage';
import { GroupsPage } from './pages/GroupsPage/GroupsPage';
import { GroupPage } from './pages/GroupPage/GroupPage';
import { TestModePage } from './pages/TestModePage';
import { UserSettingsPage } from './pages/UserSettingsPage/UserSettingsPage';
import { FriendsPage } from './pages/FriendsPage';
import MessagesPage from './pages/MessagesPage';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import RightSidebar from './components/RightSidebar/RightSidebar';
import { PlayerProvider, usePlayer } from './contexts/PlayerContext';
import { PlayerWindowProvider } from './contexts/PlayerWindowContext';
import { TestFeaturesProvider } from './contexts/TestFeaturesContext';
import { SidebarModulesProvider } from './contexts/SidebarModulesContext';
import { NotificationProvider } from './contexts/notification.context';
import { MessengerProvider } from './contexts/MessengerContext';
import { useTestFeatures } from './contexts/TestFeaturesContext';
import PlayerPage from './pages/Player';
import ContentMiniPlayer from './components/ContentMiniPlayer/ContentMiniPlayer';
import { GroupEditPage } from './pages/GroupEditPage/GroupEditPage';
import { GroupMembersPage } from './pages/GroupPage/GroupMembersPage';
import NotificationList from './components/Notifications';
import { QueueProvider } from './contexts/QueueContext';
import { AboutPage } from './pages/AboutPage/AboutPage';

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

// Компонент для условного отображения мини-плеера в контенте
const ResponsiveMiniPlayer: React.FC = () => {
  const [showInContent, setShowInContent] = useState(false);

  useEffect(() => {
    // Функция для обновления состояния при изменении размера окна
    const handleResize = () => {
      setShowInContent(window.innerWidth <= 1280);
    };

    // Проверка при загрузке
    handleResize();

    // Добавляем обработчик события изменения размера окна
    window.addEventListener('resize', handleResize);

    // Удаляем обработчик при размонтировании компонента
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!showInContent) {
    return null;
  }

  return <ContentMiniPlayer />;
};

// Компонент для кнопки переключения видимости правого сайдбара
const ToggleSidebarButton: React.FC<{ onClick: () => void, isVisible: boolean }> = ({ onClick, isVisible }) => {
  const { currentTrack, isPlaying } = usePlayer();
  
  return (
    <div className="toggle-sidebar-container">
      {currentTrack && isPlaying && <div className="playing-indicator"></div>}
      <button className="toggle-sidebar-btn" onClick={onClick} title={isVisible ? "Скрыть панель" : "Показать панель"}>
        {isVisible ? '→' : '←'}
      </button>
    </div>
  );
};

// Внутренний компонент App без контекста
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { isPlayerWindowEnabled, isMessengerEnabled } = useTestFeatures();
  const [playerWindowOpen, setPlayerWindowOpen] = useState<boolean>(false);
  const [rightSidebarVisible, setRightSidebarVisible] = useState<boolean>(true);

  // Проверяем, находимся ли мы на странице плеера
  const isPlayerPage = window.location.pathname === '/player';

  // Добавляем прослушиватель для обнаружения открытия плеера в отдельном окне
  useEffect(() => {
    // Если функция плеера в отдельном окне не включена, то не регистрируем обработчики
    if (!isPlayerWindowEnabled) {
      return;
    }

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
      const height = 650;
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
  }, [isPlayerWindowEnabled]);

  // Если мы на странице плеера, показываем только плеер
  if (isPlayerPage) {
    return (
      <Routes>
        <Route path="/player" element={<PlayerPageContainer />} />
      </Routes>
    );
  }

  const renderContent = () => {
    if (!user) {
      return <AuthPage />;
    }

    return (
      <div className={`main ${!rightSidebarVisible ? 'sidebar-hidden' : ''}`}>
        <Sidebar />
        <div className="content">
          <ResponsiveMiniPlayer />
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
              path="/settings"
              element={
                <ProtectedRoute>
                  <UserSettingsPage />
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
            <Route
              path="/music/albums/*"
              element={
                <ProtectedRoute>
                  <MusicAlbumPage key="musicAlbums" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <FriendsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends/:userId"
              element={
                <ProtectedRoute>
                  <FriendsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <GroupsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:id"
              element={
                <ProtectedRoute>
                  <GroupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:id/edit"
              element={
                <ProtectedRoute>
                  <GroupEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:id/members"
              element={
                <ProtectedRoute>
                  <GroupMembersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:id/admins"
              element={
                <ProtectedRoute>
                  <GroupMembersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-features"
              element={
                <ProtectedRoute>
                  <TestModePage />
                </ProtectedRoute>
              }
            />
            {isMessengerEnabled && (
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
            )}
            <Route
              path="/about"
              element={
                <ProtectedRoute>
                  <AboutPage />
                </ProtectedRoute> 
              }
            />
          </Routes>
        </div>
        <div className={rightSidebarVisible ? 'right-sidebar' : 'right-sidebar right-sidebar-hidden'}>
          <RightSidebar />
        </div>
        <ToggleSidebarButton 
          onClick={() => setRightSidebarVisible(!rightSidebarVisible)} 
          isVisible={rightSidebarVisible} 
        />
      </div>
    );
  };

  return (
    <div className="app">
      <Header />
      {renderContent()}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <QueueProvider>
          <PlayerProvider>
            <TestFeaturesProvider>
              <SidebarModulesProvider>
                <MessengerProvider>
                  <AppContent />
                  <NotificationList />
                </MessengerProvider>
              </SidebarModulesProvider>
            </TestFeaturesProvider>
          </PlayerProvider>
        </QueueProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
