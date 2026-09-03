// Rapaz (Enjambre) — caza ligero.
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
 * Rapaz: cabeza central angosta y alargada con dos ranuras rojas como ojos,
 * de la que nacen dos pares de alas laterales que se abren como mandíbulas
 * de insecto, más anchas en la punta que en la base. Sin cabina.
 *
 * Las alas viven en su propio sub-contenedor (`setData('alas', ...)`):
 * Nave.ts las pliega (achatadas en Y) cuando la nave está quieta defendiendo
 * una mina capturada, y las despliega al moverse o combatir — como los
 * droides buitre posándose.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.cazaLigero.escalaVisual;
  const p = PALETA.enjambre;
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;

  const alas = new Phaser.GameObjects.Container(escena, 0, 0);
  const gAlas = new Phaser.GameObjects.Graphics(escena);

  // Par de alas traseras (más anchas en la punta que en la base). Luz
  // arriba-izquierda: el ala superior (y<0) queda más clara, la inferior
  // (y>0) en sombra.
  gAlas.lineStyle(Math.max(1, largo * 0.03), p.detalle, 1);
  for (const s of [1, -1]) {
    gAlas.fillStyle(s < 0 ? p.casco : p.cascoOscuro, 1);
    poligono(gAlas, [
      { x: tailX * 0.25, y: s * largo * 0.05 },
      { x: tailX * 0.9, y: s * largo * 0.14 },
      { x: tailX * 0.95, y: s * largo * 0.42 },
      { x: tailX * 0.5, y: s * largo * 0.3 },
      { x: tailX * 0.15, y: s * largo * 0.12 },
    ]);
  }

  // Par de alas delanteras (mandíbulas), misma convención de luz/sombra.
  gAlas.lineStyle(Math.max(1, largo * 0.03), p.cascoOscuro, 1);
  for (const s of [1, -1]) {
    gAlas.fillStyle(s < 0 ? p.casco : p.cascoOscuro, 1);
    poligono(gAlas, [
      { x: largo * 0.1, y: s * largo * 0.05 },
      { x: largo * 0.22, y: s * largo * 0.14 },
      { x: largo * 0.02, y: s * largo * 0.4 },
      { x: -largo * 0.18, y: s * largo * 0.26 },
      { x: -largo * 0.1, y: s * largo * 0.1 },
    ]);
  }
  alas.add(gAlas);

  // Cabeza central angosta y alargada, con ojos: mitad superior iluminada,
  // mitad inferior en sombra. Queda fuera del sub-contenedor de alas: no se
  // pliega con ellas.
  const gCabeza = new Phaser.GameObjects.Graphics(escena);
  const medioTail = { x: tailX * 0.55, y: 0 };
  gCabeza.fillStyle(p.casco, 1);
  relleno(gCabeza, [
    { x: noseX, y: 0 },
    { x: largo * 0.2, y: -largo * 0.06 },
    { x: tailX * 0.55, y: -largo * 0.05 },
    medioTail,
  ]);
  gCabeza.fillStyle(p.cascoOscuro, 1);
  relleno(gCabeza, [
    { x: noseX, y: 0 },
    medioTail,
    { x: tailX * 0.55, y: largo * 0.05 },
    { x: largo * 0.2, y: largo * 0.06 },
  ]);
  gCabeza.lineStyle(Math.max(1, largo * 0.03), p.cascoOscuro, 1);
  contorno(gCabeza, [
    { x: noseX, y: 0 },
    { x: largo * 0.2, y: largo * 0.06 },
    { x: tailX * 0.55, y: largo * 0.05 },
    { x: tailX * 0.55, y: -largo * 0.05 },
    { x: largo * 0.2, y: -largo * 0.06 },
  ]);

  // Ranuras rojas como ojos.
  gCabeza.fillStyle(p.acento, 1);
  gCabeza.fillRect(largo * 0.2, largo * 0.02, largo * 0.14, largo * 0.025);
  gCabeza.fillRect(largo * 0.2, -largo * 0.045, largo * 0.14, largo * 0.025);

  contenedor.setData('alas', alas);
  contenedor.add(alas);
  contenedor.add(gCabeza);
}
