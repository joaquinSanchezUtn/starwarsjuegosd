// Mina de recursos: arranca neutral, se captura manteniendo naves de un solo
// bando cerca, genera créditos por segundo mientras está controlada, puede
// ser destruida a tiros (vuelve a neutral tras un tiempo) o recapturada
// directamente por el rival parando una nave al lado.
//
// PROMPT 2 — economía: las minas "ricas" (centro del mapa) rinden el doble;
// cualquier mina propia puede mejorarse pagando créditos (+50% ingreso y
// +50% vida), pero la mejora se pierde si la mina es destruida — invertir en
// una mina expuesta es una apuesta.
import Phaser from 'phaser';
import type { Faccion, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { MINA, MEJORA_MINA } from '../datos/balance.ts';
import { RADIO_MINA_PX } from '../datos/escalas.ts';
import { COLOR_MINA_NEUTRAL, PALETA } from '../datos/colores.ts';
import { crearAnilloCaptura, type AnilloCaptura } from '../render/efectos.ts';

let proximoId = 1;

export class Mina extends Phaser.GameObjects.Container implements ObjetivoAtacable {
  readonly id: number;
  readonly tipoObjetivo = 'mina' as const;
  readonly esRica: boolean;
  vida: number;
  vidaMax: number;
  duenio: Faccion | null = null;
  destruida = false;
  /** 0 = sin mejorar, 1 = mejorada (+50% ingreso, +50% vida máxima) */
  nivelMejora: 0 | 1 = 0;
  private tiempoRegenRestanteMs = 0;

  /** progreso de captura en curso, si hay alguna facción capturando en soledad */
  private faccionCapturando: Faccion | null = null;
  private progresoCapturaMs = 0;

  private grafico: Phaser.GameObjects.Graphics;
  private anillo: AnilloCaptura | null = null;

  constructor(escena: Phaser.Scene, x: number, y: number, esRica = false) {
    super(escena, x, y);
    this.id = proximoId++;
    this.esRica = esRica;
    this.vidaMax = MINA.vidaMax;
    this.vida = this.vidaMax;
    this.grafico = new Phaser.GameObjects.Graphics(escena);
    this.add(this.grafico);
    this.redibujar();
    escena.add.existing(this);
    this.setDepth(5);
  }

  /** Ingreso por segundo que aporta esta mina, ya con los bonos de filón rico y mejora aplicados. */
  get ingresoPorSegundo(): number {
    if (this.destruida || !this.duenio) return 0;
    let ingreso = MINA.ingresoPorSegundo;
    if (this.esRica) ingreso *= MEJORA_MINA.multiplicadorMinaRica;
    if (this.nivelMejora === 1) ingreso *= 1 + MEJORA_MINA.bonoIngresoFraccion;
    return ingreso;
  }

  costoMejora(): number {
    return MEJORA_MINA.costo;
  }

  puedeMejorar(faccionQueIntenta: Faccion): boolean {
    return !this.destruida && this.duenio === faccionQueIntenta && this.nivelMejora === 0;
  }

  /** Intenta mejorar la mina. Devuelve el costo descontado, o 0 si no se pudo. */
  intentarMejorar(faccionQueIntenta: Faccion, creditosDisponibles: number): number {
    if (!this.puedeMejorar(faccionQueIntenta)) return 0;
    if (creditosDisponibles < MEJORA_MINA.costo) return 0;
    this.nivelMejora = 1;
    const fraccionVidaActual = this.vida / this.vidaMax;
    this.vidaMax = MINA.vidaMax * (1 + MEJORA_MINA.bonoVidaFraccion);
    this.vida = this.vidaMax * fraccionVidaActual;
    this.redibujar();
    return MEJORA_MINA.costo;
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
      // Destruida: se pierde la mejora que tuviera (invertir en una mina
      // expuesta es una apuesta, tal como se pidió).
      this.nivelMejora = 0;
      this.vidaMax = MINA.vidaMax;
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
      this.emit('capturada', faccion);
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
    // Las minas ricas se dibujan más grandes y con un halo extra, para que
    // se distingan a simple vista como las más valiosas (y más peleadas).
    const radio = this.esRica ? RADIO_MINA_PX * 1.35 : RADIO_MINA_PX;
    const color = this.duenio ? PALETA[this.duenio].acento : COLOR_MINA_NEUTRAL;
    const relleno = this.duenio ? PALETA[this.duenio].casco : 0x3a3d44;

    if (this.esRica) {
      this.grafico.fillStyle(0xffd76a, 0.16);
      this.grafico.fillCircle(0, 0, radio * 1.55);
      this.grafico.lineStyle(1.5, 0xffd76a, 0.55);
      this.grafico.strokeCircle(0, 0, radio * 1.22);
    }

    this.grafico.fillStyle(relleno, 1);
    this.grafico.lineStyle(3, color, 1);
    this.grafico.fillCircle(0, 0, radio);
    this.grafico.strokeCircle(0, 0, radio);
    // cristal/nucleo interior
    this.grafico.fillStyle(color, 1);
    this.grafico.fillCircle(0, 0, radio * 0.35);

    // Anillo dorado extra si está mejorada.
    if (this.nivelMejora === 1) {
      this.grafico.lineStyle(2, 0xffd76a, 0.9);
      this.grafico.strokeCircle(0, 0, radio + 5);
    }
  }
}
