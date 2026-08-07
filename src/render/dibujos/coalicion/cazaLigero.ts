// Vencejo (Coalición) — caza ligero.
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
 * Vencejo: tríada — cuerpo central angosto con cabina burbuja, una aleta
 * dorsal fina que sobresale hacia atrás (sugerida con un triángulo delgado
 * superpuesto) y dos alas inferiores que se abren en diagonal hacia
 * adelante desde la cola, como una Y invertida.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.coalicion.cazaLigero.escalaVisual;
  const p = PALETA.coalicion;
  const g = new Phaser.GameObjects.Graphics(escena);
  const tailX = -largo * 0.5;
  const noseX = largo * 0.5;

  // Alas inferiores (Y invertida): raíz en la cola, puntas adelante-afuera.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.035), p.cascoOscuro, 1);
  for (const s of [1, -1]) {
    poligono(g, [
      { x: tailX * 0.95, y: s * largo * 0.05 },
      { x: -largo * 0.02, y: s * largo * 0.44 },
      { x: largo * 0.08, y: s * largo * 0.3 },
      { x: tailX * 0.55, y: s * largo * 0.07 },
    ]);
  }

  // Puntas de ala rojas (acento).
  g.fillStyle(p.acento, 1);
  for (const s of [1, -1]) {
    g.fillTriangle(
      -largo * 0.02,
      s * largo * 0.44,
      largo * 0.06,
      s * largo * 0.33,
      -largo * 0.12,
      s * largo * 0.3,
    );
  }

  // Aleta dorsal: triángulo fino superpuesto que sobresale hacia atrás.
  g.fillStyle(p.cascoOscuro, 1);
  g.fillTriangle(-largo * 0.04, 0, tailX * 1.12, largo * 0.045, tailX * 1.12, -largo * 0.045);

  // Cuerpo central.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.045), p.cascoOscuro, 1);
  poligono(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.14, y: largo * 0.12 },
    { x: tailX * 0.8, y: largo * 0.08 },
    { x: tailX * 0.8, y: -largo * 0.08 },
    { x: largo * 0.14, y: -largo * 0.12 },
  ]);

  // Cabina burbuja.
  g.fillStyle(p.detalle, 0.95);
  g.lineStyle(1, p.cascoOscuro, 1);
  g.fillCircle(largo * 0.12, 0, largo * 0.09);
  g.strokeCircle(largo * 0.12, 0, largo * 0.09);

  contenedor.add(g);
}
