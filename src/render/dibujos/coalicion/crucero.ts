// Custodio (Coalición) — crucero, la nave insignia del juego.
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
 * Custodio: doble cuña alargada (una cuña principal grande y una segunda más
 * angosta superpuesta, desplazada hacia la proa), dos torres de mando
 * gemelas separadas en la popa (rasgo distintivo — NO una sola centrada) y
 * una franja roja longitudinal en el dorso.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.coalicion.crucero.escalaVisual;
  const p = PALETA.coalicion;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;

  // Cuña principal.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.008), p.cascoOscuro, 1);
  poligono(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.15, y: largo * 0.3 },
    { x: tailX, y: largo * 0.26 },
    { x: tailX, y: -largo * 0.26 },
    { x: largo * 0.15, y: -largo * 0.3 },
  ]);

  // Segunda cuña, más angosta, superpuesta y desplazada hacia la proa.
  g.fillStyle(p.cascoOscuro, 0.55);
  poligono(g, [
    { x: noseX * 0.82, y: 0 },
    { x: largo * 0.02, y: largo * 0.15 },
    { x: tailX * 0.1, y: largo * 0.13 },
    { x: tailX * 0.1, y: -largo * 0.13 },
    { x: largo * 0.02, y: -largo * 0.15 },
  ]);

  // Franja roja longitudinal en el dorso.
  g.lineStyle(Math.max(1, largo * 0.014), p.acento, 1);
  g.lineBetween(noseX * 0.8, 0, tailX + largo * 0.14, 0);

  // Torres de mando gemelas separadas en la popa.
  const torreAncho = largo * 0.06;
  const torreAlto = largo * 0.1;
  const brecha = largo * 0.06;
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.006), p.cascoOscuro, 1);
  g.fillRect(tailX + largo * 0.02, brecha / 2, torreAncho, torreAlto);
  g.strokeRect(tailX + largo * 0.02, brecha / 2, torreAncho, torreAlto);
  g.fillRect(tailX + largo * 0.02, -brecha / 2 - torreAlto, torreAncho, torreAlto);
  g.strokeRect(tailX + largo * 0.02, -brecha / 2 - torreAlto, torreAncho, torreAlto);

  contenedor.add(g);
}
