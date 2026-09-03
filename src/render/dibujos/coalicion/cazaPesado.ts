// Alabarda (Coalición) — caza pesado.
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
 * Alabarda: fuselaje largo y robusto, cabina alargada al centro, nariz
 * prominente y dos alas grandes cuya punta se parte en tijera (doble punta
 * triangular). Franjas rojas finas a lo largo del fuselaje.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.coalicion.cazaPesado.escalaVisual;
  const p = PALETA.coalicion;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;
  const anchoFuselaje = largo * 0.22;

  // Alas con punta en tijera (V). Luz arriba-izquierda: ala superior (y<0)
  // iluminada, inferior (y>0) en sombra.
  g.lineStyle(Math.max(1, largo * 0.025), p.cascoOscuro, 1);
  for (const s of [1, -1]) {
    g.fillStyle(s < 0 ? p.casco : p.cascoOscuro, 1);
    poligono(g, [
      { x: largo * 0.06, y: s * anchoFuselaje * 0.4 },
      { x: -largo * 0.22, y: s * largo * 0.5 },
      { x: -largo * 0.17, y: s * largo * 0.38 },
      { x: -largo * 0.32, y: s * largo * 0.52 },
      { x: -largo * 0.24, y: s * anchoFuselaje * 0.45 },
    ]);
  }

  // Fuselaje principal: mitad superior iluminada, mitad inferior en sombra
  // (ya tiene puntos a y=0 en nariz y popa, el corte es exacto).
  g.fillStyle(p.casco, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.28, y: -anchoFuselaje * 0.5 },
    { x: tailX + largo * 0.1, y: -anchoFuselaje * 0.5 },
    { x: tailX, y: 0 },
  ]);
  g.fillStyle(p.cascoOscuro, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    { x: tailX, y: 0 },
    { x: tailX + largo * 0.1, y: anchoFuselaje * 0.5 },
    { x: largo * 0.28, y: anchoFuselaje * 0.5 },
  ]);
  g.lineStyle(Math.max(1, largo * 0.035), p.cascoOscuro, 1);
  contorno(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.28, y: anchoFuselaje * 0.5 },
    { x: tailX + largo * 0.1, y: anchoFuselaje * 0.5 },
    { x: tailX, y: 0 },
    { x: tailX + largo * 0.1, y: -anchoFuselaje * 0.5 },
    { x: largo * 0.28, y: -anchoFuselaje * 0.5 },
  ]);

  // Cabina alargada al centro.
  g.fillStyle(p.detalle, 0.95);
  g.fillEllipse(largo * 0.05, 0, largo * 0.32, anchoFuselaje * 0.55);

  // Franjas rojas a lo largo del fuselaje.
  g.lineStyle(Math.max(1, largo * 0.015), p.acento, 1);
  g.lineBetween(noseX * 0.7, anchoFuselaje * 0.22, tailX * 0.7, anchoFuselaje * 0.22);
  g.lineBetween(noseX * 0.7, -anchoFuselaje * 0.22, tailX * 0.7, -anchoFuselaje * 0.22);

  contenedor.add(g);
}
