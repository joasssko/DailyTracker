const dateFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' });

/** "2026-10-20" → "20 oct" (sin desplazar por zona horaria). */
export function shortDate(ymd: string) {
  return dateFmt.format(new Date(`${ymd.slice(0, 10)}T12:00:00`));
}

export function longToday() {
  const s = longFmt.format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hoy, ${timeFmt.format(d)}`;
  if (diff < 172800) return `ayer, ${timeFmt.format(d)}`;
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export const pts = (n: number) => `${n} ${Math.abs(n) === 1 ? 'punto' : 'puntos'}`;
