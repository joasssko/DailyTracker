import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRinging, BellSlash } from '@phosphor-icons/react';
import type { Role } from '@shared';
import { api } from '../lib/api';
import { useApiMutation } from '../lib/mutations';
import { currentSubscription, disablePush, enablePush, pushSupport } from '../lib/push';
import { useToast } from '../lib/toast';
import type { NotificationPrefs } from '../lib/types';

type PrefsResponse = { prefs: NotificationPrefs; vapidPublicKey: string | null; devices: number };

const EVENTS: Record<Role, { key: keyof NotificationPrefs; label: string; hint: string }[]> = {
  sub: [
    { key: 'notifyAssigned', label: 'Tareas nuevas', hint: 'Cuando tu Dom te asigna algo.' },
    { key: 'notifyReviewed', label: 'Revisión de tus entregas', hint: 'Cuando aprueban o no aprueban lo que marcaste.' },
    { key: 'notifyRewards', label: 'Recompensas', hint: 'Cuando aprueban, entregan o rechazan un canje.' },
  ],
  dom: [
    { key: 'notifyCompleted', label: 'Entregas de tus sums', hint: 'Cuando alguien marca una tarea como hecha.' },
    { key: 'notifyRewards', label: 'Canjes y propuestas', hint: 'Cuando piden canjear o proponen una recompensa.' },
  ],
  switch: [],
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </span>
  );
}

