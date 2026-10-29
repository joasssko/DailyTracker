import { describe, expect, it } from 'vitest';
import { addDays, currentStreak, localDate, nextTier, runContaining, tierForStreak } from '@shared';

const days = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));

describe('medallas por dificultad', () => {
  it('sencilla: 5 bronce, 10 plata, 21 oro', () => {
    expect(tierForStreak('simple', 4)).toBeNull();
    expect(tierForStreak('simple', 5)).toBe('bronze');
    expect(tierForStreak('simple', 10)).toBe('silver');
    expect(tierForStreak('simple', 21)).toBe('gold');
    expect(tierForStreak('simple', 40)).toBe('gold');
  });
  it('compleja: 3 bronce, 5 plata, 7 oro', () => {
    expect(tierForStreak('complex', 2)).toBeNull();
    expect(tierForStreak('complex', 3)).toBe('bronze');
    expect(tierForStreak('complex', 5)).toBe('silver');
    expect(tierForStreak('complex', 7)).toBe('gold');
  });
  it('próxima medalla', () => {
    expect(nextTier('simple', 7)).toEqual({ tier: 'silver', remaining: 3 });
    expect(nextTier('complex', 7)).toBeNull();
  });
});

describe('rachas', () => {
  it('un día sin cumplir reinicia la racha', () => {
    const dates = [...days('2026-03-01', 4), ...days('2026-03-06', 3)];
    expect(runContaining(dates, '2026-03-07')).toEqual({ start: '2026-03-06', length: 3 });
    expect(runContaining(dates, '2026-03-02').length).toBe(4);
  });
  it('la racha vigente sigue viva hasta que termina el día', () => {
    const dates = days('2026-03-01', 5); // 1..5
    expect(currentStreak(dates, '2026-03-05')).toBe(5);
    expect(currentStreak(dates, '2026-03-06')).toBe(5); // hoy aún no se cumple
    expect(currentStreak(dates, '2026-03-07')).toBe(0); // se perdió ayer
  });
  it('cruza cambios de mes', () => {
    expect(runContaining(days('2026-02-26', 6), '2026-03-03').length).toBe(6);
  });
});

describe('zona horaria', () => {
  it('las 23:30 en Santiago cuentan para ese mismo día', () => {
    // 2026-07-15 23:30 en Santiago (UTC-4 en invierno) = 2026-07-16 03:30 UTC
    expect(localDate('America/Santiago', new Date('2026-07-16T03:30:00Z'))).toBe('2026-07-15');
  });
});
