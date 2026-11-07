import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowLeft, Info, X } from '@phosphor-icons/react';
import { EMOTION_FAMILIES, parseEmotion, type EmotionFamily, type EmotionNode, type EmotionSub } from '@shared';
import { Sheet } from './Sheet';

type Step = 1 | 2 | 3;

const TOTAL_LEAVES = EMOTION_FAMILIES.reduce((n, f) => n + f.children.reduce((m, s) => m + s.children.length, 0), 0);

function arc(r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [100 + r * Math.sin(a), 100 - r * Math.cos(a)].map((v) => v.toFixed(2));
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M${x0},${y0}A${r1},${r1} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${large} 0 ${x3},${y3}Z`;
}

/** Ruleta en miniatura: resalta el camino elegido y apaga el resto. */
export function MiniWheel({ step, family, sub, leaf }: { step: Step; family: EmotionFamily | null; sub: EmotionSub | null; leaf: EmotionNode | null }) {
  const unit = (Math.PI * 2) / TOTAL_LEAVES;
  // Centra la primera familia (Ira) arriba.
  let a = -(EMOTION_FAMILIES[0].children.reduce((m, s) => m + s.children.length, 0) * unit) / 2;
  const paths: ReactElement[] = [];
  for (const f of EMOTION_FAMILIES) {
    const famOn = !family || family === f;
    const fa0 = a;
    for (const s of f.children) {
      const subOn = famOn && step > 1 && (!sub || sub === s);
      const sa0 = a;
      for (const l of s.children) {
        const leafOn = subOn && step > 2 && (!leaf || leaf === l);
        const op = leafOn ? 1 : famOn && step === 1 ? 0.55 : 0.16;
        paths.push(<path key={`${f.key}.${s.key}.${l.key}`} className={`emo-${f.key}`} d={arc(70, 98, a, a + unit)} opacity={op} />);
        a += unit;
      }
      const op = subOn ? 1 : famOn && step < 3 ? 0.6 : 0.2;
      paths.push(<path key={`${f.key}.${s.key}`} className={`emo-${f.key}`} d={arc(42, 69, sa0, a)} opacity={op} />);
    }
    paths.push(<path key={f.key} className={`emo-${f.key}`} d={arc(14, 41, fa0, a)} opacity={famOn ? 1 : 0.25} />);
  }
  return (
    <svg className="emo-wheel" viewBox="0 0 200 200" aria-hidden="true">
      {paths}
      <circle cx="100" cy="100" r="13" fill="var(--bg)" />
    </svg>
  );
}

/** Píldora de matiz con tooltip (hover/foco en escritorio, toque en el ícono en celular). */
function SubPill({ sub, pressed, tipOpen, onPick, onTip }: { sub: EmotionSub; pressed: boolean; tipOpen: boolean; onPick: () => void; onTip: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Si la píldora está en la mitad derecha, el tooltip se ancla a la derecha para no salirse de la pantalla.
  const [alignRight, setAlignRight] = useState(false);
  return (
    <span className="emo-sub-wrap" ref={ref}>
      <button type="button" className="emo-sub" aria-pressed={pressed} onClick={onPick} aria-describedby={tipOpen ? `tip-${sub.key}` : undefined}>
        {sub.label}
      </button>
      <button
        type="button"
        className="emo-info"
        aria-label={`Qué significa ${sub.label}`}
        aria-expanded={tipOpen}
        onClick={(e) => {
          e.stopPropagation();
          const r = ref.current?.getBoundingClientRect();
          setAlignRight(!!r && r.left + r.width / 2 > window.innerWidth / 2);
          onTip();
        }}
      >
        <Info size={16} />
      </button>
      {tipOpen && (
        <span className={`emo-tip ${alignRight ? 'right' : ''}`} role="tooltip" id={`tip-${sub.key}`}>
          <b>{sub.label}</b>
          {sub.desc}
        </span>
      )}
    </span>
  );
}

export function EmotionWheelSheet({ initial, onClose, onPick }: { initial?: string | null; onClose: () => void; onPick: (value: string) => void }) {
  const start = parseEmotion(initial);
  const [step, setStep] = useState<Step>(start ? 3 : 1);
  const [family, setFamily] = useState<EmotionFamily | null>(start?.family ?? null);
  const [sub, setSub] = useState<EmotionSub | null>(start?.sub ?? null);
  const [leaf, setLeaf] = useState<EmotionNode | null>(start?.leaf ?? null);
  const [tip, setTip] = useState<string | null>(null);

  // Cierra el tooltip al tocar fuera.
  useEffect(() => {
    if (!tip) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('.emo-info, .emo-tip')) setTip(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip]);

  const titles: Record<Step, string> = {
    1: '¿A qué se parece más lo que sientes?',
    2: `Dentro de la ${family?.label.toLowerCase()}, ¿qué matiz tiene?`,
    3: '¿Y más precisamente?',
  };
  const crumbs = [family?.label, sub?.label, leaf?.label].filter(Boolean) as string[];

  function back() {
    setTip(null);
    setLeaf(null);
    if (step === 3) setStep(2);
    else {
      setSub(null);
      setFamily(null);
      setStep(1);
    }
  }

  return (
    <Sheet title="Ayúdame a identificar" onClose={onClose}>
      <div className={family ? `emo-${family.key}` : ''}>
        <div className="emo-top">
          <MiniWheel step={step} family={family} sub={sub} leaf={leaf} />
          <div className="grow">
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              Paso {step} de 3
            </p>
            <h3 className="emo-q">{titles[step]}</h3>
            {crumbs.length > 0 && (
              <div className="emo-crumbs">
                {crumbs.map((c, i) => (
                  <span key={c}>
                    {i > 0 && <span className="sep">›</span>}
                    {c}
                  </span>
                ))}
              </div>
            )}
            <div className="emo-steps" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <i key={n} className={n <= step ? 'on' : ''} />
              ))}
            </div>
          </div>
        </div>

        {step === 1 && (
          <>
            <p className="emo-lede">No hay respuestas correctas. Elige lo primero que resuene; puedes volver atrás.</p>
            <div className="emo-fams">
              {EMOTION_FAMILIES.map((f) => (
                <button
                  type="button"
                  key={f.key}
                  className={`emo-fam emo-${f.key}`}
                  onClick={() => {
                    setFamily(f);
                    setSub(null);
                    setLeaf(null);
                    setStep(2);
                  }}
                >
                  <i className="dot" />
                  <b>{f.label}</b>
                  <span>{f.desc}</span>
                  <small>{f.children.length} matices →</small>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && family && (
          <>
            <p className="emo-lede">
              {family.desc} Toca <Info size={14} style={{ verticalAlign: -2 }} /> para ver qué significa cada uno.
            </p>
            <div className="emo-subs">
              {family.children.map((s) => (
                <SubPill
                  key={s.key}
                  sub={s}
                  pressed={sub === s}
                  tipOpen={tip === s.key}
                  onTip={() => setTip(tip === s.key ? null : s.key)}
                  onPick={() => {
                    setSub(s);
                    setLeaf(null);
                    setTip(null);
                    setStep(3);
                  }}
                />
              ))}
            </div>
          </>
        )}

        {step === 3 && family && sub && (
          <>
            <p className="emo-lede">{sub.desc}</p>
            <div className="emo-leaves">
              {sub.children.map((l) => (
                <button type="button" key={l.key} className="emo-leaf" aria-pressed={leaf === l} onClick={() => setLeaf(l)}>
                  <b>{l.label}</b>
                  <span>{l.desc}</span>
                </button>
              ))}
            </div>
            <button type="button" className="link-btn" style={{ marginTop: 16 }} onClick={() => onPick(`${family.key}.${sub.key}`)}>
              Me quedo con «{sub.label}»
            </button>
          </>
        )}

        <div className="emo-foot">
          {step > 1 ? (
            <button type="button" className="btn ghost sm" onClick={back}>
              <ArrowLeft size={14} /> Atrás
            </button>
          ) : (
            <span className="small muted">Basado en la ruleta de las emociones</span>
          )}
          {step === 3 && family && sub && (
            <button type="button" className="btn sm" disabled={!leaf} onClick={() => leaf && onPick(`${family.key}.${sub.key}.${leaf.key}`)}>
              Llevar al diario
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** Etiqueta de color con la emoción. `full` muestra el camino completo. */
export function EmotionChip({ value, full = false, onClear }: { value: string | null | undefined; full?: boolean; onClear?: () => void }) {
  const p = parseEmotion(value);
  if (!p) return null;
  return (
    <span className={`emo-chip emo-${p.family.key}`} title={p.emotion.desc}>
      {full && (
        <span className="path">
          {p.family.label} ›{p.leaf ? ` ${p.sub.label} ›` : ''}
        </span>
      )}
      {!full && <i className="dot" />}
      <b>{p.emotion.label}</b>
      {onClear && (
        <button type="button" onClick={onClear} aria-label="Quitar emoción">
          <X size={11} weight="bold" />
        </button>
      )}
    </span>
  );
}
