// Chatarra recolectable: la dejan las naves grandes (fragata en adelante) al
// morir. Cualquier nave propia —de cualquier bando, el que llegue primero—
// que pase por encima la recolecta y suma su valor en créditos a la facción
// de esa nave. Se desvanece sola después de un tiempo si nadie la recoge.
import Phaser from 'phaser';
import { CHATARRA } from '../datos/balance.ts';

let proximoId = 1;

export class Chatarra extends Phaser.GameObjects.Container {
  readonly id: number;
  readonly valor: number;
  recolectada = false;

  private tiempoVidaRestanteMs: number;
  private grafico: Phaser.GameObjects.Graphics;

  constructor(escena: Phaser.Scene, x: number, y: number, valor: number) {
    super(escena, x, y);
    this.id = proximoId++;
    this.valor = Math.round(valor);
    this.tiempoVidaRestanteMs = CHATARRA.tiempoVidaMs;

    this.grafico = new Phaser.GameObjects.Graphics(escena);
    this.dibujar();
    this.add(this.grafico);

    escena.add.existing(this);
    this.setDepth(4);

    escena.tweens.add({
      targets: this,
      angle: 360,
      duration: 9000 + Math.random() * 4000,
      repeat: -1,
    });
  }

  private dibujar(): void {
    const g = this.grafico;
    g.clear();
    const color = 0x8a8f98;
    const colorOscuro = 0x4a4d54;
    g.fillStyle(colorOscuro, 1);
    g.lineStyle(1, color, 0.9);
    // Tres fragmentos irregulares de casco, como restos de una nave partida.
    g.fillTriangle(-9, -3, -2, -8, 4, -2);
    g.strokeTriangle(-9, -3, -2, -8, 4, -2);
    g.fillTriangle(-3, 4, 6, 2, 8, 9);
    g.strokeTriangle(-3, 4, 6, 2, 8, 9);
    g.fillTriangle(-8, 4, -10, 9, -2, 8);
    g.strokeTriangle(-8, 4, -10, 9, -2, 8);
    // Brillo dorado tenue del valor en créditos.
    g.fillStyle(0xffd76a, 0.85);
    g.fillCircle(0, 0, 2.4);
  }

  /** Avanza el temporizador de desvanecimiento. Devuelve false cuando ya debe eliminarse. */
  actualizar(dtMs: number): boolean {
    if (this.recolectada) return false;
    this.tiempoVidaRestanteMs -= dtMs;
    if (this.tiempoVidaRestanteMs < 4000) {
      this.setAlpha(Phaser.Math.Clamp(this.tiempoVidaRestanteMs / 4000, 0.15, 1));
    }
    if (this.tiempoVidaRestanteMs <= 0) {
      this.destroy();
      return false;
    }
    return true;
  }

  /** Marca la chatarra como recolectada y devuelve su valor en créditos. */
  recolectar(): number {
    this.recolectada = true;
    this.destroy();
    return this.valor;
  }
}
