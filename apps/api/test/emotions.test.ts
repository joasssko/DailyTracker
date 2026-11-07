import { describe, expect, it } from 'vitest';
import { EMOTION_FAMILIES, parseEmotion } from '@shared';

describe('ruleta de emociones', () => {
  it('tiene 6 familias, 36 matices y 72 emociones con claves únicas', () => {
    expect(EMOTION_FAMILIES).toHaveLength(6);
    const subs = EMOTION_FAMILIES.flatMap((f) => f.children);
    expect(subs).toHaveLength(36);
    const leaves = subs.flatMap((s) => s.children);
    expect(leaves).toHaveLength(72);
    const paths = EMOTION_FAMILIES.flatMap((f) => f.children.flatMap((s) => [`${f.key}.${s.key}`, ...s.children.map((l) => `${f.key}.${s.key}.${l.key}`)]));
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(parseEmotion(p)).not.toBeNull();
  });

  it('usa la forma o/a y descripciones para todo', () => {
    const p = parseEmotion('felicidad.orgulloso.seguro')!;
    expect(p.sub.label).toBe('Orgulloso/a');
    expect(p.emotion.label).toBe('Seguro/a');
    for (const f of EMOTION_FAMILIES) for (const s of f.children) for (const n of [s, ...s.children]) expect(n.desc.length).toBeGreaterThan(5);
  });
});
