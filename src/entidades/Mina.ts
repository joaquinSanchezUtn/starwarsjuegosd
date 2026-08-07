// Mina de recursos: arranca neutral, se captura manteniendo naves de un solo
// bando cerca, genera créditos por segundo mientras está controlada, puede
// ser destruida a tiros (vuelve a neutral tras un tiempo) o recapturada
// directamente por el rival parando una nave al lado.
import Phaser from 'phaser';
import type { Faccion, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { MINA } from '../datos/balance.ts';
import { RADIO_MINA_PX } from '../datos/escalas.ts';
import { COLOR_MINA_NEUTRAL, PALETA } from '../datos/colores.ts';
import { crearAnilloCaptura, type AnilloCaptura } from '../render/efectos.ts';

let proximoId = 1;

export class Mina extends Phaser.GameObjects.Container implements ObjetivoAtacable {
  readonly id: number;
  readonly tipoObjetivo = 'mina' as const;
  vida: number;
  vidaMax = MINA.vidaMax;
  duenio: Faccion | null = null;
  destruida = false;
  private tiempoRegenRestanteMs = 0;

  /** progreso de captura en curso, si hay alguna facción capturando en soledad */
  private faccionCapturando: Faccion | null = null;
  private progresoCapturaMs = 0;

  private grafico: Phaser.GameObjects.Graphics;
  private anillo: AnilloCaptura | null = null;

  constructor(escena: Phaser.Scene, x: number, y: number) {
    super(escena, x, y);
    this.id = proximoId++;
    this.vida = this.vidaMax;
    this.grafico = new Phaser.GameObjects.Graphics(escena);
    this.add(this.grafico);
    this.redibujar();
    escena.add.existing(this);
    this.setDepth(5);
  }

  get faccion(): Faccion {
    // Una mina neutral no pertenece a nadie; se usa 'coalicion' como valor
    // neutro técnico ya que ObjetivoAtacable exige una facción, pero el
    // combate contra minas se decide por duenio, no por este campo.
    return this.duenio ?? 'coalicion';
  }

  estaVivo(): boolean {
    return !this.destruida;
  }

  recibirDanio(cantidad: number, _tipoAtacante: TipoUnidad): void {
    if (this.destruida) return;
    this.vida -= cantidad;
    if (this.vida <= 0) {
      this.vida = 0;
      this.destruida = true;
      this.duenio = null;
      this.tiempoRegenRestanteMs = MINA.tiempoRegeneracionMs;
      this.faccionCapturando = null;
      this.progresoCapturaMs = 0;
      this.anillo?.destroy();
      this.anillo = null;
    }
    this.redibujar();
  }

  /**
   * Registra qué facciones tienen naves presentes este tick (con su mejor
   * multiplicador de captura disponible). Se llama una vez por frame desde
   * el sistema de economía.
   */
  actualizarCaptura(
    dtMs: number,
    faccionesPresentes: Map<Faccion, number>, // facción -> mejor multiplicadorCaptura presente
  ): void {
    if (this.destruida) return;

    if (faccionesPresentes.size !== 1) {
      // nadie presente, o disputada por ambos bandos: se congela el progreso
      if (faccionesPresentes.size > 1) {
        this.faccionCapturando = null;
        this.progresoCapturaMs = 0;
        this.anillo?.destroy();
        this.anillo = null;
      }
      return;
    }

    const [[faccion, multiplicador]] = faccionesPresentes;
    if (faccion === this.duenio) {
      // ya es suya, no hace falta progreso
      this.faccionCapturando = null;
      this.progresoCapturaMs = 0;
      this.anillo?.destroy();
      this.anillo = null;
      return;
    }

    if (this.faccionCapturando !== faccion) {
      this.faccionCapturando = faccion;
      this.progresoCapturaMs = 0;
      this.anillo?.destroy();
      this.anillo = crearAnilloCaptura(this.scene, this.x, this.y, RADIO_MINA_PX + 6);
    }

    const tiempoNecesario = MINA.tiempoCapturaMs / multiplicador;
    this.progresoCapturaMs += dtMs;
    this.anillo?.setProgreso(this.progresoCapturaMs / tiempoNecesario);

    if (this.progresoCapturaMs >= tiempoNecesario) {
      this.duenio = faccion;
      this.vida = this.vidaMax;
      this.faccionCapturando = null;
      this.progresoCapturaMs = 0;
      this.anillo?.destroy();
      this.anillo = null;
      this.redibujar();
    }
  }

  /** Avanza el temporizador de regeneración cuando está destruida. */
  actualizarRegeneracion(dtMs: number): void {
    if (!this.destruida) return;
    this.tiempoRegenRestanteMs -= dtMs;
    if (this.tiempoRegenRestanteMs <= 0) {
      this.destruida = false;
      this.vida = this.vidaMax;
      this.redibujar();
    }
  }

  get progresoRegeneracion01(): number {
    if (!this.destruida) return 1;
    return 1 - Phaser.Math.Clamp(this.tiempoRegenRestanteMs / MINA.tiempoRegeneracionMs, 0, 1);
  }

  private redibujar(): void {
    this.grafico.clear();
    if (this.destruida) {
      this.grafico.lineStyle(2, 0x555555, 0.8);
      this.grafico.strokeCircle(0, 0, RADIO_MINA_PX * 0.7);
      this.grafico.lineBetween(-6, -6, 6, 6);
      this.grafico.lineBetween(-6, 6, 6, -6);
      return;
    }
    const color = this.duenio ? PALETA[this.duenio].acento : COLOR_MINA_NEUTRAL;
    const relleno = this.duenio ? PALETA[this.duenio].casco : 0x3a3d44;
    this.grafico.fillStyle(relleno, 1);
    this.grafico.lineStyle(3, color, 1);
    this.grafico.fillCircle(0, 0, RADIO_MINA_PX);
    this.grafico.strokeCircle(0, 0, RADIO_MINA_PX);
    // cristal/nucleo interior
    this.grafico.fillStyle(color, 1);
    this.grafico.fillCircle(0, 0, RADIO_MINA_PX * 0.35);
  }
}
