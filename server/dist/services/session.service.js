"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const session_entity_1 = require("../entities/session.entity");
const db_connect_1 = require("../db/db_connect");
const uuid_1 = require("uuid");
const typeorm_1 = require("typeorm");
class SessionService {
    constructor() {
        this.sessionRepository = db_connect_1.AppDataSource.getRepository(session_entity_1.Session);
    }
    async createSession(user, ipAddress, deviceInfo) {
        const session = new session_entity_1.Session();
        session.sessionId = (0, uuid_1.v4)();
        session.userId = user.id;
        session.ipAddress = ipAddress;
        session.deviceInfo = deviceInfo || '';
        session.lastActivity = new Date();
        session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
        session.isActive = true;
        return await this.sessionRepository.save(session);
    }
    async getActiveSessionsByUserId(userId) {
        return await this.sessionRepository.find({
            where: {
                userId,
                isActive: true,
                expiresAt: (0, typeorm_1.MoreThan)(new Date())
            }
        });
    }
    async validateSession(sessionId) {
        console.log('Проверка сессии:', sessionId);
        const session = await this.sessionRepository.findOne({
            where: {
                sessionId,
                isActive: true,
                expiresAt: (0, typeorm_1.MoreThan)(new Date())
            }
        });
        console.log('Найдена сессия:', session);
        if (session) {
            console.log('Обновление времени последней активности для сессии:', sessionId);
            session.lastActivity = new Date();
            await this.sessionRepository.save(session);
            console.log('Сессия обновлена');
        }
        else {
            console.log('Сессия не найдена или неактивна');
        }
        return session;
    }
    async deactivateSession(sessionId) {
        await this.sessionRepository.update({ sessionId }, { isActive: false });
    }
    async deactivateAllUserSessions(userId, exceptSessionId) {
        const query = {
            userId,
            isActive: true
        };
        if (exceptSessionId) {
            Object.assign(query, { sessionId: (0, typeorm_1.Not)(exceptSessionId) });
        }
        await this.sessionRepository.update(query, { isActive: false });
    }
    async cleanupExpiredSessions() {
        await this.sessionRepository.update({
            expiresAt: (0, typeorm_1.LessThan)(new Date()),
            isActive: true
        }, { isActive: false });
    }
}
exports.SessionService = SessionService;
