// Menú de inicio: título, breve explicación y selección de dificultad.
// La dificultad solo modifica los créditos iniciales del jugador.
import Phaser from 'phaser';
import type { Dificultad } from '../nucleo/tipos.ts';
import { PALETA } from '../datos/colores.ts';
import { ECONOMIA } from '../datos/balance.ts';

const DIFICULTADES: { clave: Dificultad; etiqueta: string; descripcion: string }[] = [
  { clave: 'facil', etiqueta: 'Fácil', descripcion: `Arrancás con ${ECONOMIA.multiplicadorDificultad.facil}× los créditos iniciales` },
  { clave: 'normal', etiqueta: 'Normal', descripcion: 'Créditos iniciales estándar, igual que la IA' },
  { clave: 'dificil', etiqueta: 'Difícil', descripcion: `Arrancás con ${ECONOMIA.multiplicadorDificultad.dificil}× los créditos iniciales` },
];

export class EscenaMenu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor(0x05070d);

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 140; i++) {
      g.fillCircle(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h), Phaser.Math.FloatBetween(0.4, 1.4));
    }

    this.add
      .text(w / 2, h * 0.16, 'GUERRA DE FÁBRICAS', {
        fontFamily: 'monospace',
        fontSize: '46px',
        color: '#e8ecf0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.16 + 46, 'La Coalición  vs.  El Enjambre', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#7fe0ff',
      })
      .setOrigin(0.5);

    this.add
      .text(
        w / 2,
        h * 0.36,
        'Capturá minas para financiar tu flota, producí naves en tu base,\nsubila de nivel y destruí la base enemiga antes que la tuya caiga.',
        { fontFamily: 'monospace', fontSize: '14px', color: '#b8c2cc', align: 'center' },
      )
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.47, 'Elegí la dificultad:', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e8ecf0',
      })
      .setOrigin(0.5);

    const anchoBoton = 220;
    const altoBoton = 80;
    const separacion = 30;
    const totalAncho = DIFICULTADES.length * anchoBoton + (DIFICULTADES.length - 1) * separacion;
    const inicioX = w / 2 - totalAncho / 2;
    const y = h * 0.6;

    DIFICULTADES.forEach((d, i) => {
      const x = inicioX + i * (anchoBoton + separacion) + anchoBoton / 2;
      const rect = this.add.rectangle(x, y, anchoBoton, altoBoton, 0x1c2230, 0.95);
      rect.setStrokeStyle(2, PALETA.coalicion.acento, 0.8);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerover', () => rect.setFillStyle(0x2a3040, 0.95));
      rect.on('pointerout', () => rect.setFillStyle(0x1c2230, 0.95));
      rect.on('pointerdown', () => this.scene.start('Juego', { dificultad: d.clave }));

      this.add
        .text(x, y - 14, d.etiqueta, { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5);
      this.add
        .text(x, y + 16, d.descripcion, { fontFamily: 'monospace', fontSize: '10px', color: '#b8c2cc', align: 'center', wordWrap: { width: anchoBoton - 20 } })
        .setOrigin(0.5);
    });

    this.add
      .text(
        w / 2,
        h * 0.86,
        'Click izquierdo: seleccionar / arrastrar   ·   Click derecho: mover, atacar o capturar   ·   1-9: grupos de control',
        { fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' },
      )
      .setOrigin(0.5);
  }
}
