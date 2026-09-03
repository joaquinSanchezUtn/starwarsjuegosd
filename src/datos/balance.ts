// ============================================================================
// ARCHIVO ÚNICO DE BALANCE
// Todos los números de vida, daño, alcance, velocidad, costo y tiempos del
// juego viven acá. No hardcodear stats en ningún otro archivo: si hace falta
// ajustar el juego, se ajusta este archivo.
//
// PROMPT 2 — asimetría de bandos: la Coalición y el Enjambre YA NO son
// espejos (salvo el crucero, que sigue siendo el único desbalance a
// propósito). Ver DECISIONES.md para la justificación completa de cada
// número. Resumen de identidad:
//   - Coalición = calidad: más cara, más lenta de producir, más resistente
//     (escudos regenerativos fuera de combate), más versátil.
//   - Enjambre = cantidad: más barata, producción más rápida (y el caza
//     liviano sale en tandas de 3 por orden), más frágil, sin escudos.
// ============================================================================
import type {
  DatosUnidad,
  TipoUnidad,
  TrianguloContras,
  DatosBase,
  DatosMina,
  DatosMejoraMina,
  DatosEconomia,
  DatosChatarra,
  DatosCrucero,
  Faccion,
} from '../nucleo/tipos.ts';

// ---------------------------------------------------------------------------
// Nombres propios de cada nave, por bando. Inventados para este juego.
// ---------------------------------------------------------------------------
export const NOMBRE_BASE: Record<Faccion, string> = {
  coalicion: 'Ciudadela Orbital',
  enjambre: 'Núcleo Colmena',
};

