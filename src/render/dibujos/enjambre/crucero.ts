// Devorador (Enjambre) — crucero.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Devorador: casco muy alargado tipo aguja/cigarro con proa redondeada
 * (arco suave, no puntiaguda como el Custodio), una única aleta/torre
 * dorsal prominente cerca de la popa y un racimo de motores. Silueta
 * notablemente más flaca y alargada que el Custodio de Coalición.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.crucero.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const tailX = -largo * 0.5;
  const anchoMax = largo * 0.13;

  // Casco aguja/cigarro (elipse muy alargada: proa y popa redondeadas).
  g.fillStyle(p.detalle, 1);
  g.lineStyle(Math.max(1, largo * 0.01), p.cascoOscuro, 1);
  g.fillEllipse(0, 0, largo * 0.98, anchoMax * 2);
  g.strokeEllipse(0, 0, largo * 0.98, anchoMax * 2);

  // Aleta dorsal prominente cerca de la popa (una sola, a diferencia de las
  // dos torres gemelas del Custodio).
  g.fillStyle(p.acento, 1);
  g.fillTriangle(tailX * 0.32, anchoMax * 0.5, tailX * 0.08, anchoMax * 0.5, tailX * 0.2, anchoMax * 2.3);

  // Racimo de motores al final.
  g.fillStyle(p.cascoOscuro, 1);
  g.lineStyle(Math.max(1, largo * 0.008), p.detalle, 1);
  const posiciones = [-0.55, -0.2, 0.2, 0.55];
  for (const t of posiciones) {
    const y = t * anchoMax;
    g.fillCircle(tailX * 0.94, y, anchoMax * 0.32);
    g.strokeCircle(tailX * 0.94, y, anchoMax * 0.32);
  }

  contenedor.add(g);
}
