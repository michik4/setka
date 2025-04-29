// Изменения для клиентской части для использования токенов вместо cookie

// 1. Создайте отдельный файл для работы с токенами в client/src/utils/tokenStorage.ts:

// Код для client/src/utils/tokenStorage.ts:
```typescript
// Ключ для хранения токена в localStorage
const TOKEN_KEY = 'auth_token';

/**
 * Сохраняет токен аутентификации в localStorage
 * @param token Токен для сохранения
 */
export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Получает токен аутентификации из localStorage
 * @returns Токен или null, если токен не найден
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Удаляет токен аутентификации из localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Проверяет, есть ли сохраненный токен
 * @returns true, если токен существует, иначе false
 */
export const hasToken = (): boolean => {
  return !!getToken();
};
```

// 2. Обновите файл client/src/utils/api.ts для использования токена:

// Изменения в api.ts
```typescript
import { API_URL } from '../config/constants';
import { getToken } from './tokenStorage';

interface FetchOptions extends RequestInit {
    body?: any;
}

export const api = {
    async fetch(endpoint: string, options: FetchOptions = {}) {
        const url = `${API_URL}${endpoint}`;
        console.log('API Request:', {
            url,
            method: options.method || 'GET',
            body: options.body,
            hasToken: !!getToken()
        });

        const headers = new Headers(options.headers);

        if (!(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }
        
        // Добавляем токен в заголовок, если он есть
        const token = getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const config: RequestInit = {
            ...options,
            headers,
            credentials: 'include', // Можно оставить для обратной совместимости
        };

        if (options.body && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        } else if (options.body instanceof FormData) {
            config.body = options.body;
        }

        try {
            const response = await fetch(url, config);
            console.log('API Response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Произошла ошибка при выполнении запроса' }));
                console.error('API Error Response:', errorData);
                throw new Error(errorData.error || errorData.message || 'Произошла ошибка при выполнении запроса');
            }

            if (response.status === 204) {
                return null;
            }

            const responseData = await response.json();
            console.log('API Response Data:', responseData);
            return responseData;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint: string, options: FetchOptions = {}) {
        return this.fetch(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint: string, body: any, options: FetchOptions = {}) {
        return this.fetch(endpoint, { ...options, method: 'POST', body });
    },

    put(endpoint: string, body: any, options: FetchOptions = {}) {
        return this.fetch(endpoint, { ...options, method: 'PUT', body });
    },

    delete(endpoint: string, options: FetchOptions = {}) {
        return this.fetch(endpoint, { ...options, method: 'DELETE' });
    },
};
```

// 3. Обновите файл client/src/contexts/AuthContext.tsx для работы с токенами:

// Изменения в AuthContext.tsx
```typescript
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { socketService } from '../services/socket.service';
import { api } from '../utils/api';
import { saveToken, removeToken, hasToken } from '../utils/tokenStorage';
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
                // Проверяем, есть ли сохраненный токен
                if (hasToken()) {
                    const response = await api.get('/auth/me');
                    setUser(response);
                    
                    // После успешной проверки сессии подключаем WebSocket
                    if (response) {
                        await socketService.connectAndWait();
                        await socketService.authenticate(response.id);
                    }
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('Ошибка при проверке сессии:', err);
                setUser(null);
                removeToken(); // Удаляем токен, если он недействителен
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

            // Если сервер вернул токен, сохраняем его
            if (response.token) {
                saveToken(response.token);
            }

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
            // Удаляем токен при выходе
            removeToken();
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