// ---------------------------------------------------------------------------
// Unidades. Ver DECISIONES.md, sección "Asimetría de bandos", para el
// razonamiento y las simulaciones detrás de cada número.
// ---------------------------------------------------------------------------
export const UNIDADES: Record<Faccion, Record<TipoUnidad, DatosUnidad>> = {
  coalicion: {
    cazaLigero: {
      tipo: 'cazaLigero',
      nombre: { coalicion: 'Vencejo', enjambre: 'Rapaz' },
      vidaMax: 42,
      escudoMax: 24,
      escudoRegenPorSegundo: 3.5,
      danio: 7,
      alcance: 90,
      velocidad: 148,
      cadenciaFuegoMs: 500,
      costo: 60,
      tiempoProduccionMs: 4200,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1,
    },
    cazaPesado: {
      tipo: 'cazaPesado',
      nombre: { coalicion: 'Alabarda', enjambre: 'Alacrán' },
      vidaMax: 100,
      escudoMax: 25,
      escudoRegenPorSegundo: 5,
      danio: 13,
      alcance: 110,
      velocidad: 100,
      cadenciaFuegoMs: 650,
      costo: 105,
      tiempoProduccionMs: 7800,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.3,
    },
    bombardero: {
      tipo: 'bombardero',
      nombre: { coalicion: 'Yunque', enjambre: 'Chacal' },
      vidaMax: 70,
      escudoMax: 18,
      escudoRegenPorSegundo: 3.6,
      danio: 9,
      alcance: 100,
      velocidad: 72,
      cadenciaFuegoMs: 1300,
      costo: 110,
      tiempoProduccionMs: 8500,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.5,
    },
    fragata: {
      tipo: 'fragata',
      nombre: { coalicion: 'Bastión', enjambre: 'Espina' },
      vidaMax: 460,
      escudoMax: 110,
      escudoRegenPorSegundo: 20,
      danio: 19,
      alcance: 170,
      velocidad: 42,
      cadenciaFuegoMs: 850,
      costo: 350,
      tiempoProduccionMs: 24000,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 3,
    },
    crucero: {
      tipo: 'crucero',
      nombre: { coalicion: 'Custodio', enjambre: 'Devorador' },
      // Desbalanceado a propósito: ver DECISIONES.md
      vidaMax: 2400,
      escudoMax: 300,
      escudoRegenPorSegundo: 40,
      danio: 42,
      alcance: 210,
      velocidad: 32,
      cadenciaFuegoMs: 750,
      costo: 1500,
      tiempoProduccionMs: 95000,
      nivelBaseRequerido: 3,
      multiplicadorCaptura: 1,
      sinArmas: false,
      radioDanioArea: 90,
      escalaVisual: 5.5,
    },
    captura: {
      tipo: 'captura',
      nombre: { coalicion: 'Zarpa', enjambre: 'Garra' },
      vidaMax: 55,
      escudoMax: 10,
      escudoRegenPorSegundo: 3,
      danio: 0,
      alcance: 0,
      velocidad: 95,
      cadenciaFuegoMs: 0,
      costo: 65,
      tiempoProduccionMs: 5000,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 2,
      sinArmas: true,
      escalaVisual: 1,
    },
    // Estilete: interceptor de élite, el "as" de la Coalición. Carísimo para
    // su tamaño, el más rápido del juego, mucho daño, muy frágil (vida de
    // caza) pero con un escudo grande que sostiene su fragilidad un rato.
    interceptor: {
      tipo: 'interceptor',
      nombre: { coalicion: 'Estilete', enjambre: 'Estilete' },
      vidaMax: 55,
      escudoMax: 55,
      escudoRegenPorSegundo: 8,
      danio: 22,
      alcance: 95,
      velocidad: 210,
      cadenciaFuegoMs: 420,
      costo: 260,
      tiempoProduccionMs: 14000,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 0.9,
      exclusivaDe: 'coalicion',
    },
    // Guadaña: entrada inerte del lado Coalición (nunca se produce ni la usa
    // la IA de este bando; existe solo para que el Record sea exhaustivo).
    destructor: {
      tipo: 'destructor',
      nombre: { coalicion: 'Guadaña', enjambre: 'Guadaña' },
      vidaMax: 650,
      danio: 32,
      alcance: 180,
      velocidad: 55,
      cadenciaFuegoMs: 900,
      costo: 620,
      tiempoProduccionMs: 32000,
      nivelBaseRequerido: 3,
      multiplicadorCaptura: 1,
      sinArmas: false,
      radioDanioArea: 40,
      escalaVisual: 4,
      exclusivaDe: 'enjambre',
    },
  },
  enjambre: {
    cazaLigero: {
      tipo: 'cazaLigero',
      nombre: { coalicion: 'Vencejo', enjambre: 'Rapaz' },
      vidaMax: 32,
      danio: 7,
      alcance: 90,
      velocidad: 158,
      // Misma cadencia que el Vencejo a propósito: el Rapaz ya tiene su
      // ventaja de "cantidad" en el costo por nave (40cr vs 60cr) y en el
      // tamaño de la tanda; sumarle también más disparos por segundo lo
      // dejaba ganando 100% de las simulaciones a costo igual (ver
      // DECISIONES.md) en vez del resultado parejo buscado.
      cadenciaFuegoMs: 500,
      // costo/tiempo son de LA ORDEN completa: produce 3 Rapaces de una, a
      // 40cr/nave equivalentes — más barato y rápido por unidad que el Vencejo.
      costo: 120,
      tiempoProduccionMs: 4800,
      cantidadPorOrden: 3,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1,
    },
    cazaPesado: {
      tipo: 'cazaPesado',
      nombre: { coalicion: 'Alabarda', enjambre: 'Alacrán' },
      vidaMax: 78,
      danio: 14,
      alcance: 110,
      velocidad: 112,
      cadenciaFuegoMs: 620,
      costo: 85,
      tiempoProduccionMs: 6000,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.3,
    },
    bombardero: {
      tipo: 'bombardero',
      nombre: { coalicion: 'Yunque', enjambre: 'Chacal' },
      vidaMax: 52,
      danio: 10,
      alcance: 100,
      velocidad: 82,
      cadenciaFuegoMs: 1250,
      costo: 85,
      tiempoProduccionMs: 6200,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.5,
    },
    fragata: {
      tipo: 'fragata',
      nombre: { coalicion: 'Bastión', enjambre: 'Espina' },
      vidaMax: 340,
      danio: 19,
      alcance: 170,
      velocidad: 50,
      // Misma cadencia que el Bastión a propósito, mismo motivo que el
      // Rapaz: la ventaja de costo ya está en el precio por nave.
      cadenciaFuegoMs: 850,
      costo: 260,
      tiempoProduccionMs: 17000,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 3,
    },
    crucero: {
      tipo: 'crucero',
      nombre: { coalicion: 'Custodio', enjambre: 'Devorador' },
      // Deliberadamente inferior al Custodio: ver DECISIONES.md
      vidaMax: 1500,
      danio: 26,
      alcance: 190,
      velocidad: 34,
      cadenciaFuegoMs: 850,
      costo: 950,
      tiempoProduccionMs: 55000,
      nivelBaseRequerido: 3,
      multiplicadorCaptura: 1,
      sinArmas: false,
      radioDanioArea: 60,
      escalaVisual: 5.5,
    },
    captura: {
      tipo: 'captura',
      nombre: { coalicion: 'Zarpa', enjambre: 'Garra' },
      vidaMax: 45,
      danio: 0,
      alcance: 0,
      velocidad: 100,
      cadenciaFuegoMs: 0,
      costo: 50,
      tiempoProduccionMs: 4000,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 2,
      sinArmas: true,
      escalaVisual: 1,
    },
    // Entrada inerte del lado Enjambre (ver Estilete arriba).
    interceptor: {
      tipo: 'interceptor',
      nombre: { coalicion: 'Estilete', enjambre: 'Estilete' },
      vidaMax: 55,
      escudoMax: 55,
      escudoRegenPorSegundo: 8,
      danio: 22,
      alcance: 95,
      velocidad: 210,
      cadenciaFuegoMs: 420,
      costo: 260,
      tiempoProduccionMs: 14000,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 0.9,
      exclusivaDe: 'coalicion',
    },
    // Guadaña: destructor esquelético, semi-capital del Enjambre. Más barato
    // y rápido de construir que un crucero, pega fuerte, pero mucha menos
    // vida por crédito invertido que un crucero o incluso que una fragata:
    // "se rompe fácil". Le da al Enjambre una segunda opción de nivel 3
    // (además del Devorador) que refuerza la fantasía de cantidad.
    destructor: {
      tipo: 'destructor',
      nombre: { coalicion: 'Guadaña', enjambre: 'Guadaña' },
      vidaMax: 650,
      danio: 32,
      alcance: 180,
      velocidad: 55,
      cadenciaFuegoMs: 900,
      costo: 620,
      tiempoProduccionMs: 32000,
      nivelBaseRequerido: 3,
      multiplicadorCaptura: 1,
      sinArmas: false,
      radioDanioArea: 40,
      escalaVisual: 4,
      exclusivaDe: 'enjambre',
    },
  },
};

