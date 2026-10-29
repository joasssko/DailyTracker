import { Link } from 'react-router';
import { STREAK_THRESHOLDS, TIER_LABELS, TIERS, type Difficulty } from '@shared';
import '../styles/landing.css';

function Tier({ difficulty, eyebrow, title }: { difficulty: Difficulty; eyebrow: string; title: string }) {
  return (
    <div className="l-tier">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <div className="l-medals">
        {TIERS.map((t) => (
          <div key={t} className="l-medal">
            <span className={`coin ${t}`}>{STREAK_THRESHOLDS[difficulty][t]}</span>
            {TIER_LABELS[t]} · {STREAK_THRESHOLDS[difficulty][t]} días
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLES = [
  {
    name: 'Dom/Top',
    italic: false,
    text: 'Guía a una o más personas. Asigna rutinas y encargos, revisa entregas, lee lo que su sum decide compartir y define recompensas.',
    tags: ['Invitaciones', 'Bandeja de revisión', 'Recompensas'],
  },
  {
    name: 'Sum/Bottom',
    italic: true,
    text: 'Recibe encargos, construye rachas y escribe su diario. Puede proponer recompensas y elegir, entrada por entrada, qué queda en privado.',
    tags: ['Rachas', 'Sensaciones', 'Diario privado'],
  },
  {
    name: 'Solo/Switch',
    italic: false,
    text: 'Se asigna sus propias tareas y premios. Un calendario de logros personal, con la misma calidez y sin depender de nadie más.',
    tags: ['Autogestión', 'Medallas', 'Diario'],
  },
];

export function LandingPage() {
  return (
    <div className="landing">
      <section className="l-hero">
        <img src="/img/hand-sheets.jpg" alt="" />
        <div className="l-scroll" aria-hidden>
          <span className="mark"></span>
          <span>scroll</span>
        </div>
        <header className="l-top">
          <Link to="/" className="wordmark">
            daily<i>tracker</i>
          </Link>
          <nav className="l-nav" aria-label="Secciones">
            <a href="#que-es">Qué es</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#rachas">Rachas</a>
            <a href="#roles">Roles</a>
            <a href="#privacidad">Privacidad</a>
          </nav>
          <Link to="/login" className="l-pill">
            Entrar
          </Link>
        </header>
        <div className="l-hero-copy">
          <p className="eyebrow">Rituales compartidos · Dom · sum · Switch</p>
          <h1>
            Rituales que
            <br />
            <em>nos sostienen.</em>
          </h1>
          <p className="lede">
            Encargos diarios, rachas que se celebran y un diario donde tú decides qué compartir. Una herramienta íntima para dinámicas de cuidado y entrega.
          </p>
          <div className="l-ctas">
            <Link to="/login?modo=registro" className="btn light">
              Crear mi espacio →
            </Link>
            <a href="#como-funciona" className="btn outline-light">
              Ver cómo funciona
            </a>
          </div>
        </div>
        <p className="l-hero-side">
          “La constancia también
          <br />
          es una forma de cariño.”
        </p>
      </section>

      <section className="l-s01" id="que-es">
        <div className="wrap">
          <div className="l-num">01.</div>
          <div className="l-rule" />
          <h2 className="l-title">Qué es</h2>
        </div>
        <div className="l-split">
          <div className="wrap l-split-inner">
            <div>
              <p className="lead">
                Un acuerdo se sostiene en los <em>pequeños gestos</em> de cada día; dailytracker les da forma, memoria y celebración.
              </p>
              <p className="note">
                Quien guía asigna tareas y recompensas. Quien se entrega las cumple, registra cómo se sintió y construye rachas. Todo queda en un mismo lugar, privado y sin estridencias.
              </p>
            </div>
            <div className="photo">
              <img src="/img/rope-bw.jpg" alt="" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="l-s02" id="como-funciona">
        <div className="wrap">
          <div className="l-num">02.</div>
          <div className="l-rule" />
          <div className="l-head-row">
            <h2 className="l-title">Cómo funciona</h2>
            <p>Tres gestos simples que, repetidos, se vuelven ritual.</p>
          </div>
          <div className="l-steps">
            <div className="l-step">
              <span className="k">i.</span>
              <h3>Encargar</h3>
              <p>El Dom crea tareas diarias o puntuales, define su dificultad y cuántos puntos valen. Puede acompañar a una o varias personas.</p>
            </div>
            <div className="l-step">
              <span className="k">ii.</span>
              <h3>Cumplir y sentir</h3>
              <p>Al marcar una tarea, el sum registra cómo se sintió: orgullo, calma, nervios, entrega. Y elige si esa sensación se comparte o queda para sí.</p>
            </div>
            <div className="l-step">
              <span className="k">iii.</span>
              <h3>Celebrar</h3>
              <p>Cada aprobación suma puntos. Las rutinas forman rachas con medallas, y los puntos se canjean por recompensas acordadas entre ambos.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="l-s03" id="rachas">
        <div className="wrap">
          <div className="l-num">03.</div>
          <div className="l-rule" />
          <div className="l-head-row">
            <h2 className="l-title">
              Rachas que <em>se notan</em>
            </h2>
            <p>La dificultad de la tarea define el camino. Más días seguidos, más brillo.</p>
          </div>
          <div className="l-tiers">
            <Tier difficulty="simple" eyebrow="Tareas sencillas" title="Tomar agua, hacer la cama" />
            <Tier difficulty="complex" eyebrow="Tareas complejas" title="Yoga, escribir, practicar" />
          </div>
        </div>
      </section>

      <section className="l-s04" id="roles">
        <div className="wrap">
          <div className="l-num">04.</div>
          <div className="l-rule" />
          <div className="l-head-row">
            <h2 className="l-title">Para cada rol</h2>
            <p>Una misma herramienta, tres formas de vivirla.</p>
          </div>
          <div className="l-roles">
            <div className="photo">
              <img src="/img/hands-holding.jpg" alt="" loading="lazy" />
            </div>
            <div>
              {ROLES.map((r) => (
                <div key={r.name} className="l-role">
                  <h3>{r.italic ? <em>{r.name}</em> : r.name}</h3>
                  <div>
                    <p>{r.text}</p>
                    {/* <ul>
                      {r.tags.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul> */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="l-s05" id="privacidad">
        <img src="/img/satin.jpg" alt="" loading="lazy" />
        <div className="copy">
          <p className="eyebrow">05. Privacidad</p>
          <h2>
            Tu diario,
            <br />
            <em>tus reglas.</em>
          </h2>
          <p>Cada entrada y cada sensación es privada por defecto. Solo se comparte lo que tú eliges, y puedes cambiar de opinión cuando quieras.</p>
          {/* <div className="l-badges">
            <span>Sin anuncios</span>
            <span>Servidor propio</span>
            <span>Sin rastreo</span>
          </div> */}
        </div>
      </section>

      <section className="l-cta">
        <div className="wrap">
          <div className="row">
            <h2>
              Empieza hoy.
              <br />
              <em>Con calma.</em>
            </h2>
            <Link to="/login?modo=registro" className="btn light">
              Crear mi espacio →
            </Link>
          </div>
          <footer className="l-foot">
            <span>Dailytracker · {new Date().getFullYear()}</span>
            <span>Hecho con cuidado y cariño por <a href="https://joasssko.cl">joasssko</a> · Fotos: Unsplash</span>
            <Link to="/login">Entrar</Link>
          </footer>
        </div>
      </section>
    </div>
  );
}
