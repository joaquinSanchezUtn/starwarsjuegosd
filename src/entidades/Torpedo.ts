// Torpedo: proyectil real (no hitscan) que dispara el bombardero. Vuela
// despacio con leve guiado hacia la posición actual del objetivo; si el
// objetivo se aleja lo bastante antes de que llegue, el torpedo agota su
// vida útil y falla — esa es la forma en la que resulta "interceptable" sin
// necesitar un sistema de defensa antimisiles dedicado.
import Phaser from 'phaser';
import type { Faccion, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { PALETA } from '../datos/colores.ts';
import { aplicarDanio, aplicarDanioEnArea } from '../sistemas/Combate.ts';
import { crearExplosion } from '../render/efectos.ts';

const VELOCIDAD_PX_SEG = 230;
const VIDA_UTIL_MAX_MS = 3200;
const RADIO_IMPACTO_PX = 16;

let proximoId = 1;

export class Torpedo extends Phaser.GameObjects.Container {
  readonly id: number;
  readonly faccion: Faccion;
  private objetivo: ObjetivoAtacable;
  private danio: number;
  private tipoAtacante: TipoUnidad;
  private radioDanioArea?: number;
  private vidaUtilRestanteMs = VIDA_UTIL_MAX_MS;
  private grafico: Phaser.GameObjects.Graphics;

  constructor(
    escena: Phaser.Scene,
    x: number,
    y: number,
    objetivo: ObjetivoAtacable,
    danio: number,
    tipoAtacante: TipoUnidad,
    faccion: Faccion,
    radioDanioArea?: number,
  ) {
    super(escena, x, y);
    this.id = proximoId++;
    this.objetivo = objetivo;
    this.danio = danio;
    this.tipoAtacante = tipoAtacante;
    this.faccion = faccion;
    this.radioDanioArea = radioDanioArea;

    const color = PALETA[faccion].acento;
    this.grafico = new Phaser.GameObjects.Graphics(escena);
    this.grafico.fillStyle(color, 1);
    this.grafico.fillTriangle(8, 0, -6, 4, -6, -4);
    this.grafico.fillStyle(0xffffff, 0.9);
    this.grafico.fillCircle(6, 0, 1.6);
    this.add(this.grafico);

    this.rotation = Phaser.Math.Angle.Between(x, y, objetivo.x, objetivo.y);
    escena.add.existing(this);
    this.setDepth(41);
  }

  /** Devuelve false cuando el torpedo debe eliminarse (impactó, falló o expiró). */
  actualizar(dtMs: number, candidatosAoE: ObjetivoAtacable[]): boolean {
    this.vidaUtilRestanteMs -= dtMs;
    if (this.vidaUtilRestanteMs <= 0 || !this.objetivo.estaVivo()) {
      this.destroy();
      return false;
    }

    const anguloObjetivo = Phaser.Math.Angle.Between(this.x, this.y, this.objetivo.x, this.objetivo.y);
    // Guiado leve: no corrige instantáneamente, así un blanco rápido puede escaparle.
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, anguloObjetivo, 6 * (dtMs / 1000));
    const paso = VELOCIDAD_PX_SEG * (dtMs / 1000);
    this.x += Math.cos(this.rotation) * paso;
    this.y += Math.sin(this.rotation) * paso;

    const d = Phaser.Math.Distance.Between(this.x, this.y, this.objetivo.x, this.objetivo.y);
    if (d <= RADIO_IMPACTO_PX) {
      if (this.radioDanioArea) {
        aplicarDanioEnArea(this.tipoAtacante, this.objetivo, this.danio, this.radioDanioArea, candidatosAoE);
      } else {
        aplicarDanio(this.tipoAtacante, this.objetivo, this.danio);
      }
      crearExplosion(this.scene, this.scene.cameras.main, this.x, this.y, 'cazaLigero', this.faccion, 0.5, this.rotation);
      this.destroy();
      return false;
    }
    return true;
  }
}
