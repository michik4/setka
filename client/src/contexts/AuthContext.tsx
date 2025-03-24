import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { socketService } from '../services/socket.service';
import { Socket } from 'socket.io-client';

interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
}

interface AuthError {
    message: string;
}

interface AuthResponse {
    user: User;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
    checkAuth: () => Promise<void>;
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
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const initializationRef = useRef<boolean>(false);
    const initializationPromise = useRef<Promise<Socket> | null>(null);

    // Сохраняем пользователя в localStorage при изменении
    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const initializeSocket = async () => {
        // Если уже есть активное подключение, возвращаем его
        if (isInitialized && socket) {
            return socket;
        }

        // Если уже идет процесс инициализации, возвращаем существующий промис
        if (initializationPromise.current) {
            return initializationPromise.current;
        }

        // Создаем новый промис для инициализации
        initializationPromise.current = (async () => {
            try {
                console.log('Начинаем инициализацию WebSocket');
                setIsInitializing(true);
                initializationRef.current = true;

                const newSocket = await socketService.connectAndWait();
                
                setSocket(newSocket);
                setIsInitialized(true);
                setError(null);
                
                return newSocket;
            } catch (error) {
                console.error('Ошибка при инициализации WebSocket:', error);
                setError('Ошибка подключения к серверу');
                throw error;
            } finally {
                setIsInitializing(false);
                initializationRef.current = false;
                initializationPromise.current = null;
            }
        })();

        return initializationPromise.current;
    };

    useEffect(() => {
        const init = async () => {
            try {
                if (!user) return; // Не инициализируем сокет, если нет пользователя
                
                const socket = await initializeSocket();
                // Аутентифицируем только если сокет не был аутентифицирован ранее
                if (!socket.connected || !socket.auth) {
                    await socketService.authenticate(user.id);
                }
            } catch (error) {
                console.error('Ошибка при инициализации:', error);
                setUser(null);
            }
        };

        init();

        return () => {
            if (socket) {
                socket.removeAllListeners();
                socketService.disconnect();
            }
        };
    }, [user]);

    const waitForConnection = async (): Promise<Socket> => {
        if (socket?.connected) return socket;
        
        try {
            return await initializeSocket();
        } catch (error) {
            console.error('Ошибка при ожидании подключения:', error);
            throw new Error('WebSocket не инициализирован');
        }
    };

