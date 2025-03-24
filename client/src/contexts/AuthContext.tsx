import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { socketService } from '../services/socket.service';
import { api } from '../utils/api';
import { AuthUser } from '../types/user.types';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Проверяем сессию при загрузке приложения
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await api.get('/auth/me');
                setUser(response);
                
                // После успешной проверки сессии подключаем WebSocket
                if (response) {
                    await socketService.connectAndWait();
                    await socketService.authenticate(response.id);
                }
            } catch (err) {
                console.error('Ошибка при проверке сессии:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        return () => {
            socketService.disconnect();
        };
    }, []);

    const register = useCallback(async (firstName: string, lastName: string, email: string, password: string) => {
        console.log('Начинаем регистрацию...');
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/users', {
                firstName,
                lastName,
                email,
                password
            });

            // После успешной регистрации выполняем вход
            await login(email, password);
        } catch (error: any) {
            setError(error.message || 'Ошибка при регистрации');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        console.log('Начинаем процесс входа...');
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

            setUser(response);
            
            // После успешного входа подключаем WebSocket
            await socketService.connectAndWait();
            await socketService.authenticate(response.id);
        } catch (error: any) {
            setError(error.message || 'Ошибка при входе');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await api.post('/auth/logout', {});
            setUser(null);
            
            // Отключаем WebSocket при выходе
            socketService.disconnect();
        } catch (error: any) {
            setError(error.message || 'Ошибка при выходе');
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        register
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 