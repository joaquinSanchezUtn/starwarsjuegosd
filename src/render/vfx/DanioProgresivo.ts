// Daño progresivo: bajo 50% de vida la nave larga humo; bajo 25%, fuego.
// Emisión propia throttled (una nave dañada emite cada 220ms, no cada
// frame), y pooled a través de los emisores compartidos de `efectos.ts`
// (humo/fuego/chispa) en vez de crear un GameObject nuevo a mano — en una
// batalla masiva y prolongada, tener 10-20 naves simultáneamente por debajo
// del 50% de vida es el escenario normal, no la excepción (encontrado en la
// ronda de QA adversarial), así que este efecto necesita el mismo pooling
// que el resto.
import type Phaser from 'phaser';
import { emitirHumoProgresivo, emitirFuegoProgresivo } from '../efectos.ts';

export interface EfectoDanioProgresivo {
  actualizar(fraccionVida: number, dtMs: number): void;
  destroy(): void;
}

const INTERVALO_EMISION_MS = 220;
const UMBRAL_HUMO = 0.5;
const UMBRAL_FUEGO = 0.25;

export function crearEfectoDanioProgresivo(
  escena: Phaser.Scene,
  nave: { x: number; y: number },
  largo: number,
): EfectoDanioProgresivo {
  let acumuladoMs = 0;

  return {
    actualizar(fraccionVida: number, dtMs: number) {
      if (fraccionVida >= UMBRAL_HUMO) return;
      acumuladoMs += dtMs;
      if (acumuladoMs < INTERVALO_EMISION_MS) return;
      acumuladoMs = 0;

      const px = nave.x + (Math.random() - 0.5) * largo * 0.5;
      const py = nave.y + (Math.random() - 0.5) * largo * 0.3;
      if (fraccionVida < UMBRAL_FUEGO) emitirFuegoProgresivo(escena, px, py);
      else emitirHumoProgresivo(escena, px, py);
    },
    destroy() {
      // Sin temporizadores propios que limpiar: la emisión ocurre dentro de actualizar().
    },
  };
}
