// Sombra proyectada de cada nave sobre el fondo estelar: da sensación de
// altura/profundidad (semi-3D) sin necesitar un motor 3D real.
//
// TÉCNICA ELEGIDA (ver DECISIONES.md): en vez de capturar la silueta exacta
// de cada nave (requeriría una RenderTexture por nave y redibujarla cada vez
// que cambia de forma), se usa un óvalo simple y barato (una única `Ellipse`
// por nave, actualizada de posición una vez por frame, sin volver a
// dibujarse nunca) desplazado según una dirección de luz FIJA para todo el
// mapa (el sol del sistema no se mueve). El desplazamiento (offsetPx) varía
// por tipo de nave — los cazas "vuelan" más alto que los cruceros — así que
// la separación entre casco y sombra ya comunica la jerarquía de tamaños.
import Phaser from 'phaser';
import type { Faccion, TipoUnidad } from '../../nucleo/tipos.ts';

// Dirección de luz global normalizada (arriba-izquierda), constante para toda la partida.
const LUZ_X = 0.55;
const LUZ_Y = 0.78;
const NORMA = Math.hypot(LUZ_X, LUZ_Y);
const DIR_X = LUZ_X / NORMA;
const DIR_Y = LUZ_Y / NORMA;

export interface SombraNave {
  actualizar(): void;
  destroy(): void;
}

export function crearSombraNave(
  escena: Phaser.Scene,
  nave: { x: number; y: number; depth: number },
  _tipo: TipoUnidad,
  _faccion: Faccion,
  largo: number,
  offsetPx: number,
): SombraNave {
  const sombra = escena.add.ellipse(
    nave.x + DIR_X * offsetPx,
    nave.y + DIR_Y * offsetPx,
    largo * 0.95,
    largo * 0.4,
    0x000000,
    0.32,
  );
  sombra.setDepth(Math.max(0, nave.depth - 6));

  return {
    actualizar() {
      sombra.setPosition(nave.x + DIR_X * offsetPx, nave.y + DIR_Y * offsetPx);
    },
    destroy() {
      sombra.destroy();
    },
  };
}