    const register = useCallback(async (firstName: string, lastName: string, email: string, password: string) => {
        console.log('Начинаем регистрацию...');
        setLoading(true);
        setError(null);

        try {
            const connectedSocket = await waitForConnection();
            
            return new Promise<void>((resolve, reject) => {
                console.log('Отправляем запрос на регистрацию');
                connectedSocket.emit('register', { firstName, lastName, email, password });

                const timeout = setTimeout(() => {
                    console.log('Превышено время ожидания ответа');
                    reject(new Error('Превышено время ожидания ответа от сервера. Пожалуйста, проверьте подключение к интернету и попробуйте снова.'));
                    setLoading(false);
                }, 5000);

                const handleSuccess = (data: AuthResponse) => {
                    console.log('Получен успешный ответ на регистрацию:', data);
                    clearTimeout(timeout);
                    setUser(data.user);
                    socketService.authenticate(data.user.id); // Аутентифицируем сокет после регистрации
                    setLoading(false);
                    connectedSocket.off('auth_success', handleSuccess);
                    connectedSocket.off('auth_error', handleError);
                    resolve();
                };

                const handleError = (error: AuthError) => {
                    console.log('Получена ошибка при регистрации:', error);
                    clearTimeout(timeout);
                    setError(error.message);
                    setLoading(false);
                    connectedSocket.off('auth_success', handleSuccess);
                    connectedSocket.off('auth_error', handleError);
                    reject(new Error(error.message));
                };

                connectedSocket.on('auth_success', handleSuccess);
                connectedSocket.on('auth_error', handleError);
            });
        } catch (error) {
            setLoading(false);
            setError('Ошибка подключения к серверу');
            throw error;
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        console.log('Начинаем процесс входа...');
        setLoading(true);
        setError(null);

        try {
            const connectedSocket = await waitForConnection();
            console.log('Соединение установлено, отправляем данные для входа');

            return new Promise<void>((resolve, reject) => {
                connectedSocket.emit('login', { email, password });

                const timeout = setTimeout(() => {
                    console.error('Превышено время ожидания ответа от сервера');
                    reject(new Error('Превышено время ожидания ответа от сервера. Пожалуйста, проверьте подключение к интернету и попробуйте снова.'));
                    setLoading(false);
                }, 5000);

                const handleSuccess = (data: AuthResponse) => {
                    console.log('Получен успешный ответ при входе:', data);
                    clearTimeout(timeout);
                    setUser(data.user);
                    socketService.authenticate(data.user.id); // Аутентифицируем сокет после входа
                    setLoading(false);
                    setError(null);
                    connectedSocket.off('auth_success', handleSuccess);
                    connectedSocket.off('auth_error', handleError);
                    resolve();
                };

                const handleError = (error: AuthError) => {
                    console.error('Получена ошибка при входе:', error);
                    clearTimeout(timeout);
                    setError(error.message);
                    setUser(null);
                    setLoading(false);
                    connectedSocket.off('auth_success', handleSuccess);
                    connectedSocket.off('auth_error', handleError);
                    reject(new Error(error.message));
                };

                connectedSocket.on('auth_success', handleSuccess);
                connectedSocket.on('auth_error', handleError);
            });
        } catch (error) {
            console.error('Ошибка при подключении к серверу:', error);
            setLoading(false);
            setError('Ошибка подключения к серверу');
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const connectedSocket = await waitForConnection();

            return new Promise<void>((resolve, reject) => {
                connectedSocket.emit('logout');

                const timeout = setTimeout(() => {
                    reject(new Error('Превышено время ожидания ответа от сервера. Пожалуйста, проверьте подключение к интернету и попробуйте снова.'));
                    setLoading(false);
                }, 5000);

                const handleSuccess = () => {
                    clearTimeout(timeout);
                    setUser(null); // Это автоматически очистит localStorage
                    setLoading(false);
                    connectedSocket.off('logout_success', handleSuccess);
                    connectedSocket.off('logout_error', handleError);
                    resolve();
                };

                const handleError = (error: AuthError) => {
                    clearTimeout(timeout);
                    setError(error.message);
                    setLoading(false);
                    connectedSocket.off('logout_success', handleSuccess);
                    connectedSocket.off('logout_error', handleError);
                    reject(new Error(error.message));
                };

                connectedSocket.on('logout_success', handleSuccess);
                connectedSocket.on('logout_error', handleError);
            });
        } catch (error) {
            setLoading(false);
            setError('Ошибка подключения к серверу');
            throw error;
        }
    }, []);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const connectedSocket = await waitForConnection();
            const savedUser = localStorage.getItem('user');
            const userId = savedUser ? JSON.parse(savedUser).id : null;

            if (!userId) {
                setError('Пользователь не аутентифицирован');
                setLoading(false);
                return;
            }

            return new Promise<void>((resolve, reject) => {
                connectedSocket.emit('check_auth', userId);

                const timeout = setTimeout(() => {
                    reject(new Error('Превышено время ожидания ответа от сервера. Пожалуйста, проверьте подключение к интернету и попробуйте снова.'));
                    setLoading(false);
                }, 5000);

                const handleSuccess = (data: AuthResponse) => {
                    clearTimeout(timeout);
                    setUser(data.user);
                    socketService.authenticate(data.user.id);
                    setLoading(false);
                    connectedSocket.off('auth_success', handleSuccess);
                    connectedSocket.off('auth_error', handleError);
                    resolve();
                };

                const handleError = (error: AuthError) => {
                    clearTimeout(timeout);
                    setError(error.message);
                    setUser(null); // Очищаем данные пользователя при ошибке аутентификации
                    setLoading(false);
                    connectedSocket.off('auth_success', handleSuccess);
                    connectedSocket.off('auth_error', handleError);
                    reject(new Error(error.message));
                };

                connectedSocket.on('auth_success', handleSuccess);
                connectedSocket.on('auth_error', handleError);
            });
        } catch (error) {
            setLoading(false);
            setError('Ошибка подключения к серверу');
            setUser(null); // Очищаем данные пользователя при ошибке подключения
            throw error;
        }
    }, []);

    const value = {
        user,
        loading: loading || isInitializing,
        error,
        login,
        logout,
        register,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 