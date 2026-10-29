import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, SignOut, Trash } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useApiMutation } from '../lib/mutations';
import { useSession } from '../lib/session';
import { useToast } from '../lib/toast';
import type { Invite } from '../lib/types';
import { Avatar, PageBand, Stat } from '../components/Bits';

const ROLE_LABEL = { dom: 'Dom/Top', sub: 'Sum/Bottom', switch: 'Solo/Switch' } as const;
type Theme = 'system' | 'light' | 'dark';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('dt-theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function ProfilePage() {
  const { user, dom } = useSession();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [timezone, setTimezone] = useState(user.timezone);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const rels = useQuery({
    queryKey: ['relationships'],
    queryFn: () => api<{ invites?: Invite[]; relationship?: { id: number } | null }>('/relationships'),
    enabled: user.role !== 'switch',
  });

  useEffect(() => {
    try {
      if (theme === 'system') {
        localStorage.removeItem('dt-theme');
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem('dt-theme', theme);
        document.documentElement.dataset.theme = theme;
      }
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);

  const save = useApiMutation(() => api('/auth/me', { method: 'PATCH', body: { displayName, timezone } }), { success: 'Perfil actualizado' });
  const leave = useApiMutation((id: number) => api(`/relationships/${id}`, { method: 'DELETE' }), { success: 'Vínculo terminado' });

  async function logout() {
    await api('/auth/logout', { body: {} });
    qc.clear();
    window.location.href = '/';
  }

  const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [user.timezone];

  return (
    <>
      <PageBand
        eyebrow={`Perfil · @${user.username}`}
        title={<em>{user.displayName}</em>}
        actions={
          <button className="btn ghost" onClick={logout}>
            <SignOut size={15} /> Salir
          </button>
        }
      >
        <Stat value={ROLE_LABEL[user.role]} label="rol" />
        <Stat value={user.timezone.split('/').pop()!.replace(/_/g, ' ')} label="zona horaria" />
      </PageBand>

      <div className="page-body">
      <div className="layout-2">
        <div className="stack lg">
          {user.role === 'sub' &&
            (dom ? (
              <div className="card">
                <p className="eyebrow">Tu Dom</p>
                <div className="row" style={{ marginTop: 12 }}>
                  <Avatar name={dom.displayName} />
                  <div className="grow">
                    <p style={{ fontWeight: 600 }}>{dom.displayName}</p>
                    <p className="tiny muted">@{dom.username}</p>
                  </div>
                  {rels.data?.relationship && (
                    <button
                      className="btn ghost sm"
                      onClick={() => confirm('¿Terminar el vínculo? Tus tareas y diario se conservan.') && leave.mutate(rels.data!.relationship!.id)}
                    >
                      Desvincular
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <JoinCard />
            ))}
          {user.role === 'dom' && <InvitesCard invites={rels.data?.invites ?? []} />}

          <form
            className="card stack lg"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(undefined);
            }}
          >
            <h3>Tus datos</h3>
            <label className="field">
              <span>Nombre para mostrar</span>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} required />
            </label>
            <label className="field">
              <span>Zona horaria</span>
              <select className="select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <span className="hint">Define cuándo empieza y termina tu día para las rachas.</span>
            </label>
            <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={save.isPending}>
              Guardar
            </button>
          </form>
        </div>

        <aside className="card stack">
          <h3>Apariencia</h3>
          <div className="seg" role="group" aria-label="Tema">
            {(
              [
                ['system', 'Automático'],
                ['light', 'Claro'],
                ['dark', 'Noche'],
              ] as [Theme, string][]
            ).map(([k, l]) => (
              <button key={k} aria-pressed={theme === k} onClick={() => setTheme(k)}>
                {l}
              </button>
            ))}
          </div>
          <p className="small muted">Puedes instalar DailyTracker en tu celular desde el menú del navegador: “Agregar a pantalla de inicio”.</p>
        </aside>
      </div>
      </div>
    </>
  );
}

export function JoinCard() {
  const [code, setCode] = useState('');
  const join = useApiMutation(() => api('/relationships/join', { body: { code } }), { success: 'Vinculación lista 🤍' });
  return (
    <form
      className="card tinted stack"
      style={{ padding: 26 }}
      onSubmit={(e) => {
        e.preventDefault();
        join.mutate(undefined);
      }}
    >
      <h3 style={{ fontSize: '1.9rem' }}>Vincúlate con tu <em>Dom/Top</em></h3>
      <p className="small muted">Pídele su código de invitación e ingrésalo aquí.</p>
      <div className="row">
        <input className="input grow" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código" maxLength={32} aria-label="Código de invitación" />
        <button className="btn" disabled={join.isPending || code.length < 4}>
          Unirme
        </button>
      </div>
    </form>
  );
}

export function InvitesCard({ invites }: { invites: Invite[] }) {
  const toast = useToast();
  const create = useApiMutation(() => api('/relationships/invites', { body: {} }), { success: 'Código creado' });
  const remove = useApiMutation((id: number) => api(`/relationships/${id}`, { method: 'DELETE' }), { success: 'Código eliminado' });
  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <h3>Invitaciones</h3>
          <p className="small muted">Cada código sirve para vincular a una persona.</p>
        </div>
        <button className="btn soft sm" onClick={() => create.mutate(undefined)} disabled={create.isPending}>
          Generar código
        </button>
      </div>
      {invites.map((i) => (
        <div key={i.id} className="row">
          <span className="code-box">{i.inviteCode}</span>
          <span className="grow" />
          <button
            className="btn ghost icon sm"
            aria-label="Copiar código"
            onClick={() => {
              navigator.clipboard?.writeText(i.inviteCode).then(() => toast('Código copiado'), () => toast('No se pudo copiar', 'error'));
            }}
          >
            <Copy size={14} />
          </button>
          <button className="btn ghost icon sm" aria-label="Eliminar código" onClick={() => remove.mutate(i.id)}>
            <Trash size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
