import { Request } from 'express'
import { User } from '../entities/user.entity'
import { Session } from '../entities/session.entity'

export interface AuthRequest extends Request {
    user?: User
    session?: Session
} 