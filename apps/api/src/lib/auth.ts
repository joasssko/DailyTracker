import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import { users } from '../db/schema.js';
import { HttpError } from './http.js';

export const SESSION_COOKIE = 'dt_session';
/** Sesión normal (sin "Recuérdame"). */
const SHORT_DAYS = 7;
/** Sesión con "Recuérdame" o desde la app instalada. Se renueva sola mientras se use. */
export const LONG_DAYS = 180;
/** Cada cuánto se renueva la cookie de una sesión activa. */
const RENEW_AFTER_MS = 86400_000;

type Claims = { uid: number; rem?: boolean; iat?: number };

export type SessionUser = typeof users.$inferSelect;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: SessionUser;
    }
  }
}

export function setSession(res: Response, secret: string, userId: number, secure: boolean, remember = false) {
  const days = remember ? LONG_DAYS : SHORT_DAYS;
  const token = jwt.sign({ uid: userId, rem: remember }, secret, { expiresIn: `${days}d` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: days * 86400_000,
    path: '/',
  });
}

export function clearSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function requireAuth(db: DB, secret: string, secure: boolean): RequestHandler {
  return (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new HttpError(401, 'Sesión requerida');
    let claims: Claims;
    try {
      claims = jwt.verify(token, secret) as Claims;
    } catch {
      throw new HttpError(401, 'Sesión expirada');
    }
    const user = db.select().from(users).where(eq(users.id, claims.uid)).get();
    if (!user) throw new HttpError(401, 'Sesión inválida');
    // Renovación deslizante: mientras se use la app, la sesión no caduca.
    if (claims.iat && Date.now() - claims.iat * 1000 > RENEW_AFTER_MS) {
      setSession(res, secret, user.id, secure, !!claims.rem);
    }
    req.user = user;
    next();
  };
}

export function publicUser(u: SessionUser) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}
