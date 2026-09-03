// Chacal (Enjambre) — bombardero.
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

/** Igual que `poligono` pero solo relleno, sin trazo (para partir una forma en mitad luz/sombra). */
function relleno(g: Phaser.GameObjects.Graphics, puntos: { x: number; y: number }[]): void {
  g.beginPath();
  g.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) g.lineTo(puntos[i].x, puntos[i].y);
  g.closePath();
  g.fillPath();
}

/** Igual que `poligono` pero solo trazo, sin relleno (para redibujar el contorno completo tras rellenar por mitades). */
function contorno(g: Phaser.GameObjects.Graphics, puntos: { x: number; y: number }[]): void {
  g.beginPath();
  g.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) g.lineTo(puntos[i].x, puntos[i].y);
  g.closePath();
  g.strokePath();
}

/**
 * Chacal: primo achatado del Rapaz. Misma cabeza angosta con ojos rojos,
 * pero cuerpo más ancho y chato, alas extendidas horizontales, con óvalos
 * oscuros bajo el fuselaje simulando bombas cargadas.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.bombardero.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;

  // Alas horizontales extendidas, anchas y chatas. Luz arriba-izquierda:
  // ala superior (y<0) iluminada, inferior (y>0) en sombra.
  g.lineStyle(Math.max(1, largo * 0.025), p.cascoOscuro, 1);
  for (const s of [1, -1]) {
    g.fillStyle(s < 0 ? p.casco : p.cascoOscuro, 1);
    poligono(g, [
      { x: largo * 0.15, y: s * largo * 0.06 },
      { x: -largo * 0.05, y: s * largo * 0.48 },
      { x: tailX * 0.6, y: s * largo * 0.46 },
      { x: tailX * 0.3, y: s * largo * 0.1 },
    ]);
  }

  // Cuerpo chato y ancho: mitad superior iluminada, mitad inferior en sombra.
  const medioCuerpoTail = { x: tailX * 0.65, y: 0 };
  g.fillStyle(p.casco, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.18, y: -largo * 0.14 },
    { x: tailX * 0.65, y: -largo * 0.16 },
    medioCuerpoTail,
  ]);
  g.fillStyle(p.cascoOscuro, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    medioCuerpoTail,
    { x: tailX * 0.65, y: largo * 0.16 },
    { x: largo * 0.18, y: largo * 0.14 },
  ]);
  contorno(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.18, y: largo * 0.14 },
    { x: tailX * 0.65, y: largo * 0.16 },
    { x: tailX * 0.65, y: -largo * 0.16 },
    { x: largo * 0.18, y: -largo * 0.14 },
  ]);

  // Cabeza angosta reconocible (parentesco visual con el Rapaz): mitad
  // superior clara, mitad inferior en sombra (tono cascoOscuro original).
  const medioCabezaTail = { x: largo * 0.1, y: 0 };
  g.fillStyle(p.casco, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.22, y: -largo * 0.05 },
    { x: largo * 0.1, y: -largo * 0.05 },
    medioCabezaTail,
  ]);
  g.fillStyle(p.cascoOscuro, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    medioCabezaTail,
    { x: largo * 0.1, y: largo * 0.05 },
    { x: largo * 0.22, y: largo * 0.05 },
  ]);

  // Ojos rojos.
  g.fillStyle(p.acento, 1);
  g.fillRect(largo * 0.24, largo * 0.015, largo * 0.1, largo * 0.02);
  g.fillRect(largo * 0.24, -largo * 0.035, largo * 0.1, largo * 0.02);

  // Bombas cargadas bajo el fuselaje.
  g.fillStyle(p.detalle, 1);
  for (let i = 0; i < 4; i++) {
    const x = Phaser.Math.Linear(largo * 0.05, tailX * 0.5, i / 3);
    g.fillEllipse(x, 0, largo * 0.09, largo * 0.05);
  }

  contenedor.add(g);
}