/**
 * true si `faccion` puede producir/usar `tipo`. Filtra las naves exclusivas
 * del otro bando (Estilete/Guadaña) y respeta el nivel de base requerido.
 * HUD, Producción e IA deben usar siempre esta función en vez de leer
 * `nivelBaseRequerido` a mano, para no reintroducir naves "espejo".
 */
export function unidadDisponible(faccion: Faccion, tipo: TipoUnidad, nivelBase: number): boolean {
  const datos = UNIDADES[faccion][tipo];
  if (datos.exclusivaDe && datos.exclusivaDe !== faccion) return false;
  return datos.nivelBaseRequerido <= nivelBase;
}

/** Lista de tipos que `faccion` puede llegar a producir alguna vez (para paneles de UI/IA). */
export function tiposDisponiblesParaFaccion(faccion: Faccion): TipoUnidad[] {
  return (Object.keys(UNIDADES[faccion]) as TipoUnidad[]).filter((t) => {
    const datos = UNIDADES[faccion][t];
    return !datos.exclusivaDe || datos.exclusivaDe === faccion;
  });
}

// ---------------------------------------------------------------------------
// Triángulo de contras: multiplicador de daño extra cuando el atacante
// (clave externa) golpea al tipo de objetivo (clave interna).
// ---------------------------------------------------------------------------
export const TRIANGULO_CONTRAS: TrianguloContras = {
  cazaLigero: { bombardero: 1.6, captura: 2.5 },
  // fragata es un blanco de un solo objetivo con cadencia lenta: para que
  // realmente le gane a un enjambre de cazas del mismo costo (y no solo
  // "en teoría") el multiplicador tiene que ser bastante más alto que en
  // los otros pares — ver herramientas/simulador-balance.ts.
  cazaPesado: { cazaLigero: 1.5, interceptor: 1.4 },
  fragata: { cazaLigero: 2.5, cazaPesado: 2.2 },
  bombardero: { fragata: 3, base: 2.2, mina: 1.5, destructor: 2.2 },
  // Estilete (interceptor): as cazador de apoyo — caza a los cazas pesados y
  // bombarderos rivales antes de que hagan su trabajo; el cazaPesado es su
  // contra dedicada (arriba), así que el ciclo no es un absoluto.
  interceptor: { cazaPesado: 1.6, bombardero: 2 },
};

