// Espina (Enjambre) — fragata.
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

/** Torreta simple (base + cañón corto) para el sub-contenedor rotable que Nave.ts apunta al blanco. */
function crearTorreta(escena: Phaser.Scene, p: typeof PALETA.enjambre, largo: number, x: number, y: number): Phaser.GameObjects.Container {
  const torreta = new Phaser.GameObjects.Container(escena, x, y);
  const gt = new Phaser.GameObjects.Graphics(escena);
  gt.fillStyle(p.cascoOscuro, 1);
  gt.fillCircle(0, 0, largo * 0.035);
  gt.fillStyle(p.detalle, 1);
  gt.fillRect(0, -largo * 0.011, largo * 0.09, largo * 0.022);
  torreta.add(gt);
  return torreta;
}

/**
 * Espina: casco alargado y angosto con la proa partida en dos puntas
 * paralelas (tenedor de dos dientes), torre/aleta central elevada a mitad
 * del casco y líneas transversales tipo "costillas" para un aspecto más
 * esquelético que el Bastión de Coalición.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.fragata.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;
  const noseBaseX = largo * 0.32;
  const anchoCasco = largo * 0.11;

  // Casco principal (sin punta: la proa se completa con el tenedor): mitad
  // superior iluminada (y<0), mitad inferior en sombra (y>0); silueta
  // exterior sin cambios (mismo contorno que antes).
  const centroFrente = { x: noseBaseX, y: 0 };
  const puntaCola = { x: tailX, y: 0 };
  g.fillStyle(p.casco, 1);
  relleno(g, [
    { x: noseBaseX, y: -anchoCasco },
    { x: tailX * 0.85, y: -anchoCasco * 0.9 },
    puntaCola,
    centroFrente,
  ]);
  g.fillStyle(p.cascoOscuro, 1);
  relleno(g, [
    centroFrente,
    puntaCola,
    { x: tailX * 0.85, y: anchoCasco * 0.9 },
    { x: noseBaseX, y: anchoCasco },
  ]);
  g.lineStyle(Math.max(1, largo * 0.012), p.cascoOscuro, 1);
  contorno(g, [
    { x: noseBaseX, y: anchoCasco },
    { x: tailX * 0.85, y: anchoCasco * 0.9 },
    puntaCola,
    { x: tailX * 0.85, y: -anchoCasco * 0.9 },
    { x: noseBaseX, y: -anchoCasco },
  ]);

  // Proa partida en dos puntas paralelas (tenedor), con hueco al centro:
  // diente superior iluminado, diente inferior en sombra.
  for (const s of [1, -1]) {
    g.fillStyle(s < 0 ? p.casco : p.cascoOscuro, 1);
    poligono(g, [
      { x: noseBaseX, y: s * anchoCasco * 0.15 },
      { x: noseX, y: s * anchoCasco * 0.2 },
      { x: noseBaseX, y: s * anchoCasco },
    ]);
  }

  // Costillas transversales (aspecto esquelético).
  g.lineStyle(Math.max(1, largo * 0.008), p.detalle, 0.9);
  for (let i = 1; i <= 4; i++) {
    const x = Phaser.Math.Linear(noseBaseX * 0.6, tailX * 0.85, i / 5);
    const anchoLocal = Phaser.Math.Linear(anchoCasco, anchoCasco * 0.9, i / 5);
    g.lineBetween(x, anchoLocal, x, -anchoLocal);
  }

  // Torre/aleta central elevada a mitad del casco.
  g.fillStyle(p.acento, 1);
  g.fillTriangle(-largo * 0.03, anchoCasco * 0.6, largo * 0.03, anchoCasco * 0.6, 0, anchoCasco * 2.1);

  // Torretas rotables sobre la línea central del casco, a ambos lados de la
  // torre/aleta para no superponerse con ella.
  const torreta1 = crearTorreta(escena, p, largo, largo * 0.13, 0);
  const torreta2 = crearTorreta(escena, p, largo, tailX * 0.55, 0);
  contenedor.setData('torretas', [torreta1, torreta2]);

  contenedor.add(g);
  contenedor.add(torreta1);
  contenedor.add(torreta2);
}
