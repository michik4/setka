declare namespace Express {
    export interface Request {
        user?: {
            id: number;
            email: string;
            firstName: string;
            lastName: string;
            // добавьте другие поля пользователя, если они нужны
        };
    }
} 