export function NotificationSettings({ role }: { role: Role }) {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['notif-prefs'], queryFn: () => api<PrefsResponse>('/notifications/prefs') });
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const support = pushSupport();
  const permission = support === 'ok' ? Notification.permission : 'default';

  useEffect(() => {
    currentSubscription().then((s) => setSubscribed(!!s));
  }, []);

  const save = useApiMutation((patch: Partial<NotificationPrefs>) => api('/notifications/prefs', { method: 'PUT', body: patch }), {
    success: 'Preferencias guardadas',
  });
  const test = useApiMutation(() => api('/notifications/test', { body: {} }), { success: 'Notificación de prueba enviada' });

  async function toggleDevice() {
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
        toast('Notificaciones desactivadas en este dispositivo');
      } else {
        if (!q.data?.vapidPublicKey) throw new Error('El servidor no tiene notificaciones habilitadas.');
        await enablePush(q.data.vapidPublicKey);
        setSubscribed(true);
        toast('Notificaciones activadas en este dispositivo ❣');
      }
      qc.invalidateQueries({ queryKey: ['notif-prefs'] });
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const prefs = q.data?.prefs;
  const set = (patch: Partial<NotificationPrefs>) => {
    qc.setQueryData<PrefsResponse>(['notif-prefs'], (old) => (old ? { ...old, prefs: { ...old.prefs, ...patch } } : old));
    save.mutate(patch);
  };

  return (
    <section className="card stack lg" id="notificaciones" style={{ padding: 26 }}>
      <div>
        <h3>Notificaciones</h3>
        <p className="small muted" style={{ marginTop: 4 }}>
          Todas las alertas quedan en la campanita. Aquí eliges cuáles llegan también como notificación al celular o al computador.
        </p>
      </div>

      {/* Este dispositivo */}
      <div className="device-box">
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <span className="bell-icon">{subscribed ? <BellRinging size={20} weight="light" /> : <BellSlash size={20} weight="light" />}</span>
          <div className="grow">
            <b style={{ fontWeight: 600 }}>Este dispositivo</b>
            <p className="small muted">
              {support === 'needs-install'
                ? 'En iPhone, primero agrega dailytracker a tu pantalla de inicio (Compartir → “Agregar a inicio”) y ábrela desde ahí.'
                : support === 'unsupported'
                  ? 'Este navegador no permite notificaciones push.'
                  : permission === 'denied'
                    ? 'Bloqueaste las notificaciones para este sitio. Actívalas en los ajustes del navegador y vuelve aquí.'
                    : subscribed
                      ? 'Recibe notificaciones.'
                      : 'No recibe notificaciones todavía.'}
            </p>
          </div>
        </div>
        {support === 'ok' && permission !== 'denied' && subscribed !== null && (
          <div className="row wrap" style={{ marginTop: 14 }}>
            <button className={`btn sm ${subscribed ? 'ghost' : ''}`} onClick={toggleDevice} disabled={busy}>
              {busy ? 'Un momento…' : subscribed ? 'Desactivar en este dispositivo' : 'Activar notificaciones'}
            </button>
            {subscribed && (
              <button className="link-btn" onClick={() => test.mutate(undefined)} disabled={test.isPending}>
                Enviar una de prueba
              </button>
            )}
          </div>
        )}
        {!!q.data?.devices && (
          <p className="tiny faint" style={{ marginTop: 10 }}>
            {q.data.devices} {q.data.devices === 1 ? 'dispositivo registrado' : 'dispositivos registrados'} en tu cuenta.
          </p>
        )}
      </div>

      {prefs && (
        <>
          {/* Recordatorio diario */}
          <div className="stack">
            <p className="eyebrow">Recordatorio diario</p>
            <label className="switch-row">
              <span>
                <b style={{ fontWeight: 600 }}>{role === 'dom' ? 'Avisarme si hay algo por revisar' : 'Recordarme mis tareas pendientes'}</b>
                <span className="small muted" style={{ display: 'block' }}>
                  Solo si queda algo pendiente ese día.
                </span>
              </span>
              <Toggle checked={prefs.remindersEnabled} onChange={(v) => set({ remindersEnabled: v })} label="Recordatorio diario" />
            </label>
            {prefs.remindersEnabled && (
              <label className="row between" style={{ padding: '0 4px' }}>
                <span className="small">Hora del recordatorio</span>
                <input
                  className="input"
                  type="time"
                  value={prefs.reminderTime}
                  onChange={(e) => e.target.value && set({ reminderTime: e.target.value })}
                  style={{ width: 140, minHeight: 42 }}
                />
              </label>
            )}
          </div>

          {/* Eventos */}
          {EVENTS[role].length > 0 && (
            <div className="stack">
              <p className="eyebrow">Avisarme de</p>
              {EVENTS[role].map((ev) => (
                <label key={ev.key} className="switch-row">
                  <span>
                    <b style={{ fontWeight: 600 }}>{ev.label}</b>
                    <span className="small muted" style={{ display: 'block' }}>
                      {ev.hint}
                    </span>
                  </span>
                  <Toggle checked={prefs[ev.key] as boolean} onChange={(v) => set({ [ev.key]: v })} label={ev.label} />
                </label>
              ))}
            </div>
          )}

          {/* Modo discreto */}
          <div className="stack">
            <p className="eyebrow">Privacidad</p>
            <label className="switch-row">
              <span>
                <b style={{ fontWeight: 600 }}>Modo discreto</b>
                <span className="small muted" style={{ display: 'block' }}>
                  La notificación no muestra nombres ni títulos de tareas en la pantalla bloqueada.
                </span>
              </span>
              <Toggle checked={prefs.discreet} onChange={(v) => set({ discreet: v })} label="Modo discreto" />
            </label>
            <div className="notif-preview" aria-label="Vista previa">
              <img src="/icon-192.png" alt="" />
              <div>
                <b>{prefs.discreet ? 'dailytracker ❣' : role === 'dom' ? 'Entrega por revisar' : 'Nueva tarea'}</b>
                <span>
                  {prefs.discreet
                    ? role === 'dom'
                      ? 'Tienes una entrega por revisar.'
                      : 'Tienes una tarea nueva.'
                    : role === 'dom'
                      ? 'Lirio completó «Yoga 20 minutos».'
                      : 'Ama te asignó «Yoga 20 minutos».'}
                </span>
              </div>
              <small>ahora</small>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
