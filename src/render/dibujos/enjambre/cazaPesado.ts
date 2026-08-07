// Alacrán (Enjambre) — caza pesado.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Alacrán: tres alas curvas en trípode (una hacia adelante, dos hacia atrás)
 * alrededor de un núcleo esférico central con un único ojo rojo grande.
 * Silueta compacta y redondeada.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.cazaPesado.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const radioInterno = largo * 0.2;
  const radioExterno = largo * 0.52;
  const medioAncho = 0.62; // radianes de mitad de apertura angular de cada ala

  g.fillStyle(p.detalle, 1);
  g.lineStyle(Math.max(1, largo * 0.02), p.cascoOscuro, 1);

  // Centros angulares: 0 = adelante (+X), ±120° = atrás (trípode).
  const centros = [0, (2 * Math.PI) / 3, (-2 * Math.PI) / 3];
  for (const centro of centros) {
    const desde = centro - medioAncho;
    const hasta = centro + medioAncho;
    g.beginPath();
    g.arc(0, 0, radioExterno, desde, hasta, false);
    g.arc(0, 0, radioInterno, hasta, desde, true);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  // Núcleo esférico central.
  g.fillStyle(p.cascoOscuro, 1);
  g.lineStyle(Math.max(1, largo * 0.02), p.detalle, 1);
  g.fillCircle(0, 0, largo * 0.22);
  g.strokeCircle(0, 0, largo * 0.22);

  // Ojo rojo grande.
  g.fillStyle(p.acento, 1);
  g.fillCircle(largo * 0.05, 0, largo * 0.1);

  contenedor.add(g);
}
