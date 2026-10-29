import type { ReactNode } from 'react';
import { Lock, Users } from '@phosphor-icons/react';
import { TIER_LABELS, type Tier } from '@shared';

export function Avatar({ name, size }: { name: string; size?: 'lg' }) {
  return (
    <div className={`avatar ${size ?? ''}`} aria-hidden>
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function Empty({ emoji, title, children }: { emoji?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {emoji && <span className="emoji">{emoji}</span>}
      <p className="title">{title}</p>
      {children && <div className="small" style={{ marginTop: 6 }}>{children}</div>}
    </div>
  );
}

/** Moneda de racha (bronce, plata, oro). */
export function Medal({ tier, locked, size, label }: { tier: Tier; locked?: boolean; size?: 'md' | 'lg'; label?: ReactNode }) {
  return (
    <span className={`coin ${locked ? 'locked' : tier} ${size ?? ''}`} title={`Racha ${TIER_LABELS[tier]}`}>
      {label}
    </span>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Cargando" />;
}

export function VisibilityChip({ visibility }: { visibility: 'private' | 'shared' }) {
  return visibility === 'shared' ? (
    <span className="tag sage">
      <Users size={11} weight="bold" /> Compartida
    </span>
  ) : (
    <span className="tag">
      <Lock size={11} weight="bold" /> Privada
    </span>
  );
}

export function PointsPill({ value, label = 'puntos' }: { value: number; label?: string }) {
  return (
    <span className="points-pill">
      <b>{value}</b> {label}
    </span>
  );
}

/** Cabecera rosa de cada página: antetítulo, título serif grande, línea gruesa y pie (estadísticas o acciones). */
export function PageBand({
  eyebrow,
  title,
  lede,
  children,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="band">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      <div className="band-rule" />
      <div className="band-foot">
        {children}
        {actions && <div className="band-actions">{actions}</div>}
      </div>
    </section>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function SectionTitle({ n, title, count, children }: { n?: number; title: string; count?: ReactNode; children?: ReactNode }) {
  return (
    <div className="sec-title">
      {n !== undefined && <span className="n">{String(n).padStart(2, '0')}.</span>}
      <h2>{title}</h2>
      {count !== undefined && <span className="count">{count}</span>}
      {children}
    </div>
  );
}
