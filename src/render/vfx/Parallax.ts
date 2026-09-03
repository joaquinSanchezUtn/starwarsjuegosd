// Fondo con parallax: 3+ capas a distinta velocidad de desplazamiento con la
// cámara, usando `setScrollFactor` nativo de Phaser (el motor recalcula el
// desplazamiento visual solo, sin reposicionar nada a mano cada frame — es
// la técnica más barata disponible para parallax en Phaser).
import Phaser from 'phaser';

export interface CapaParallax {
  destroy(): void;
}

export function crearFondoParallax(escena: Phaser.Scene, anchoMundo: number, altoMundo: number): CapaParallax {
  const margen = 2200;
  const minX = -margen;
  const maxX = anchoMundo + margen;
  const minY = -margen;
  const maxY = altoMundo + margen;

  // Capa 1: polvo estelar lejano (casi no se mueve con la cámara).
  const lejano = escena.add.graphics();
  lejano.setScrollFactor(0.15);
  lejano.setDepth(-30);
  lejano.fillStyle(0xffffff, 0.3);
  for (let i = 0; i < 320; i++) {
    lejano.fillCircle(Phaser.Math.Between(minX, maxX), Phaser.Math.Between(minY, maxY), Phaser.Math.FloatBetween(0.3, 0.8));
  }

  // Capa 2: campo de estrellas medio.
  const medio = escena.add.graphics();
  medio.setScrollFactor(0.45);
  medio.setDepth(-20);
  medio.fillStyle(0xffffff, 0.6);
  for (let i = 0; i < 240; i++) {
    medio.fillCircle(Phaser.Math.Between(minX, maxX), Phaser.Math.Between(minY, maxY), Phaser.Math.FloatBetween(0.5, 1.6));
  }

  // Capa 3a: nebulosas de color, tenues, con blend aditivo.
  const nebulosas = escena.add.graphics();
  nebulosas.setScrollFactor(0.75);
  nebulosas.setDepth(-12);
  nebulosas.setBlendMode(Phaser.BlendModes.ADD);
  const coloresNebulosa = [0x5a3fae, 0x2f6fa8, 0x8a2f5c, 0x3f7a5a];
  for (let i = 0; i < 6; i++) {
    const x = Phaser.Math.Between(minX, maxX);
    const y = Phaser.Math.Between(minY, maxY);
    const color = coloresNebulosa[i % coloresNebulosa.length];
    const r = Phaser.Math.Between(160, 320);
    nebulosas.fillStyle(color, 0.045);
    nebulosas.fillCircle(x, y, r);
    nebulosas.fillStyle(color, 0.075);
    nebulosas.fillCircle(x, y, r * 0.5);
  }

  // Capa 3b: elementos cercanos concretos — un planeta gigante en una
  // esquina y restos de batallas anteriores a la deriva — con blend normal.
  const cercano = escena.add.graphics();
  cercano.setScrollFactor(0.75);
  cercano.setDepth(-11);

  const px = anchoMundo * 0.92;
  const py = -altoMundo * 0.18;
  cercano.fillStyle(0x2c3a48, 1);
  cercano.fillCircle(px, py, 260);
  cercano.fillStyle(0x1b2530, 0.55);
  cercano.fillCircle(px - 55, py - 35, 260);
  cercano.fillStyle(0x46586b, 0.5);
  cercano.fillCircle(px + 70, py + 50, 150);
  cercano.lineStyle(16, 0x5c6f80, 0.3);
  cercano.strokeCircle(px, py, 345);

  cercano.fillStyle(0x2a2d33, 0.65);
  cercano.lineStyle(1, 0x14161a, 0.6);
  for (let i = 0; i < 7; i++) {
    const x = Phaser.Math.Between(0, anchoMundo);
    const y = Phaser.Math.Between(0, altoMundo);
    const s = Phaser.Math.Between(9, 24);
    const rot = Phaser.Math.FloatBetween(0, Math.PI);
    cercano.save();
    cercano.translateCanvas(x, y);
    cercano.rotateCanvas(rot);
    cercano.fillRect(-s / 2, -s * 0.18, s, s * 0.36);
    cercano.strokeRect(-s / 2, -s * 0.18, s, s * 0.36);
    cercano.restore();
  }

  return {
    destroy() {
      lejano.destroy();
      medio.destroy();
      nebulosas.destroy();
      cercano.destroy();
    },
  };
}
