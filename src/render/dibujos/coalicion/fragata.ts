// Bastión (Coalición) — fragata.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Bastión: cuña maciza y lisa (nariz angosta, popa ancha), torre de mando
 * en T cerca de la popa y dos hileras de cañones chicos a los costados.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.coalicion.fragata.escalaVisual;
  const p = PALETA.coalicion;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;
  const anchoPopa = largo * 0.32;

  // Cuña principal.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1.5, largo * 0.014), p.acento, 1);
  g.beginPath();
  g.moveTo(noseX, 0);
  g.lineTo(tailX, anchoPopa);
  g.lineTo(tailX, -anchoPopa);
  g.closePath();
  g.fillPath();
  g.strokePath();

  // Torre de mando en T, cerca de la popa.
  g.fillStyle(p.cascoOscuro, 1);
  const stemX = tailX + largo * 0.2;
  const stemLen = largo * 0.14;
  const stemAlto = largo * 0.055;
  g.fillRect(stemX - stemLen / 2, -stemAlto / 2, stemLen, stemAlto);
  const barAncho = largo * 0.035;
  const barAlto = largo * 0.24;
  g.fillRect(stemX + stemLen / 2 - barAncho / 2, -barAlto / 2, barAncho, barAlto);

  // Hileras de cañones chicos a los costados.
  g.fillStyle(p.detalle, 1);
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const x = Phaser.Math.Linear(noseX * 0.55, tailX * 0.75, t);
    const anchoLocal = Phaser.Math.Linear(anchoPopa * 0.15, anchoPopa * 0.75, t);
    g.fillCircle(x, anchoLocal, largo * 0.014);
    g.fillCircle(x, -anchoLocal, largo * 0.014);
  }

  contenedor.add(g);
}
