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
  | 'captura'
  /** Estilete: interceptor de élite, exclusivo de la Coalición (ver DatosUnidad.exclusivaDe) */
  | 'interceptor'
  /** Guadaña: destructor esquelético semi-capital, exclusivo del Enjambre */
  | 'destructor';

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
  /** costo en créditos de UNA orden de producción (puede entregar más de una nave, ver cantidadPorOrden) */
  costo: number;
  /** tiempo en ms de UNA orden de producción completa */
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
  /** cuántas naves entrega una sola orden de producción (Enjambre: cazaLigero sale en tandas de 3) */
  cantidadPorOrden?: number;
  /** vida máxima de escudo regenerativo (solo Coalición); ausente/0 = sin escudo */
  escudoMax?: number;
  /** velocidad de regeneración de escudo, en puntos/segundo, una vez que empieza a regenerar */
  escudoRegenPorSegundo?: number;
  /**
   * Si está seteado, esta nave es EXCLUSIVA de esa facción (Estilete de
   * Coalición, Guadaña de Enjambre): la entrada simétrica en la otra facción
   * existe solo para satisfacer el tipo Record<Faccion, ...> pero nunca se
   * produce ni la usa la IA — ver `unidadDisponible()` en balance.ts.
   */
  exclusivaDe?: Faccion;
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

/** Bonos de la mejora de mina (1 nivel, se pierde si la mina es destruida) y del filón rico. */
export interface DatosMejoraMina {
  costo: number;
  bonoIngresoFraccion: number; // ej 0.5 = +50% ingreso
  bonoVidaFraccion: number; // ej 0.5 = +50% vida máxima
  multiplicadorMinaRica: number; // ingreso ×2 en minas del centro del mapa
}

export interface DatosEconomia {
  goteoPorSegundo: number;
  creditosInicialesEstandar: number;
  multiplicadorDificultad: Record<Dificultad, number>;
}

/** Chatarra recolectable que dejan las naves grandes (fragata en adelante) al morir. */
export interface DatosChatarra {
  escalaVisualMinima: number; // solo naves con escalaVisual >= este valor dejan chatarra
  fraccionValorCosto: number; // valor del botín = costo de la nave destruida × esta fracción
  radioRecoleccionPx: number;
  tiempoVidaMs: number;
}

export type TipoHabilidadCrucero = 'andanadaTotal' | 'enjambreEmergencia';

export interface DatosCrucero {
  /** cada cuántos ms lanza gratis un caza liviano (solo Coalición) */
  intervaloLanzamientoMs?: number;
  maxCazasLanzados?: number;
  /** Habilidad activa con cooldown, botón en HUD (una por crucero) */
  tipoHabilidad: TipoHabilidadCrucero;
  cooldownHabilidadMs: number;
  /** andanadaTotal (Coalición): multiplicador de daño y ancho del cono frontal */
  multiplicadorAndanada?: number;
  anguloConoAndanadaGrados?: number;
  /** enjambreEmergencia (Enjambre): cazas gratis de vida útil corta */
  cantidadDronesEmergencia?: number;
  vidaUtilDronMs?: number;
}

/** Ramas del árbol tecnológico de base, 2 niveles cada una. */
export interface NivelesTecnologia {
  armamento: 0 | 1 | 2;
  defensa: 0 | 1 | 2;
}

export interface ModificadoresTecnologia {
  danioMult: number;
  vidaMult: number;
  regenEscudoMult: number;
  velocidadProduccionMult: number;
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
  /** cuántas naves entrega esta orden al completarse (ver DatosUnidad.cantidadPorOrden) */
  cantidad: number;
}

