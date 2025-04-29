"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    CLIENT_URL: /*process.env.CLIENT_URL || */ 'http://localhost:3001',
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 5432,
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    DB_DATABASE: process.env.DB_DATABASE || 'setka',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    NODE_ENV: process.env.NODE_ENV || 'development'
};
