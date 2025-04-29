import { Request } from 'express'
import { User } from '../entities/user.entity'
import { Session } from '../entities/session.entity'

export interface AuthRequest extends Request {
    user?: User
    session?: Session
    sessionId?: string
}

export interface AuthenticatedRequest extends Request {
    user: User
    sessionId?: string
} 