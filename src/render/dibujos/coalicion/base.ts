// Ciudadela Orbital (Coalición) — base jugable.
import Phaser from 'phaser';
import { RADIO_BASE_JUGADOR_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Ciudadela Orbital: anillo grueso alrededor de un núcleo poligonal
 * (octágono), con protuberancias angulares sobresaliendo del anillo
 * simulando muelles/torres.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const r = RADIO_BASE_JUGADOR_PX;
  const p = PALETA.coalicion;
  const g = new Phaser.GameObjects.Graphics(escena);

  // Anillo grueso.
  g.lineStyle(r * 0.22, p.cascoOscuro, 1);
  g.strokeCircle(0, 0, r * 0.82);
  g.lineStyle(Math.max(1, r * 0.02), p.acento, 1);
  g.strokeCircle(0, 0, r * 0.82 + r * 0.11);
  g.strokeCircle(0, 0, r * 0.82 - r * 0.11);

  // Protuberancias angulares (muelles/torres) sobresaliendo del anillo.
  g.fillStyle(p.detalle, 1);
  for (let i = 0; i < 4; i++) {
    const ang = (Math.PI / 2) * i + Math.PI / 4;
    const baseR = r * 0.7;
    const puntaR = r * 1.05;
    const anchoAng = 0.14;
    const bx1 = Math.cos(ang - anchoAng) * baseR;
    const by1 = Math.sin(ang - anchoAng) * baseR;
    const bx2 = Math.cos(ang + anchoAng) * baseR;
    const by2 = Math.sin(ang + anchoAng) * baseR;
    const px = Math.cos(ang) * puntaR;
    const py = Math.sin(ang) * puntaR;
    g.fillTriangle(bx1, by1, bx2, by2, px, py);
  }

  // Núcleo central poligonal (octágono).
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, r * 0.02), p.acento, 1);
  const lados = 8;
  const radioNucleo = r * 0.42;
  g.beginPath();
  for (let i = 0; i < lados; i++) {
    const ang = (Math.PI * 2 * i) / lados;
    const x = Math.cos(ang) * radioNucleo;
    const y = Math.sin(ang) * radioNucleo;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  g.strokePath();

  // Detalle central azul oscuro.
  g.fillStyle(p.detalle, 1);
  g.fillCircle(0, 0, radioNucleo * 0.35);

  contenedor.add(g);
}
