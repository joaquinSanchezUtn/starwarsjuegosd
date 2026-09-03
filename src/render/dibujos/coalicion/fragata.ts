// Bastión (Coalición) — fragata.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/** Torreta simple (base + cañón corto) para el sub-contenedor rotable que Nave.ts apunta al blanco. */
function crearTorreta(escena: Phaser.Scene, p: typeof PALETA.coalicion, largo: number, x: number, y: number): Phaser.GameObjects.Container {
  const torreta = new Phaser.GameObjects.Container(escena, x, y);
  const gt = new Phaser.GameObjects.Graphics(escena);
  gt.fillStyle(p.cascoOscuro, 1);
  gt.fillCircle(0, 0, largo * 0.045);
  gt.fillStyle(p.detalle, 1);
  gt.fillRect(0, -largo * 0.014, largo * 0.11, largo * 0.028);
  torreta.add(gt);
  return torreta;
}

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

  // Cuña principal: mitad superior iluminada, mitad inferior en sombra
  // (luz direccional fija arriba-izquierda; silueta exterior sin cambios).
  const medioPopa = { x: tailX, y: 0 };
  g.fillStyle(p.casco, 1);
  g.beginPath();
  g.moveTo(noseX, 0);
  g.lineTo(tailX, -anchoPopa);
  g.lineTo(medioPopa.x, medioPopa.y);
  g.closePath();
  g.fillPath();

  g.fillStyle(p.cascoOscuro, 1);
  g.beginPath();
  g.moveTo(noseX, 0);
  g.lineTo(medioPopa.x, medioPopa.y);
  g.lineTo(tailX, anchoPopa);
  g.closePath();
  g.fillPath();

  g.lineStyle(Math.max(1.5, largo * 0.014), p.acento, 1);
  g.beginPath();
  g.moveTo(noseX, 0);
  g.lineTo(tailX, anchoPopa);
  g.lineTo(tailX, -anchoPopa);
  g.closePath();
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

  // Torreta dorsal rotable, montada al centro del casco.
  const torreta = crearTorreta(escena, p, largo, -largo * 0.04, 0);
  contenedor.setData('torretas', [torreta]);

  contenedor.add(g);
  contenedor.add(torreta);
}
