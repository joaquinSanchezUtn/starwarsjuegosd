// Tipos centrales compartidos por todo el juego.
// Este archivo es el "contrato" entre módulos: motor, arte, IA, UI y balance
// se codifican todos contra estas definiciones.

export type Faccion = 'coalicion' | 'enjambre';

export type TipoUnidad =
  | 'cazaLigero'
  | 'cazaPesado'
  | 'bombardero'
  | 'fragata'
  | 'crucero'
  | 'captura';

export type TipoObjetivo = TipoUnidad | 'base' | 'mina';

export type NivelBase = 1 | 2 | 3;

export type Dificultad = 'facil' | 'normal' | 'dificil';

export interface DatosUnidad {
  tipo: TipoUnidad;
  /** Nombre propio en español, uno por bando */
  nombre: Record<Faccion, string>;
  vidaMax: number;
  danio: number;
  alcance: number; // px
  velocidad: number; // px/seg
  cadenciaFuegoMs: number;
  costo: number; // créditos
  tiempoProduccionMs: number;
  nivelBaseRequerido: NivelBase;
  /** multiplicador de velocidad de captura de minas (1 = normal, 2 = mitad de tiempo) */
  multiplicadorCaptura: number;
  /** true si la unidad no puede disparar (ej. nave de captura) */
  sinArmas: boolean;
  /** radio de daño en área, si aplica */
  radioDanioArea?: number;
  /** escala visual relativa al caza liviano (1x) */
  escalaVisual: number;
}

/** Multiplicador de daño cuando `atacante` ataca a `defensor`. Triángulo de contras. */
export type TrianguloContras = Partial<
  Record<TipoUnidad, Partial<Record<TipoObjetivo, number>>>
>;

export interface DatosBase {
  vidaMax: number;
  danioDefensa: number;
  alcanceDefensa: number;
  cadenciaDefensaMs: number;
  costoSubirNivel: Record<2 | 3, number>;
  tiempoSubirNivelMs: Record<2 | 3, number>;
}

export interface DatosMina {
  vidaMax: number;
  ingresoPorSegundo: number;
  tiempoCapturaMs: number;
  tiempoRegeneracionMs: number;
}

export interface DatosEconomia {
  goteoPorSegundo: number;
  creditosInicialesEstandar: number;
  multiplicadorDificultad: Record<Dificultad, number>;
}

export interface DatosCrucero {
  /** cada cuántos ms lanza gratis un caza liviano (solo Coalición) */
  intervaloLanzamientoMs?: number;
  maxCazasLanzados?: number;
}

export interface EstadoJuego {
  creditos: Record<Faccion, number>;
  ingresoPorSegundo: Record<Faccion, number>;
  minasControladas: Record<Faccion, number>;
  nivelBase: Record<Faccion, NivelBase>;
}

/**
 * Contrato uniforme para todo lo que puede recibir daño y ser blanco de
 * ataque: naves, bases y minas. El sistema de combate y el triángulo de
 * contras operan siempre contra esta interfaz.
 */
export interface ObjetivoAtacable {
  readonly id: number;
  readonly tipoObjetivo: TipoObjetivo;
  readonly faccion: Faccion;
  x: number;
  y: number;
  vida: number;
  vidaMax: number;
  estaVivo(): boolean;
  recibirDanio(cantidad: number, tipoAtacante: TipoUnidad): void;
}

export interface ItemColaProduccion {
  tipo: TipoUnidad;
  tiempoTotalMs: number;
  tiempoRestanteMs: number;
}

