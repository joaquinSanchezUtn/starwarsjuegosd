// Estilete (Coalición) — interceptor de élite, el "as" del bando.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

const DORADO_ELITE = 0xffe17a;

function poligono(g: Phaser.GameObjects.Graphics, puntos: { x: number; y: number }[]): void {
  g.beginPath();
  g.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) g.lineTo(puntos[i].x, puntos[i].y);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/**
 * Estilete: una flecha triangular finísima de proa a popa (mucho más
 * angosta que cualquier otra nave del roster), con un par de alerones muy
 * delgados en diagonal hacia atrás y una franja dorada distintiva que marca
 * su condición de nave de élite (carísima para su tamaño).
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.coalicion.interceptor.escalaVisual;
  const p = PALETA.coalicion;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.55;
  const tailX = -largo * 0.45;

  // Alerones diagonales finísimos.
  g.fillStyle(p.cascoOscuro, 1);
  g.lineStyle(Math.max(1, largo * 0.02), p.detalle, 1);
  for (const s of [1, -1]) {
    poligono(g, [
      { x: tailX * 0.5, y: s * largo * 0.03 },
      { x: tailX * 1.05, y: s * largo * 0.34 },
      { x: tailX * 0.75, y: s * largo * 0.34 },
      { x: -largo * 0.02, y: s * largo * 0.04 },
    ]);
  }

  // Cuerpo: triángulo finísimo, casi una flecha.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.02), DORADO_ELITE, 1);
  poligono(g, [
    { x: noseX, y: 0 },
    { x: tailX, y: largo * 0.09 },
    { x: tailX * 1.02, y: 0 },
    { x: tailX, y: -largo * 0.09 },
  ]);

  // Franja dorsal dorada de élite.
  g.lineStyle(Math.max(1, largo * 0.02), DORADO_ELITE, 1);
  g.lineBetween(noseX * 0.7, 0, tailX * 0.7, 0);

  // Cabina minúscula.
  g.fillStyle(p.detalle, 1);
  g.fillCircle(largo * 0.14, 0, largo * 0.05);

  contenedor.add(g);
}
