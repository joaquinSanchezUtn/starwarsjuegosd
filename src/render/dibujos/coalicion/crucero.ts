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
function crearTorreta(escena: Phaser.Scene, p: typeof PALETA.coalicion, largo: number, x: number, y: number): Phaser.GameObjects.Container {
  const torreta = new Phaser.GameObjects.Container(escena, x, y);
  const gt = new Phaser.GameObjects.Graphics(escena);
  gt.fillStyle(p.cascoOscuro, 1);
  gt.fillCircle(0, 0, largo * 0.03);
  gt.fillStyle(p.detalle, 1);
  gt.fillRect(0, -largo * 0.011, largo * 0.09, largo * 0.022);
  torreta.add(gt);
  return torreta;
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

  // Cuña principal: mitad superior iluminada, mitad inferior en sombra
  // (luz direccional fija arriba-izquierda; silueta exterior sin cambios).
  const medioPopa = { x: tailX, y: 0 };
  g.fillStyle(p.casco, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    { x: largo * 0.15, y: -largo * 0.3 },
    { x: tailX, y: -largo * 0.26 },
    medioPopa,
  ]);
  g.fillStyle(p.cascoOscuro, 1);
  relleno(g, [
    { x: noseX, y: 0 },
    medioPopa,
    { x: tailX, y: largo * 0.26 },
    { x: largo * 0.15, y: largo * 0.3 },
  ]);
  g.lineStyle(Math.max(1, largo * 0.008), p.cascoOscuro, 1);
  contorno(g, [
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

  // Escotilla de hangar en el dorso, cerca del tercio trasero: es el punto
  // exacto desde el que el crucero portanaves lanza sus cazas gratis (ver
  // `actualizarPortanaves` en Nave.ts).
  const hangarX = tailX + largo * (1 / 3);
  const hangarAncho = largo * 0.1;
  const hangarAlto = largo * 0.06;
  g.fillStyle(p.detalle, 1);
  g.lineStyle(Math.max(1, largo * 0.008), p.cascoOscuro, 1);
  g.fillRoundedRect(hangarX - hangarAncho / 2, -hangarAlto / 2, hangarAncho, hangarAlto, largo * 0.012);
  g.strokeRoundedRect(hangarX - hangarAncho / 2, -hangarAlto / 2, hangarAncho, hangarAlto, largo * 0.012);

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

  // Torretas rotables gemelas, montadas al frente de las torres de mando.
  const torreta1 = crearTorreta(escena, p, largo, largo * 0.04, largo * 0.13);
  const torreta2 = crearTorreta(escena, p, largo, largo * 0.04, -largo * 0.13);
  contenedor.setData('torretas', [torreta1, torreta2]);

  contenedor.add(g);
  contenedor.add(torreta1);
  contenedor.add(torreta2);
}
