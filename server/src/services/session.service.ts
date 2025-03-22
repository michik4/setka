import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { AppDataSource } from '../db/db_connect';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/user.entity';
import { MoreThan, LessThan, Not } from 'typeorm';

export class SessionService {
    private sessionRepository: Repository<Session>;

    constructor() {
        this.sessionRepository = AppDataSource.getRepository(Session);
    }

    async createSession(user: User, ipAddress: string, deviceInfo?: string): Promise<Session> {
        const session = new Session();
        session.sessionId = uuidv4();
        session.userId = user.id;
        session.ipAddress = ipAddress;
        session.deviceInfo = deviceInfo || '';
        session.lastActivity = new Date();
        session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
        session.isActive = true;

        return await this.sessionRepository.save(session);
    }

    async getActiveSessionsByUserId(userId: number): Promise<Session[]> {
        return await this.sessionRepository.find({
            where: {
                userId,
                isActive: true,
                expiresAt: MoreThan(new Date())
            }
        });
    }

    async validateSession(sessionId: string): Promise<Session | null> {
        const session = await this.sessionRepository.findOne({
            where: {
                sessionId,
                isActive: true,
                expiresAt: MoreThan(new Date())
            }
        });

        if (session) {
            session.lastActivity = new Date();
            await this.sessionRepository.save(session);
        }

        return session;
    }

    async deactivateSession(sessionId: string): Promise<void> {
        await this.sessionRepository.update(
            { sessionId },
            { isActive: false }
        );
    }

    async deactivateAllUserSessions(userId: number, exceptSessionId?: string): Promise<void> {
        const query = {
            userId,
            isActive: true
        };
        
        if (exceptSessionId) {
            Object.assign(query, { sessionId: Not(exceptSessionId) });
        }

        await this.sessionRepository.update(
            query,
            { isActive: false }
        );
    }

    async cleanupExpiredSessions(): Promise<void> {
        await this.sessionRepository.update(
            {
                expiresAt: LessThan(new Date()),
                isActive: true
            },
            { isActive: false }
        );
    }
} 