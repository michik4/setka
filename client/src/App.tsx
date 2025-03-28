import { useEffect, ReactNode } from 'react';
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
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';

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

const App: React.FC = () => {
  const { user, loading } = useAuth();

  const renderContent = () => {
    if (!user) {
      return <AuthPage />;
    }

    return (
      <div className="main">
        <Sidebar />
        <div className="content">
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
          </Routes>
        </div>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        {renderContent()}
      </div>
    </BrowserRouter>
  );
};

export default App;
