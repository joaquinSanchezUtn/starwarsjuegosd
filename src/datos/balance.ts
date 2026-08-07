// ============================================================================
// ARCHIVO ÚNICO DE BALANCE
// Todos los números de vida, daño, alcance, velocidad, costo y tiempos del
// juego viven acá. No hardcodear stats en ningún otro archivo: si hace falta
// ajustar el juego, se ajusta este archivo.
// ============================================================================
import type {
  DatosUnidad,
  TipoUnidad,
  TrianguloContras,
  DatosBase,
  DatosMina,
  DatosEconomia,
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
// Unidades. Coalición y Enjambre son simétricas en stats (mismo rol/tier),
// salvo el crucero, que está desbalanceado a propósito (ver más abajo).
// ---------------------------------------------------------------------------
export const UNIDADES: Record<Faccion, Record<TipoUnidad, DatosUnidad>> = {
  coalicion: {
    cazaLigero: {
      tipo: 'cazaLigero',
      nombre: { coalicion: 'Vencejo', enjambre: 'Rapaz' },
      vidaMax: 40,
      danio: 7,
      alcance: 90,
      velocidad: 150,
      cadenciaFuegoMs: 500,
      costo: 50,
      tiempoProduccionMs: 4000,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1,
    },
    cazaPesado: {
      tipo: 'cazaPesado',
      nombre: { coalicion: 'Alabarda', enjambre: 'Alacrán' },
      vidaMax: 95,
      danio: 13,
      alcance: 110,
      velocidad: 105,
      cadenciaFuegoMs: 650,
      costo: 95,
      tiempoProduccionMs: 7500,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.3,
    },
    bombardero: {
      tipo: 'bombardero',
      nombre: { coalicion: 'Yunque', enjambre: 'Chacal' },
      vidaMax: 65,
      danio: 9,
      alcance: 100,
      velocidad: 75,
      cadenciaFuegoMs: 1300,
      costo: 100,
      tiempoProduccionMs: 8000,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.5,
    },
    fragata: {
      tipo: 'fragata',
      nombre: { coalicion: 'Bastión', enjambre: 'Espina' },
      vidaMax: 420,
      danio: 18,
      alcance: 170,
      velocidad: 45,
      cadenciaFuegoMs: 850,
      costo: 320,
      tiempoProduccionMs: 22000,
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
      danio: 0,
      alcance: 0,
      velocidad: 95,
      cadenciaFuegoMs: 0,
      costo: 60,
      tiempoProduccionMs: 5000,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 2,
      sinArmas: true,
      escalaVisual: 1,
    },
  },
  enjambre: {
    cazaLigero: {
      tipo: 'cazaLigero',
      nombre: { coalicion: 'Vencejo', enjambre: 'Rapaz' },
      vidaMax: 40,
      danio: 7,
      alcance: 90,
      velocidad: 150,
      cadenciaFuegoMs: 500,
      costo: 50,
      tiempoProduccionMs: 4000,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1,
    },
    cazaPesado: {
      tipo: 'cazaPesado',
      nombre: { coalicion: 'Alabarda', enjambre: 'Alacrán' },
      vidaMax: 95,
      danio: 13,
      alcance: 110,
      velocidad: 105,
      cadenciaFuegoMs: 650,
      costo: 95,
      tiempoProduccionMs: 7500,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.3,
    },
    bombardero: {
      tipo: 'bombardero',
      nombre: { coalicion: 'Yunque', enjambre: 'Chacal' },
      vidaMax: 65,
      danio: 9,
      alcance: 100,
      velocidad: 75,
      cadenciaFuegoMs: 1300,
      costo: 100,
      tiempoProduccionMs: 8000,
      nivelBaseRequerido: 2,
      multiplicadorCaptura: 1,
      sinArmas: false,
      escalaVisual: 1.5,
    },
    fragata: {
      tipo: 'fragata',
      nombre: { coalicion: 'Bastión', enjambre: 'Espina' },
      vidaMax: 420,
      danio: 18,
      alcance: 170,
      velocidad: 45,
      cadenciaFuegoMs: 850,
      costo: 320,
      tiempoProduccionMs: 22000,
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
      vidaMax: 55,
      danio: 0,
      alcance: 0,
      velocidad: 95,
      cadenciaFuegoMs: 0,
      costo: 60,
      tiempoProduccionMs: 5000,
      nivelBaseRequerido: 1,
      multiplicadorCaptura: 2,
      sinArmas: true,
      escalaVisual: 1,
    },
  },
};

// ---------------------------------------------------------------------------
// Triángulo de contras: multiplicador de daño extra cuando el atacante
// (clave externa) golpea al tipo de objetivo (clave interna).
// ---------------------------------------------------------------------------
export const TRIANGULO_CONTRAS: TrianguloContras = {
  cazaLigero: { bombardero: 1.6, captura: 2.5 },
  cazaPesado: { cazaLigero: 1.5 },
  // fragata es un blanco de un solo objetivo con cadencia lenta: para que
  // realmente le gane a un enjambre de cazas del mismo costo (y no solo
  // "en teoría") el multiplicador tiene que ser bastante más alto que en
  // los otros pares — ver herramientas/simulador-balance.ts.
  fragata: { cazaLigero: 2.5, cazaPesado: 2.2 },
  bombardero: { fragata: 3, base: 2.2, mina: 1.5 },
};

// ---------------------------------------------------------------------------
// Crucero: comportamiento especial de portanaves (solo Coalición)
// ---------------------------------------------------------------------------
export const CRUCERO_ESPECIAL: Record<Faccion, DatosCrucero> = {
  coalicion: { intervaloLanzamientoMs: 18000, maxCazasLanzados: 3 },
  enjambre: {},
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
// Mina de recursos
// ---------------------------------------------------------------------------
export const MINA: DatosMina = {
  vidaMax: 180,
  ingresoPorSegundo: 4,
  tiempoCapturaMs: 6000,
  tiempoRegeneracionMs: 18000,
};

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
