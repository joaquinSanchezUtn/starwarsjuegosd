// Garra (Enjambre) — nave de captura.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Garra: nave utilitaria rechoncha y lenta, con dos brazos/pinzas finos al
 * frente que se abren en V. Sin armas visibles.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.captura.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const cuerpoLargo = largo * 0.68;
  const cuerpoAncho = largo * 0.56;

  // Cuerpo rechoncho.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.035), p.cascoOscuro, 1);
  g.fillRoundedRect(-cuerpoLargo / 2, -cuerpoAncho / 2, cuerpoLargo, cuerpoAncho, largo * 0.1);
  g.strokeRoundedRect(-cuerpoLargo / 2, -cuerpoAncho / 2, cuerpoLargo, cuerpoAncho, largo * 0.1);

  // Franja roja (acento).
  g.fillStyle(p.acento, 1);
  g.fillRect(-largo * 0.05, -cuerpoAncho / 2, largo * 0.09, cuerpoAncho);

  // Brazos/pinzas al frente, en V.
  const frenteX = cuerpoLargo / 2;
  g.lineStyle(Math.max(1.5, largo * 0.045), p.cascoOscuro, 1);
  g.lineBetween(frenteX, 0, frenteX + largo * 0.32, largo * 0.2);
  g.lineBetween(frenteX, 0, frenteX + largo * 0.32, -largo * 0.2);
  g.fillStyle(p.detalle, 1);
  g.fillCircle(frenteX + largo * 0.32, largo * 0.2, largo * 0.035);
  g.fillCircle(frenteX + largo * 0.32, -largo * 0.2, largo * 0.035);

  contenedor.add(g);
}
