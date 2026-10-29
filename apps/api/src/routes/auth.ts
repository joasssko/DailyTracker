import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { eq, or } from 'drizzle-orm';
import { loginSchema, profileSchema, registerSchema } from '@shared';
import type { AppCtx } from '../ctx.js';
import { users } from '../db/schema.js';
import { clearSession, publicUser, requireAuth, setSession } from '../lib/auth.js';
import { badRequest, conflict, HttpError } from '../lib/http.js';
import { balanceOf } from '../domain/points.js';
import { activeDomOf, getUser } from '../lib/authz.js';

function validTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function authRoutes(ctx: AppCtx) {
  const { db, secret } = ctx;
  const r = Router();
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

  r.post('/register', limiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const timezone = input.timezone && validTimezone(input.timezone) ? input.timezone : 'America/Santiago';
    const taken = db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, input.username), eq(users.email, input.email.toLowerCase())))
      .get();
    if (taken) throw conflict('Ese usuario o correo ya está registrado');

    const user = db
      .insert(users)
      .values({
        username: input.username,
        email: input.email.toLowerCase(),
        passwordHash: await bcrypt.hash(input.password, 11),
        displayName: input.displayName,
        role: input.role,
        timezone,
      })
      .returning()
      .get();
    setSession(res, secret, user.id, ctx.secureCookies, input.remember);
    res.status(201).json({ user: publicUser(user) });
  });

  r.post('/login', limiter, async (req, res) => {
    const { username, password, remember } = loginSchema.parse(req.body);
    const user = db
      .select()
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, username.toLowerCase())))
      .get();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Usuario o contraseña incorrectos');
    }
    setSession(res, secret, user.id, ctx.secureCookies, remember);
    res.json({ user: publicUser(user) });
  });

  r.post('/logout', (_req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  const auth = requireAuth(db, secret, ctx.secureCookies);

  r.get('/me', auth, (req, res) => {
    const domId = req.user.role === 'sub' ? activeDomOf(db, req.user.id) : null;
    const dom = domId ? publicUser(getUser(db, domId)) : null;
    res.json({ user: publicUser(req.user), balance: balanceOf(db, req.user.id), dom });
  });

  r.patch('/me', auth, (req, res) => {
    const input = profileSchema.parse(req.body);
    if (input.timezone && !validTimezone(input.timezone)) throw badRequest('Zona horaria inválida');
    const user = db.update(users).set(input).where(eq(users.id, req.user.id)).returning().get();
    res.json({ user: publicUser(user) });
  });

  return r;
}
