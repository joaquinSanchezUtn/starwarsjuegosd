// Guadaña (Enjambre) — destructor esquelético, semi-capital.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Guadaña: casco tipo aguja/espina, mucho más angosto que la fragata Espina
 * para su largo, con una estructura abierta (huecos entre "costillas" en vez
 * de un casco sólido) y una cabeza de mando puntiaguda y curva, como el filo
 * de una hoz. Se rompe fácil: menos plancha visible que su costo sugiere.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.destructor.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;
  const anchoCasco = largo * 0.065;

  // Espina central angosta (columna vertebral).
  g.fillStyle(p.cascoOscuro, 1);
  g.lineStyle(Math.max(1, largo * 0.007), p.detalle, 1);
  g.fillRect(tailX, -anchoCasco, largo, anchoCasco * 2);
  g.strokeRect(tailX, -anchoCasco, largo, anchoCasco * 2);

  // Costillas abiertas: segmentos que sobresalen con huecos entre ellos
  // (estructura abierta, no un casco sólido continuo).
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.008), p.cascoOscuro, 1);
  const costillas = 6;
  for (let i = 0; i < costillas; i++) {
    const t = i / (costillas - 1);
    const x = Phaser.Math.Linear(tailX * 0.85, noseX * 0.55, t);
    const alto = Phaser.Math.Linear(anchoCasco * 3.4, anchoCasco * 1.6, t);
    const ancho = largo * 0.05;
    g.fillRect(x - ancho / 2, -alto, ancho, alto * 2);
    g.strokeRect(x - ancho / 2, -alto, ancho, alto * 2);
  }

  // Cabeza de mando puntiaguda y curva, como el filo de una hoz.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.01), p.acento, 1);
  g.beginPath();
  g.moveTo(noseX, 0);
  g.lineTo(noseX * 0.55, anchoCasco * 1.8);
  g.lineTo(noseX * 0.3, anchoCasco * 0.4);
  g.lineTo(noseX * 0.3, -anchoCasco * 0.4);
  g.lineTo(noseX * 0.55, -anchoCasco * 1.8);
  g.closePath();
  g.fillPath();
  g.strokePath();

  // Ojo/sensor rojo único en la cabeza.
  g.fillStyle(p.acento, 1);
  g.fillCircle(noseX * 0.68, 0, anchoCasco * 0.7);

  contenedor.add(g);
}
