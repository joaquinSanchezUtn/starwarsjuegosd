// Efectos visuales reutilizables: estela de motor, disparo, explosión y
// anillo de captura. Versión placeholder simple; se puede refinar sin tocar
// el resto del motor porque respeta el mismo contrato de funciones.
import Phaser from 'phaser';
import type { Faccion } from '../nucleo/tipos.ts';
import { PALETA, COLOR_ANILLO_CAPTURA } from '../datos/colores.ts';

export function crearExplosion(escena: Phaser.Scene, x: number, y: number, escala = 1): void {
  const circulo = escena.add.circle(x, y, 6 * escala, 0xffcc66, 0.9);
  circulo.setDepth(50);
  escena.tweens.add({
    targets: circulo,
    radius: 22 * escala,
    alpha: 0,
    duration: 350,
    ease: 'Cubic.Out',
    onComplete: () => circulo.destroy(),
  });
  // Segundo destello para dar sensación de impacto
  const nucleo = escena.add.circle(x, y, 3 * escala, 0xffffff, 1);
  nucleo.setDepth(51);
  escena.tweens.add({
    targets: nucleo,
    alpha: 0,
    scale: 2.5,
    duration: 180,
    onComplete: () => nucleo.destroy(),
  });
}

export function crearDisparo(
  escena: Phaser.Scene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  faccion: Faccion,
): void {
  const color = PALETA[faccion].acento;
  const linea = escena.add.line(0, 0, x1, y1, x2, y2, color, 0.9);
  linea.setLineWidth(2);
  linea.setOrigin(0, 0);
  linea.setDepth(40);
  escena.tweens.add({
    targets: linea,
    alpha: 0,
    duration: 120,
    onComplete: () => linea.destroy(),
  });
}

export interface AnilloCaptura {
  setProgreso(t: number): void;
  destroy(): void;
}

export function crearAnilloCaptura(
  escena: Phaser.Scene,
  x: number,
  y: number,
  radio: number,
): AnilloCaptura {
  const g = escena.add.graphics({ x, y });
  g.setDepth(30);
  let progreso = 0;
  const redibujar = () => {
    g.clear();
    g.lineStyle(3, COLOR_ANILLO_CAPTURA, 0.9);
    g.beginPath();
    g.arc(0, 0, radio, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * progreso), false);
    g.strokePath();
  };
  redibujar();
  return {
    setProgreso(t: number) {
      progreso = Phaser.Math.Clamp(t, 0, 1);
      redibujar();
    },
    destroy() {
      g.destroy();
    },
  };
}

export interface EstelaMotor {
  destroy(): void;
}

/** Estela simple que sigue a un contenedor mientras esté vivo. */
export function crearEstelaMotor(
  escena: Phaser.Scene,
  objetivo: Phaser.GameObjects.Container,
  faccion: Faccion,
  offsetLocalX: number,
): EstelaMotor {
  const color = PALETA[faccion].estelaMotor;
  const emisor = escena.time.addEvent({
    delay: 60,
    loop: true,
    callback: () => {
      if (!objetivo.active) return;
      const rot = objetivo.rotation;
      const dx = Math.cos(rot) * offsetLocalX;
      const dy = Math.sin(rot) * offsetLocalX;
      const punto = escena.add.circle(objetivo.x + dx, objetivo.y + dy, 2, color, 0.7);
      punto.setDepth(objetivo.depth - 1);
      escena.tweens.add({
        targets: punto,
        alpha: 0,
        radius: 0.5,
        duration: 300,
        onComplete: () => punto.destroy(),
      });
    },
  });
  return {
    destroy() {
      emisor.remove(false);
    },
  };
}
