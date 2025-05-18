export const config = {
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3001',
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || 'localhost',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 5432,
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '!CvBn3228',
    DB_DATABASE: process.env.DB_DATABASE || 'vseti',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    NODE_ENV: process.env.NODE_ENV || 'development'
}; 