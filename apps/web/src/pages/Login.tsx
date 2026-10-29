import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { Role } from '@shared';
import { api } from '../lib/api';

const ROLE_INFO: Record<Role, { emoji: string; title: string; desc: string }> = {
  dom: { emoji: '🗝️', title: 'Dom/Top', desc: 'Guías, encargas tareas y acompañas a una o más personas.' },
  sub: { emoji: '🌷', title: 'Sum/Bottom', desc: 'Recibes encargos, construyes rachas y compartes tu diario.' },
  switch: { emoji: '🌗', title: 'Solo/Switch', desc: 'Te asignas tus propias tareas, rachas y recompensas.' },
};

export function LoginPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('modo') === 'registro' ? 'register' : 'login');
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '', role: 'sub' as Role });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await api('/auth/login', { body: { username: form.username, password: form.password } });
      } else {
        await api('/auth/register', {
          body: { ...form, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        });
      }
      await qc.invalidateQueries({ queryKey: ['me'] });
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth-photo">
        <img src="/img/hand-sheets.jpg" alt="" />
        <Link to="/" className="wordmark">
          daily<i>tracker</i>
        </Link>
        <div className="copy">
          <p className="eyebrow" style={{ color: 'rgba(255,255,255,.75)', marginBottom: 22 }}>
            Rituales compartidos
          </p>
          <h2>
            La constancia también
            <br />
            <em>es una forma de cariño.</em>
          </h2>
        </div>
      </aside>
      <div className="auth-form">
        <Link to="/" className="wordmark">
          daily<i>tracker</i>
        </Link>
        <h1>{mode === 'login' ? <>Hola de <em>nuevo.</em></> : <>Crea tu <em>espacio.</em></>}</h1>
        <p className="muted serif" style={{ margin: '12px 0 32px', fontSize: '1.3rem', lineHeight: 1.4 }}>
          {mode === 'login' ? 'Tus rituales te están esperando.' : 'Un lugar suave para tus rutinas, rachas y reflexiones.'}
        </p>

        <form className="stack lg" onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <span>¿Cómo vives esta dinámica?</span>
              <div className="role-cards" role="group">
                {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
                  <button type="button" key={r} className="role-card" aria-pressed={form.role === r} onClick={() => setForm({ ...form, role: r })}>
                    <span>
                      <b>{ROLE_INFO[r].title}</b>
                      <small>{ROLE_INFO[r].desc}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="field">
            <span>{mode === 'login' ? 'Usuario o correo' : 'Usuario'}</span>
            <input className="input" value={form.username} onChange={set('username')} autoComplete="username" required />
          </label>
          {mode === 'register' && (
            <>
              <label className="field">
                <span>Nombre para mostrar</span>
                <input className="input" value={form.displayName} onChange={set('displayName')} required maxLength={60} />
              </label>
              <label className="field">
                <span>Correo</span>
                <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              </label>
            </>
          )}
          <label className="field">
            <span>Contraseña</span>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
            {mode === 'register' && <span className="hint">Mínimo 8 caracteres.</span>}
          </label>

          {error && <p className="form-error">{error}</p>}
          <button className="btn block" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="small muted" style={{ marginTop: 28 }}>
          {mode === 'login' ? '¿Primera vez aquí? ' : '¿Ya tienes cuenta? '}
          <button
            className="link-btn"
            style={{ marginLeft: 8, color: 'var(--ink)' }}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
