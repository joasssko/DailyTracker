import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import type { DiaryEntry, FeelingRow } from '../lib/types';
import { Empty, PageBand, Spinner } from '../components/Bits';
import { DiaryComposer, EntryCard, FeelingList } from '../components/Journal';

export function JournalPage() {
  const { user, dom } = useSession();
  const [tab, setTab] = useState<'diary' | 'feelings'>('diary');
  const diary = useQuery({ queryKey: ['diary', user.id], queryFn: () => api<DiaryEntry[]>('/diary') });
  const feelings = useQuery({ queryKey: ['feelings', user.id], queryFn: () => api<FeelingRow[]>('/completions/feelings'), enabled: user.role !== 'dom' });
  const canShare = user.role === 'sub' && !!dom;

  return (
    <>
      <PageBand
        eyebrow="Diario"
        title={<>Tu diario, <em>tus reglas.</em></>}
        lede={canShare ? 'Tú decides qué compartir con tu Dom y qué guardar solo para ti.' : 'Un rincón privado para tus reflexiones.'}
      />

      <div className="page-body">
      {user.role !== 'dom' && (
        <div className="seg tabs" role="tablist" style={{ marginBottom: 28 }}>
          <button role="tab" aria-pressed={tab === 'diary'} onClick={() => setTab('diary')}>
            Entradas
          </button>
          <button role="tab" aria-pressed={tab === 'feelings'} onClick={() => setTab('feelings')}>
            Sensaciones
          </button>
        </div>
      )}

      <div style={{ maxWidth: 720 }}>
        {tab === 'diary' ? (
          <div className="stack lg">
            <DiaryComposer canShare={canShare} />
            {diary.isLoading ? (
              <Spinner />
            ) : diary.data?.length ? (
              diary.data.map((e) => <EntryCard key={e.id} entry={e} editable canShare={canShare} />)
            ) : (
              <Empty title="Tu diario está en blanco">La primera página siempre es la más bonita.</Empty>
            )}
          </div>
        ) : feelings.isLoading ? (
          <Spinner />
        ) : (
          <FeelingList rows={feelings.data ?? []} emptyText="Al marcar una tarea como hecha puedes registrar cómo te sentiste." />
        )}
      </div>
      </div>
    </>
  );
}
