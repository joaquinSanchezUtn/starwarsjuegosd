// Contrato entre el motor del juego y la IA enemiga. La IA se programa contra
// esta interfaz únicamente: no conoce Phaser ni las clases concretas de
// entidades. El motor (EscenaJuego) implementa ApiJuegoParaIA con un
// adaptador real; así la lógica de la IA se puede escribir y testear en
// paralelo al resto del motor.
import type { Faccion, TipoUnidad, NivelBase } from '../nucleo/tipos.ts';

export interface InfoUnidadIA {
  id: number;
  tipo: TipoUnidad;
  faccion: Faccion;
  x: number;
  y: number;
  vida: number;
  vidaMax: number;
  /** true si está en este momento capturando una mina */
  capturando: boolean;
}

export interface InfoMinaIA {
  id: number;
  x: number;
  y: number;
  /** null = neutral, no controlada por nadie */
  duenio: Faccion | null;
  vida: number;
  vidaMax: number;
  /** true mientras está destruida, esperando regenerarse */
  destruida: boolean;
}

export interface InfoBaseIA {
  faccion: Faccion;
  x: number;
  y: number;
  vida: number;
  vidaMax: number;
  nivel: NivelBase;
  subiendoNivel: boolean;
}

export interface ApiJuegoParaIA {
  obtenerCreditos(faccion: Faccion): number;
  obtenerIngresoPorSegundo(faccion: Faccion): number;
  obtenerBase(faccion: Faccion): InfoBaseIA;
  obtenerUnidades(faccion: Faccion): InfoUnidadIA[];
  obtenerMinas(): InfoMinaIA[];
  /** Encola una unidad en la base de `faccion`. false si no hay créditos o nivel insuficiente. */
  producirUnidad(faccion: Faccion, tipo: TipoUnidad): boolean;
  /** Largo actual de la cola de producción (para no acumular pedidos de más). */
  obtenerLargoColaProduccion(faccion: Faccion): number;
  /** Inicia la subida de nivel de la base si hay créditos y no está subiendo ya. */
  subirNivelBase(faccion: Faccion): boolean;
  /** Mueve un grupo de unidades (por id) a una posición del mundo. */
  ordenarMover(idsUnidades: number[], x: number, y: number): void;
  /** Ataca un objetivo: otra unidad, la base rival, o una mina. */
  ordenarAtacar(idsUnidades: number[], idObjetivo: number, tipoObjetivo: 'unidad' | 'base' | 'mina'): void;
  /** Ordena capturar/recapturar una mina (se mueve y captura solo al llegar). */
  ordenarCapturar(idsUnidades: number[], idMina: number): void;
  /** Dimensiones del mundo, para no ordenar movimientos fuera de mapa. */
  obtenerLimitesMundo(): { ancho: number; alto: number };
}
