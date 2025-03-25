import { API_URL } from '../config';

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
            cookies: document.cookie
        });

        const headers = new Headers(options.headers);

        if (!(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        const config: RequestInit = {
            ...options,
            headers,
            credentials: 'include',
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
                const error = await response.json().catch(() => ({ message: 'Произошла ошибка при выполнении запроса' }));
                throw new Error(error.message);
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