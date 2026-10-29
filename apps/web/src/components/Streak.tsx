import { addDays, TIER_LABELS, TIERS } from '@shared';
import type { TaskView } from '../lib/types';
import { Medal } from './Bits';

/** Monedas, línea de progreso y texto hacia la próxima medalla. */
export function StreakProgress({ task }: { task: TaskView }) {
  const s = task.streak;
  if (!s) return null;
  const goal = s.next ? s.thresholds[s.next.tier] : s.thresholds.gold;
  const pct = Math.min(100, (s.current / goal) * 100);
  return (
    <div className="streak">
      <span className="coins">
        {TIERS.map((t) => (
          <Medal key={t} tier={t} locked={s.current < s.thresholds[t]} />
        ))}
      </span>
      <span className="streak-bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="streak-text">
        {s.current === 0
          ? `Empieza hoy · ${s.thresholds.bronze} días para bronce`
          : s.next
            ? `${s.current} ${s.current === 1 ? 'día seguido' : 'días seguidos'} · faltan ${s.next.remaining} para ${TIER_LABELS[s.next.tier].toLowerCase()}`
            : `${s.current} días seguidos · racha de oro`}
        {s.best > s.current && ` · mejor: ${s.best}`}
      </span>
    </div>
  );
}

/** Calendario de las últimas `weeks` semanas, terminando hoy. */
export function DotCalendar({ task, weeks = 5 }: { task: TaskView; weeks?: number }) {
  const status = new Map(task.recentDates.map((d) => [d.date, d.status]));
  const total = weeks * 7;
  const start = addDays(task.today, -(total - 1));
  const created = task.createdAt.slice(0, 10);
  return (
    <div className="dots" aria-label="Calendario de cumplimiento">
      {Array.from({ length: total }, (_, i) => {
        const d = addDays(start, i);
        const st = status.get(d);
        const cls = [st ?? '', d === task.today ? 'today' : '', !st && d < created ? 'future' : ''].join(' ');
        return <span key={d} className={`dot ${cls}`} title={`${d}${st ? ` · ${st}` : ''}`} />;
      })}
    </div>
  );
}

export function WeekDots({ task }: { task: TaskView }) {
  const status = new Map(task.recentDates.map((d) => [d.date, d.status]));
  return (
    <span className="week-dots" aria-label="Últimos 7 días">
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(task.today, i - 6);
        return <span key={d} className={`dot ${status.get(d) ?? ''}`} />;
      })}
    </span>
  );
}
