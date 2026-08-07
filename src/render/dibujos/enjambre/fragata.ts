// Espina (Enjambre) — fragata.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

function poligono(g: Phaser.GameObjects.Graphics, puntos: { x: number; y: number }[]): void {
  g.beginPath();
  g.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) g.lineTo(puntos[i].x, puntos[i].y);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/**
 * Espina: casco alargado y angosto con la proa partida en dos puntas
 * paralelas (tenedor de dos dientes), torre/aleta central elevada a mitad
 * del casco y líneas transversales tipo "costillas" para un aspecto más
 * esquelético que el Bastión de Coalición.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.fragata.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;
  const noseBaseX = largo * 0.32;
  const anchoCasco = largo * 0.11;

  // Casco principal (sin punta: la proa se completa con el tenedor).
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.012), p.cascoOscuro, 1);
  poligono(g, [
    { x: noseBaseX, y: anchoCasco },
    { x: tailX * 0.85, y: anchoCasco * 0.9 },
    { x: tailX, y: 0 },
    { x: tailX * 0.85, y: -anchoCasco * 0.9 },
    { x: noseBaseX, y: -anchoCasco },
  ]);

  // Proa partida en dos puntas paralelas (tenedor), con hueco al centro.
  g.fillStyle(p.cascoOscuro, 1);
  for (const s of [1, -1]) {
    poligono(g, [
      { x: noseBaseX, y: s * anchoCasco * 0.15 },
      { x: noseX, y: s * anchoCasco * 0.2 },
      { x: noseBaseX, y: s * anchoCasco },
    ]);
  }

  // Costillas transversales (aspecto esquelético).
  g.lineStyle(Math.max(1, largo * 0.008), p.detalle, 0.9);
  for (let i = 1; i <= 4; i++) {
    const x = Phaser.Math.Linear(noseBaseX * 0.6, tailX * 0.85, i / 5);
    const anchoLocal = Phaser.Math.Linear(anchoCasco, anchoCasco * 0.9, i / 5);
    g.lineBetween(x, anchoLocal, x, -anchoLocal);
  }

  // Torre/aleta central elevada a mitad del casco.
  g.fillStyle(p.acento, 1);
  g.fillTriangle(-largo * 0.03, anchoCasco * 0.6, largo * 0.03, anchoCasco * 0.6, 0, anchoCasco * 2.1);

  contenedor.add(g);
}
