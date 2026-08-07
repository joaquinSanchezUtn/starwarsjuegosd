// Rapaz (Enjambre) — caza ligero.
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
 * Rapaz: cabeza central angosta y alargada con dos ranuras rojas como ojos,
 * de la que nacen dos pares de alas laterales que se abren como mandíbulas
 * de insecto, más anchas en la punta que en la base. Sin cabina.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.cazaLigero.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;

  // Par de alas traseras (más anchas en la punta que en la base).
  g.fillStyle(p.cascoOscuro, 1);
  g.lineStyle(Math.max(1, largo * 0.03), p.detalle, 1);
  for (const s of [1, -1]) {
    poligono(g, [
      { x: tailX * 0.25, y: s * largo * 0.05 },
      { x: tailX * 0.9, y: s * largo * 0.14 },
      { x: tailX * 0.95, y: s * largo * 0.42 },
      { x: tailX * 0.5, y: s * largo * 0.3 },
      { x: tailX * 0.15, y: s * largo * 0.12 },
    ]);
  }

  // Par de alas delanteras (mandíbulas).
  g.fillStyle(p.casco, 1);
  for (const s of [1, -1]) {
    poligono(g, [
      { x: largo * 0.1, y: s * largo * 0.05 },
      { x: largo * 0.22, y: s * largo * 0.14 },
      { x: largo * 0.02, y: s * largo * 0.4 },
      { x: -largo * 0.18, y: s * largo * 0.26 },
      { x: -largo * 0.1, y: s * largo * 0.1 },
    ]);
  }

  // Cabeza central angosta y alargada.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.03), p.cascoOscuro, 1);
  poligono(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.2, y: largo * 0.06 },
    { x: tailX * 0.55, y: largo * 0.05 },
    { x: tailX * 0.55, y: -largo * 0.05 },
    { x: largo * 0.2, y: -largo * 0.06 },
  ]);

  // Ranuras rojas como ojos.
  g.fillStyle(p.acento, 1);
  g.fillRect(largo * 0.2, largo * 0.02, largo * 0.14, largo * 0.025);
  g.fillRect(largo * 0.2, -largo * 0.045, largo * 0.14, largo * 0.025);

  contenedor.add(g);
}
