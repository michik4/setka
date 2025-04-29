export interface User {
    id: number;
    firstName: string;
    lastName: string;
    nickname: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoginResponse {
    token: string;
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    nickname?: string;
}

export interface RegisterResponse {
    token: string;
    message: string;
    user: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
    };
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
    checkAuth: () => Promise<void>;
} 