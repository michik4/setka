import { API_URL } from '../config/constants';

interface FetchOptions extends RequestInit {
    body?: any;
}

// Функции для работы с токеном
const TOKEN_KEY = 'auth_token';

export const tokenService = {
    getToken: (): string | null => {
        return localStorage.getItem(TOKEN_KEY);
    },
    
    setToken: (token: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
    },
    
    removeToken: (): void => {
        localStorage.removeItem(TOKEN_KEY);
    }
};

export const api = {
    async fetch(endpoint: string, options: FetchOptions = {}) {
        const url = `${API_URL}${endpoint}`;
        console.log('API Request:', {
            url,
            method: options.method || 'GET',
            body: options.body,
        });

        const headers = new Headers(options.headers);

        if (!(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }
        
        // Добавляем токен в заголовок Authorization если он есть
        const token = tokenService.getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const config: RequestInit = {
            ...options,
            headers,
            // Удаляем credentials: 'include', так как теперь используем токены, а не куки
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