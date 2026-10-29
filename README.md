# DailyTracker 2

Rituales, rachas y un diario compartido para dinámicas Dom/sum, más un modo Switch autogestionado.

- **Dom**: invita sums con un código, asigna tareas (diarias o puntuales, sencillas o complejas), aprueba entregas, define recompensas y lee lo que su sum comparte.
- **sum**: marca tareas, registra cómo se sintió (y decide si compartirlo), escribe su diario, propone y canjea recompensas.
- **Switch**: se asigna sus propias tareas y recompensas; todo se aprueba solo.
- **Rachas**: sencillas 5 / 10 / 21 días (bronce, plata, oro), complejas 3 / 5 / 7. Cada medalla suma un bono de puntos.

## Stack

| Parte | Tecnología |
|---|---|
| `apps/api` | Express 5 + TypeScript, Drizzle ORM, better-sqlite3 (WAL), sesión en cookie httpOnly, zod |
| `apps/web` | Vite + React 19, React Router, TanStack Query, CSS con tokens (tema “Té de la tarde”, claro y noche) |
| `packages/shared` | Esquemas zod, constantes y lógica de rachas compartida entre API y web |

## Desarrollo

```bash
npm install
```

```bash
npm run seed
```

```bash
npm run dev
```

La web queda en http://localhost:5173 (proxy a la API en :3000). El seed crea `ama` (Dom), `lirio` y `nube` (sums) y `sauce` (Switch); la contraseña está en `apps/api/src/seed.ts`.

Otros comandos:

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run db:generate
```

(`db:generate` crea una migración nueva después de cambiar `apps/api/src/db/schema.ts`.)

## Deploy

Ver [DEPLOY.md](DEPLOY.md). El código de la versión anterior está en `legacy/` solo como referencia.
