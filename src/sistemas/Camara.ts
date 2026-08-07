// Cámara desplazable: paneo con teclado (WASD/flechas) y con el mouse en los
// bordes de la pantalla, siempre dentro de los límites del mundo.
import Phaser from 'phaser';

const VELOCIDAD_PAN_PX_SEG = 640;
const MARGEN_BORDE_PX = 18;

export class GestorCamara {
  private escena: Phaser.Scene;
  private teclasWasd: { arriba: Phaser.Input.Keyboard.Key; abajo: Phaser.Input.Keyboard.Key; izq: Phaser.Input.Keyboard.Key; der: Phaser.Input.Keyboard.Key };
  private teclasFlechas: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(escena: Phaser.Scene, anchoMundo: number, altoMundo: number) {
    this.escena = escena;
    escena.cameras.main.setBounds(0, 0, anchoMundo, altoMundo);
    const teclado = escena.input.keyboard!;
    this.teclasWasd = {
      arriba: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      abajo: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      izq: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      der: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.teclasFlechas = teclado.createCursorKeys();
  }

  centrarEn(x: number, y: number): void {
    this.escena.cameras.main.centerOn(x, y);
  }

  actualizar(dtMs: number, alturaZonaHudPx: number): void {
    const cam = this.escena.cameras.main;
    const dt = dtMs / 1000;
    let dx = 0;
    let dy = 0;

    if (this.teclasWasd.izq.isDown || this.teclasFlechas.left.isDown) dx -= 1;
    if (this.teclasWasd.der.isDown || this.teclasFlechas.right.isDown) dx += 1;
    if (this.teclasWasd.arriba.isDown || this.teclasFlechas.up.isDown) dy -= 1;
    if (this.teclasWasd.abajo.isDown || this.teclasFlechas.down.isDown) dy += 1;

    const pointer = this.escena.input.activePointer;
    if (pointer.y < this.escena.scale.height - alturaZonaHudPx) {
      if (pointer.x <= MARGEN_BORDE_PX) dx -= 1;
      else if (pointer.x >= this.escena.scale.width - MARGEN_BORDE_PX) dx += 1;
      if (pointer.y <= MARGEN_BORDE_PX) dy -= 1;
      else if (pointer.y >= this.escena.scale.height - alturaZonaHudPx - MARGEN_BORDE_PX) dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const largo = Math.hypot(dx, dy) || 1;
      cam.scrollX += (dx / largo) * VELOCIDAD_PAN_PX_SEG * dt;
      cam.scrollY += (dy / largo) * VELOCIDAD_PAN_PX_SEG * dt;
    }
  }
}
