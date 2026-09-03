// Constantes de tamaño visual. El caza liviano mide LARGO_BASE_PX de largo;
// el resto de las naves escalan sobre esa base según DatosUnidad.escalaVisual
// (definido en balance.ts): caza 1x, caza pesado 1.3x, bombardero 1.5x,
// fragata 3x, crucero 5.5x, interceptor 0.9x, destructor 4x.
import type { TipoUnidad } from '../nucleo/tipos.ts';

export const LARGO_BASE_PX = 24;

/**
 * Offset en px de la sombra proyectada de cada nave sobre el fondo estelar,
 * usado por `render/vfx/Sombras.ts` para dar sensación de altura/profundidad
 * (semi-3D): los cazas "vuelan" más alto (sombra más separada del casco) que
 * las naves grandes, que se sienten pegadas al plano de batalla.
 */
export function offsetSombraPx(tipo: TipoUnidad): number {
  switch (tipo) {
    case 'cazaLigero':
    case 'captura':
      return 14;
    case 'interceptor':
      return 16;
    case 'cazaPesado':
    case 'bombardero':
      return 11;
    case 'fragata':
      return 6;
    case 'destructor':
      return 5;
    case 'crucero':
      return 4;
  }
}

/**
 * Intensidad relativa (0-1) del efecto de banking (escora al girar): los
 * cazas se escoran marcadamente, las naves grandes apenas se inclinan.
 */
export function intensidadBankingPorTipo(tipo: TipoUnidad): number {
  switch (tipo) {
    case 'cazaLigero':
    case 'captura':
    case 'interceptor':
      return 1;
    case 'cazaPesado':
    case 'bombardero':
      return 0.55;
    case 'fragata':
    case 'destructor':
      return 0.22;
    case 'crucero':
      return 0.12;
  }
}

/**
 * Velocidad angular máxima (rad/seg) a la que una nave reorienta su casco
 * hacia el rumbo objetivo. Da sensación de inercia/masa en naves grandes
 * (giran despacio) y de agilidad en cazas (giran casi instantáneo). Es
 * puramente visual: el alcance de combate se sigue midiendo por distancia,
 * no por hacia dónde mira el casco, así que esto no afecta el balance.
 */
export function velocidadAngularMaxPorTipo(tipo: TipoUnidad): number {
  switch (tipo) {
    case 'cazaLigero':
    case 'captura':
    case 'interceptor':
      return 14;
    case 'cazaPesado':
    case 'bombardero':
      return 7;
    case 'fragata':
    case 'destructor':
      return 3;
    case 'crucero':
      return 1.6;
  }
}

// Tamaño del ícono de base jugable (estación / anillo con esfera).
export const RADIO_BASE_JUGADOR_PX = 70;

// Tamaño del ícono de mina en el mapa.
export const RADIO_MINA_PX = 16;

// Radio dentro del cual una nave cuenta como "presente" para capturar/defender una mina.
export const RADIO_CAPTURA_MINA_PX = 65;

// Radio dentro del cual la defensa de la base ataca automáticamente.
export const RADIO_SELECCION_CLICK_PX = 14;