// ---------------------------------------------------------------------------
// Crucero: comportamiento especial de portanaves y habilidad activa.
// ---------------------------------------------------------------------------
export const CRUCERO_ESPECIAL: Record<Faccion, DatosCrucero> = {
  coalicion: {
    intervaloLanzamientoMs: 18000,
    maxCazasLanzados: 3,
    tipoHabilidad: 'andanadaTotal',
    cooldownHabilidadMs: 30000,
    multiplicadorAndanada: 3.2,
    anguloConoAndanadaGrados: 110,
  },
  enjambre: {
    tipoHabilidad: 'enjambreEmergencia',
    cooldownHabilidadMs: 35000,
    cantidadDronesEmergencia: 5,
    vidaUtilDronMs: 20000,
  },
};

// ---------------------------------------------------------------------------
// Escudos: parámetros globales que no dependen de la nave.
// ---------------------------------------------------------------------------
export const ESCUDOS = {
  /** ms sin recibir daño antes de que un escudo empiece a regenerar */
  retrasoRegenMs: 3000,
};

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------
export const BASE: DatosBase = {
  vidaMax: 3000,
  danioDefensa: 22,
  alcanceDefensa: 220,
  cadenciaDefensaMs: 700,
  costoSubirNivel: { 2: 400, 3: 1000 },
  tiempoSubirNivelMs: { 2: 20000, 3: 40000 },
};

// ---------------------------------------------------------------------------
// Mina de recursos, filón rico y mejora de mina.
// ---------------------------------------------------------------------------
export const MINA: DatosMina = {
  vidaMax: 180,
  ingresoPorSegundo: 4,
  tiempoCapturaMs: 6000,
  tiempoRegeneracionMs: 18000,
};

export const MEJORA_MINA: DatosMejoraMina = {
  costo: 150,
  bonoIngresoFraccion: 0.5,
  bonoVidaFraccion: 0.5,
  multiplicadorMinaRica: 2,
};

// ---------------------------------------------------------------------------
// Chatarra: botín recolectable que dejan fragatas/destructores/cruceros.
// ---------------------------------------------------------------------------
export const CHATARRA: DatosChatarra = {
  escalaVisualMinima: 3, // fragata (3), destructor (4) y crucero (5.5) califican
  fraccionValorCosto: 0.16,
  radioRecoleccionPx: 45,
  tiempoVidaMs: 45000,
};

// ---------------------------------------------------------------------------
// Árbol tecnológico de base: 2 ramas × 2 niveles, comprado con créditos.
// ---------------------------------------------------------------------------
export const COSTO_TECNOLOGIA: Record<'armamento' | 'defensa', [number, number]> = {
  armamento: [300, 700],
  defensa: [300, 700],
};

/** +daño por nivel de armamento (multiplicativo, aplica en vivo a toda la flota). */
export const BONO_DANIO_POR_NIVEL = 0.08;
/** +vida máxima por nivel de defensa (aplica a naves construidas después de comprarlo). */
export const BONO_VIDA_POR_NIVEL = 0.1;
/** Coalición: +velocidad de regeneración de escudo por nivel de defensa. */
export const BONO_REGEN_ESCUDO_POR_NIVEL = 0.25;
/** Enjambre: +velocidad de producción (resta % de tiempo) por nivel de defensa. */
export const BONO_VELOCIDAD_PRODUCCION_POR_NIVEL = 0.12;

// ---------------------------------------------------------------------------
// Economía y dificultad
// ---------------------------------------------------------------------------
export const ECONOMIA: DatosEconomia = {
  goteoPorSegundo: 1,
  creditosInicialesEstandar: 300,
  multiplicadorDificultad: {
    facil: 3,
    normal: 1,
    dificil: 0.5,
  },
};

export const CANTIDAD_MINAS_MAPA = 8;
