import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import { users } from '../db/schema.js';
import { HttpError } from './http.js';

export const SESSION_COOKIE = 'dt_session';
const MAX_AGE_DAYS = 7;

export type SessionUser = typeof users.$inferSelect;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: SessionUser;
    }
  }
}

export function setSession(res: Response, secret: string, userId: number, secure: boolean) {
  const token = jwt.sign({ uid: userId }, secret, { expiresIn: `${MAX_AGE_DAYS}d` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: MAX_AGE_DAYS * 86400_000,
    path: '/',
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function requireAuth(db: DB, secret: string): RequestHandler {
  return (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new HttpError(401, 'Sesión requerida');
    let uid: number;
    try {
      uid = (jwt.verify(token, secret) as { uid: number }).uid;
    } catch {
      throw new HttpError(401, 'Sesión expirada');
    }
    const user = db.select().from(users).where(eq(users.id, uid)).get();
    if (!user) throw new HttpError(401, 'Sesión inválida');
    req.user = user;
    next();
  };
}

export function publicUser(u: SessionUser) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}
