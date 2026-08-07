// Yunque (Coalición) — bombardero.
import Phaser from 'phaser';
import { UNIDADES } from '../../../datos/balance.ts';
import { LARGO_BASE_PX } from '../../../datos/escalas.ts';
import { PALETA } from '../../../datos/colores.ts';

/**
 * Yunque: cabina bulbosa al frente unida por un cuello corto a dos motores
 * cilíndricos gemelos que se extienden hacia atrás en paralelo, con aros
 * transversales simulando refuerzos.
 */
export function dibujar(contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene): void {
  const largo = LARGO_BASE_PX * UNIDADES.coalicion.bombardero.escalaVisual;
  const p = PALETA.coalicion;
  const g = new Phaser.GameObjects.Graphics(escena);
  const noseX = largo * 0.5;
  const tailX = -largo * 0.5;
  const tuboAncho = largo * 0.16;
  const tuboLargo = largo * 0.8;
  const tuboX = tailX + largo * 0.02;

  g.fillStyle(p.casco, 1);
  g.lineStyle(Math.max(1, largo * 0.03), p.cascoOscuro, 1);

  // Motores gemelos.
  for (const s of [1, -1]) {
    const centroY = s * largo * 0.22;
    g.fillRect(tuboX, centroY - tuboAncho / 2, tuboLargo, tuboAncho);
    g.strokeRect(tuboX, centroY - tuboAncho / 2, tuboLargo, tuboAncho);
    // Aros transversales.
    g.lineStyle(Math.max(1, largo * 0.012), p.acento, 1);
    for (let i = 1; i <= 3; i++) {
      const lx = tuboX + (tuboLargo * i) / 4;
      g.lineBetween(lx, centroY - tuboAncho / 2, lx, centroY + tuboAncho / 2);
    }
    g.lineStyle(Math.max(1, largo * 0.03), p.cascoOscuro, 1);
  }

  // Cuello que une cabina con motores.
  g.fillStyle(p.casco, 1);
  g.fillRect(largo * 0.02, -largo * 0.07, largo * 0.16, largo * 0.14);
  g.strokeRect(largo * 0.02, -largo * 0.07, largo * 0.16, largo * 0.14);

  // Cabina bulbosa (gota/óvalo) al frente.
  g.fillStyle(p.casco, 1);
  g.fillEllipse(noseX - largo * 0.24, 0, largo * 0.42, largo * 0.34);
  g.strokeEllipse(noseX - largo * 0.24, 0, largo * 0.42, largo * 0.34);
  g.fillStyle(p.detalle, 0.9);
  g.fillEllipse(noseX - largo * 0.28, 0, largo * 0.18, largo * 0.16);

  // Detalle rojo en la nariz.
  g.fillStyle(p.acento, 1);
  g.fillCircle(noseX - largo * 0.05, 0, largo * 0.035);

  contenedor.add(g);
}
