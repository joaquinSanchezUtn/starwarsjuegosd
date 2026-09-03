// Devorador (Enjambre) — crucero.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/** Igual que un `poligono` de solo relleno (para partir una forma en mitad luz/sombra). */
function relleno(g: Phaser.GameObjects.Graphics, puntos: { x: number; y: number }[]): void {
  g.beginPath();
  g.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) g.lineTo(puntos[i].x, puntos[i].y);
  g.closePath();
  g.fillPath();
}

/**
 * Puntos de un arco elíptico centrado en el origen, semiejes `a` (x) y `b`
 * (y), entre `anguloInicio` y `anguloFin` (radianes). Usado para partir el
 * casco tipo aguja/cigarro en mitad luz/mitad sombra sin curvas nativas de
 * media elipse en Phaser.Graphics.
 */
function puntosArcoElipse(a: number, b: number, anguloInicio: number, anguloFin: number, segmentos: number): { x: number; y: number }[] {
  const puntos: { x: number; y: number }[] = [];
  for (let i = 0; i <= segmentos; i++) {
    const t = anguloInicio + (anguloFin - anguloInicio) * (i / segmentos);
    puntos.push({ x: a * Math.cos(t), y: b * Math.sin(t) });
  }
  return puntos;
}

/** Torreta simple (base + cañón corto) para el sub-contenedor rotable que Nave.ts apunta al blanco. */
function crearTorreta(escena: Phaser.Scene, p: typeof PALETA.enjambre, largo: number, x: number, y: number): Phaser.GameObjects.Container {
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
 * Devorador: casco muy alargado tipo aguja/cigarro con proa redondeada
 * (arco suave, no puntiaguda como el Custodio), una única aleta/torre
 * dorsal prominente cerca de la popa y un racimo de motores. Silueta
 * notablemente más flaca y alargada que el Custodio de Coalición.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.enjambre.crucero.escalaVisual;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);
  const tailX = -largo * 0.5;
  const anchoMax = largo * 0.13;
  const semiA = largo * 0.49; // semieje x (largo*0.98 de diámetro total)
  const segmentos = 24;

  // Casco aguja/cigarro (elipse muy alargada: proa y popa redondeadas):
  // mitad superior iluminada (y<0), mitad inferior en sombra (y>0); silueta
  // exterior sin cambios (mismo contorno elíptico que antes).
  g.fillStyle(p.casco, 1);
  relleno(g, puntosArcoElipse(semiA, anchoMax, Math.PI, 2 * Math.PI, segmentos));
  g.fillStyle(p.cascoOscuro, 1);
  relleno(g, puntosArcoElipse(semiA, anchoMax, 0, Math.PI, segmentos));
  g.lineStyle(Math.max(1, largo * 0.01), p.cascoOscuro, 1);
  g.strokeEllipse(0, 0, largo * 0.98, anchoMax * 2);

  // Aleta dorsal prominente cerca de la popa (una sola, a diferencia de las
  // dos torres gemelas del Custodio).
  g.fillStyle(p.acento, 1);
  g.fillTriangle(tailX * 0.32, anchoMax * 0.5, tailX * 0.08, anchoMax * 0.5, tailX * 0.2, anchoMax * 2.3);

  // Racimo de motores al final.
  g.fillStyle(p.cascoOscuro, 1);
  g.lineStyle(Math.max(1, largo * 0.008), p.detalle, 1);
  const posiciones = [-0.55, -0.2, 0.2, 0.55];
  for (const t of posiciones) {
    const y = t * anchoMax;
    g.fillCircle(tailX * 0.94, y, anchoMax * 0.32);
    g.strokeCircle(tailX * 0.94, y, anchoMax * 0.32);
  }

  // Torretas rotables sobre la línea central del casco, lejos de la aleta
  // dorsal y del racimo de motores.
  const torreta1 = crearTorreta(escena, p, largo, largo * 0.2, 0);
  const torreta2 = crearTorreta(escena, p, largo, tailX * 0.6, 0);
  contenedor.setData('torretas', [torreta1, torreta2]);

  contenedor.add(g);
  contenedor.add(torreta1);
  contenedor.add(torreta2);
}
