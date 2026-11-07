// Ruleta de las emociones: 6 familias → matices → emociones finas.
// Orden horario desde arriba (igual que la ruleta de referencia). Las claves no cambian nunca:
// se guardan en la base como 'familia.matiz' o 'familia.matiz.emocion'.

export interface EmotionNode {
  key: string;
  label: string;
  desc: string;
}
export interface EmotionSub extends EmotionNode {
  children: EmotionNode[];
}
export interface EmotionFamily extends EmotionNode {
  children: EmotionSub[];
}

const n = (key: string, label: string, desc: string): EmotionNode => ({ key, label, desc });
const s = (key: string, label: string, desc: string, children: EmotionNode[]): EmotionSub => ({ key, label, desc, children });

export const EMOTION_FAMILIES: EmotionFamily[] = [
  {
    key: 'ira',
    label: 'Ira',
    desc: 'Algo te pasó a llevar: un límite, una expectativa o algo que te importa.',
    children: [
      s('herido', 'Herido/a', 'Algo o alguien te dolió más de lo que esperabas.', [
        n('apenado', 'Apenado/a', 'Pena suave, como un nudo que todavía no se suelta.'),
        n('devastado', 'Devastado/a', 'Un dolor tan grande que cuesta sostenerse.'),
      ]),
      s('amenazado', 'Amenazado/a', 'Sientes que algo tuyo está en riesgo.', [
        n('atacado', 'Atacado/a', 'Sientes que te apuntan o te juzgan directamente.'),
        n('celoso', 'Celoso/a', 'Miedo a perder la atención o el lugar que tienes con alguien.'),
      ]),
      s('lleno-de-odio', 'Lleno/a de odio', 'Un rechazo intenso hacia algo o alguien.', [
        n('resentido', 'Resentido/a', 'Una herida antigua que sigue cobrando.'),
        n('ultrajado', 'Ultrajado/a', 'Sientes que pasaron por encima de tu dignidad.'),
      ]),
      s('enfadado', 'Enfadado/a', 'Una molestia clara que pide salir.', [
        n('furioso', 'Furioso/a', 'Rabia intensa, con mucha energía en el cuerpo.'),
        n('rabioso', 'Rabioso/a', 'Un enojo que se desborda y cuesta contener.'),
      ]),
      s('agresivo', 'Agresivo/a', 'Ganas de responder con fuerza.', [
        n('provocador', 'Provocador/a', 'Ganas de picar o de buscar una reacción en el otro.'),
        n('hostil', 'Hostil', 'Actitud a la defensiva, esperando el ataque.'),
      ]),
      s('frustrado', 'Frustrado/a', 'Algo no avanza o no resulta pese a tu esfuerzo.', [
        n('enfurecido', 'Enfurecido/a', 'La frustración ya se volvió rabia.'),
        n('irritado', 'Irritado/a', 'Todo te molesta un poco más de lo normal.'),
      ]),
      s('distante', 'Distante', 'Te alejas para protegerte.', [
        n('introvertido', 'Introvertido/a', 'Ganas de cerrarte y quedarte en tu mundo.'),
        n('desconfiado', 'Desconfiado/a', 'Te cuesta creer en las intenciones del otro.'),
      ]),
      s('critico', 'Crítico/a', 'Miras con lupa lo que está mal.', [
        n('esceptico', 'Escéptico/a', 'Dudas de lo que te dicen o prometen.'),
        n('sarcastico', 'Sarcástico/a', 'El enojo sale en forma de ironía.'),
      ]),
    ],
  },
  {
    key: 'asco',
    label: 'Asco',
    desc: 'Ganas de alejarte de algo que te desagrada o choca con lo que valoras.',
    children: [
      s('disconforme', 'Disconforme', 'Algo no te parece bien.', [
        n('moralista', 'Moralista', 'Juzgas algo según lo que crees correcto.'),
        n('reacio', 'Reacio/a', 'Te resistes a hacer o aceptar algo.'),
      ]),
      s('decepcionado', 'Decepcionado/a', 'Esperabas más de algo o de alguien.', [
        n('consternado', 'Consternado/a', 'Algo inaceptable te dejó sin reacción.'),
        n('asqueado', 'Asqueado/a', 'Un rechazo físico, como un nudo en el estómago.'),
      ]),
      s('horrible', 'Horrible', 'La sensación fuerte de que algo está muy mal.', [
        n('revuelto', 'Revuelto/a', 'Un malestar que se siente en el cuerpo.'),
        n('odioso', 'Odioso/a', 'Choque profundo con algo que detestas.'),
      ]),
      s('repelido', 'Repelido/a', 'Algo te empuja a tomar distancia.', [
        n('aversion', 'Con aversión', 'Un rechazo hondo, difícil de explicar.'),
        n('vacilante', 'Vacilante', 'Dudas y te frenas antes de acercarte.'),
      ]),
    ],
  },
  {
    key: 'tristeza',
    label: 'Tristeza',
    desc: 'Una pérdida, una distancia o algo que no salió como esperabas.',
    children: [
      s('culpable', 'Culpable', 'Sientes que fallaste o que hiciste daño.', [
        n('arrepentido', 'Arrepentido/a', 'Quisieras haber hecho algo distinto.'),
        n('avergonzado', 'Avergonzado/a', 'Ganas de esconderte por algo que hiciste o mostraste.'),
      ]),
      s('abandonado', 'Abandonado/a', 'Sientes que te dejaron de lado.', [
        n('ignorado', 'Ignorado/a', 'Como si no te vieran ni te escucharan.'),
        n('victimizado', 'Victimizado/a', 'Sientes que te trataron injustamente.'),
      ]),
      s('desesperado', 'Desesperado/a', 'No ves una salida clara.', [
        n('desvalido', 'Desvalido/a', 'Sin recursos ni fuerzas para enfrentar algo.'),
        n('vulnerable', 'Vulnerable', 'Sientes que cualquier cosa podría herirte.'),
      ]),
      s('deprimido', 'Deprimido/a', 'Un bajón profundo que tiñe el día.', [
        n('melancolico', 'Melancólico/a', 'Nostalgia tranquila por algo que ya no está.'),
        n('vacio', 'Vacío/a', 'Como si nada llenara ni importara.'),
      ]),
      s('solo', 'Solo/a', 'Falta de compañía o de conexión.', [
        n('desamparado', 'Desamparado/a', 'Sin nadie que te cuide o te respalde.'),
        n('aislado', 'Aislado/a', 'Lejos de los demás, aunque haya gente cerca.'),
      ]),
      s('aburrido', 'Aburrido/a', 'Nada te entusiasma ni te mueve.', [
        n('apatico', 'Apático/a', 'Sin energía ni ganas de hacer nada.'),
        n('indiferente', 'Indiferente', 'Te da lo mismo lo que pase.'),
      ]),
    ],
  },
  {
    key: 'felicidad',
    label: 'Felicidad',
    desc: 'Bienestar, conexión o la sensación de que las cosas van bien.',
    children: [
      s('alegre', 'Alegre', 'Ganas de sonreír; todo se siente más liviano.', [
        n('liberado', 'Liberado/a', 'Te sacaste un peso de encima.'),
        n('euforico', 'Eufórico/a', 'Una alegría intensa, casi desbordada.'),
      ]),
      s('interesado', 'Interesado/a', 'Algo captó tu atención.', [
        n('entretenido', 'Entretenido/a', 'Lo estás pasando bien.'),
        n('curioso', 'Curioso/a', 'Ganas de saber o de probar más.'),
      ]),
      s('orgulloso', 'Orgulloso/a', 'Te gusta lo que hiciste o lograste.', [
        n('importante', 'Importante', 'Sientes que tu presencia cuenta.'),
        n('seguro', 'Seguro/a', 'Confías en ti y en lo que haces.'),
      ]),
      s('aceptado', 'Aceptado/a', 'Sientes que perteneces, tal como eres.', [
        n('respetado', 'Respetado/a', 'Valoran tus límites y tu palabra.'),
        n('satisfecho', 'Satisfecho/a', 'Tienes lo que necesitabas.'),
      ]),
      s('poderoso', 'Poderoso/a', 'Con fuerza y control sobre tu día.', [
        n('valiente', 'Valiente', 'Te atreviste a algo que costaba.'),
        n('provocativo', 'Provocativo/a', 'Ganas de jugar y de tentar.'),
      ]),
      s('pacifico', 'Pacífico/a', 'Calma por dentro, sin apuro.', [
        n('carinoso', 'Cariñoso/a', 'Ganas de dar y recibir cariño.'),
        n('esperanzado', 'Esperanzado/a', 'Confías en que viene algo bueno.'),
      ]),
      s('intimo', 'Íntimo/a', 'Una cercanía profunda con alguien.', [
        n('sensible', 'Sensible', 'Todo se siente con más intensidad.'),
        n('bromista', 'Bromista', 'Con humor y ganas de jugar.'),
      ]),
      s('optimista', 'Optimista', 'Ves el lado bueno de las cosas.', [
        n('abierto', 'Abierto/a', 'Con disposición a recibir lo que venga.'),
        n('inspirado', 'Inspirado/a', 'Con ideas y ganas de crear.'),
      ]),
    ],
  },
  {
    key: 'sorpresa',
    label: 'Sorpresa',
    desc: 'Algo inesperado te descolocó, para bien o para mal.',
    children: [
      s('sorprendido', 'Sorprendido/a', 'Algo inesperado te tomó desprevenido.', [
        n('conmocionado', 'Conmocionado/a', 'El impacto fue fuerte y aún lo procesas.'),
        n('abatido', 'Abatido/a', 'La sorpresa te dejó sin ánimo.'),
      ]),
      s('confundido', 'Confundido/a', 'No terminas de entender qué pasó.', [
        n('desilusionado', 'Desilusionado/a', 'Lo que esperabas no era como creías.'),
        n('perplejo', 'Perplejo/a', 'Te quedaste sin saber qué pensar.'),
      ]),
      s('asombrado', 'Asombrado/a', 'Algo te maravilló.', [
        n('estupefacto', 'Estupefacto/a', 'Una sorpresa tan grande que no hay palabras.'),
        n('impresionado', 'Impresionado/a', 'Algo te causó admiración.'),
      ]),
      s('entusiasmado', 'Entusiasmado/a', 'Una sorpresa que da ganas de más.', [
        n('entusiasta', 'Entusiasta', 'Con energía positiva para lo que viene.'),
        n('energico', 'Enérgico/a', 'Con el cuerpo encendido y ganas de moverte.'),
      ]),
    ],
  },
  {
    key: 'miedo',
    label: 'Miedo',
    desc: 'Una sensación de amenaza o de no estar a la altura.',
    children: [
      s('humillado', 'Humillado/a', 'Te hicieron sentir menos frente a otros.', [
        n('ridiculizado', 'Ridiculizado/a', 'Se burlaron de ti, o así lo sentiste.'),
        n('irrespetado', 'Irrespetado/a', 'No respetaron tus límites ni tu lugar.'),
      ]),
      s('rechazado', 'Rechazado/a', 'Sientes que no te quieren cerca.', [
        n('alienado', 'Alienado/a', 'Como si no encajaras en ningún lado.'),
        n('marginado', 'Marginado/a', 'Te dejaron afuera.'),
      ]),
      s('sumiso', 'Sumiso/a', 'Cedes por miedo, no por elección.', [
        n('insignificante', 'Insignificante', 'Como si tu presencia no importara.'),
        n('inutil', 'Inútil', 'Sientes que no aportas nada.'),
      ]),
      s('inseguro', 'Inseguro/a', 'Dudas de ti o de tu lugar.', [
        n('inferior', 'Inferior/a', 'Te comparas y sales perdiendo.'),
        n('insuficiente', 'Insuficiente', 'Sientes que lo que haces nunca alcanza.'),
      ]),
      s('ansioso', 'Ansioso/a', 'Inquietud por lo que podría pasar.', [
        n('preocupado', 'Preocupado/a', 'Algo te da vueltas en la cabeza.'),
        n('agobiado', 'Agobiado/a', 'Demasiado encima, cuesta respirar.'),
      ]),
      s('asustado', 'Asustado/a', 'Sientes una amenaza cerca.', [
        n('espantado', 'Espantado/a', 'Un susto fuerte y repentino.'),
        n('aterrado', 'Aterrado/a', 'Un miedo intenso que paraliza.'),
      ]),
    ],
  },
];

export type EmotionFamilyKey = 'ira' | 'asco' | 'tristeza' | 'felicidad' | 'sorpresa' | 'miedo';

export interface EmotionPath {
  family: EmotionFamily;
  sub: EmotionSub;
  leaf: EmotionNode | null;
  /** La emoción más precisa elegida (leaf o, si no hay, el matiz). */
  emotion: EmotionNode;
}

/** Interpreta 'familia.matiz' o 'familia.matiz.emocion'. Devuelve null si no existe. */
export function parseEmotion(value: string | null | undefined): EmotionPath | null {
  if (!value) return null;
  const [fk, sk, lk, ...rest] = value.split('.');
  if (rest.length) return null;
  const family = EMOTION_FAMILIES.find((f) => f.key === fk);
  const sub = family?.children.find((x) => x.key === sk);
  if (!family || !sub) return null;
  if (lk === undefined) return { family, sub, leaf: null, emotion: sub };
  const leaf = sub.children.find((x) => x.key === lk);
  return leaf ? { family, sub, leaf, emotion: leaf } : null;
}

export const isEmotion = (value: string) => parseEmotion(value) !== null;
