// Núcleo Colmena (Enjambre) — base jugable.
import Phaser from 'phaser';
import { RADIO_BASE_JUGADOR_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Núcleo Colmena: anillo (toroide) sostenido por brazos finos radiales que
 * lo conectan a una esfera central más chica con un ojo rojo grande.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const r = RADIO_BASE_JUGADOR_PX;
  const p = PALETA.enjambre;
  const g = new Phaser.GameObjects.Graphics(escena);

  // Anillo delgado (toroide).
  g.lineStyle(r * 0.09, p.cascoOscuro, 1);
  g.strokeCircle(0, 0, r * 0.85);

  // Brazos radiales finos que conectan el anillo a la esfera central.
  g.lineStyle(Math.max(1, r * 0.035), p.detalle, 1);
  for (let i = 0; i < 4; i++) {
    const ang = (Math.PI / 2) * i + Math.PI / 4;
    g.lineBetween(
      Math.cos(ang) * r * 0.34,
      Math.sin(ang) * r * 0.34,
      Math.cos(ang) * r * 0.85,
      Math.sin(ang) * r * 0.85,
    );
  }

  // Esfera central.
  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, r * 0.02), p.cascoOscuro, 1);
  g.fillCircle(0, 0, r * 0.32);
  g.strokeCircle(0, 0, r * 0.32);

  // Ojo rojo grande.
  g.fillStyle(p.acento, 1);
  g.fillCircle(0, 0, r * 0.14);

  contenedor.add(g);
}
