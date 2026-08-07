// Base jugable: produce naves en cola, sube de nivel (1→2→3) pagando
// créditos, tiene mucha vida y un ataque defensivo de corto alcance.
import Phaser from 'phaser';
import type { Faccion, ItemColaProduccion, NivelBase, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { BASE, UNIDADES } from '../datos/balance.ts';
import { RADIO_BASE_JUGADOR_PX } from '../datos/escalas.ts';
import { dibujarBase } from '../render/dibujos/index.ts';
import { PALETA, COLOR_HP_ALTO, COLOR_HP_MEDIO, COLOR_HP_BAJO } from '../datos/colores.ts';

let proximoId = 1;

export class Base extends Phaser.GameObjects.Container implements ObjetivoAtacable {
  readonly id: number;
  readonly tipoObjetivo = 'base' as const;
  readonly faccion: Faccion;

  vida: number;
  vidaMax = BASE.vidaMax;
  nivel: NivelBase = 1;
  subiendoNivel = false;
  private tiempoRestanteSubidaMs = 0;

  colaProduccion: ItemColaProduccion[] = [];
  private cronometroDefensaMs = 0;

  private barraVida: Phaser.GameObjects.Graphics;
  private radioAnillo: Phaser.GameObjects.Graphics;

  constructor(escena: Phaser.Scene, x: number, y: number, faccion: Faccion) {
    super(escena, x, y);
    this.id = proximoId++;
    this.faccion = faccion;
    this.vidaMax = BASE.vidaMax;
    this.vida = this.vidaMax;

    dibujarBase(this, escena, faccion);

    this.radioAnillo = new Phaser.GameObjects.Graphics(escena);
    this.add(this.radioAnillo);

    this.barraVida = new Phaser.GameObjects.Graphics(escena);
    this.add(this.barraVida);
    this.actualizarBarraVida();

    escena.add.existing(this);
    this.setDepth(3);
  }

  estaVivo(): boolean {
    return this.vida > 0;
  }

  recibirDanio(cantidad: number, _tipoAtacante: TipoUnidad): void {
    if (!this.estaVivo()) return;
    this.vida = Math.max(0, this.vida - cantidad);
    this.actualizarBarraVida();
  }

  /** Intenta encolar una unidad. Devuelve false si no hay créditos/nivel/espacio. */
  puedeProducir(tipo: TipoUnidad): boolean {
    const datos = UNIDADES[this.faccion][tipo];
    return datos.nivelBaseRequerido <= this.nivel && this.colaProduccion.length < 6;
  }

  encolar(tipo: TipoUnidad): void {
    const datos = UNIDADES[this.faccion][tipo];
    this.colaProduccion.push({ tipo, tiempoTotalMs: datos.tiempoProduccionMs, tiempoRestanteMs: datos.tiempoProduccionMs });
  }

  iniciarSubidaNivel(): boolean {
    if (this.nivel >= 3 || this.subiendoNivel) return false;
    const siguiente = (this.nivel + 1) as 2 | 3;
    this.subiendoNivel = true;
    this.tiempoRestanteSubidaMs = BASE.tiempoSubirNivelMs[siguiente];
    return true;
  }

  /** Avanza cola de producción y subida de nivel. Devuelve tipos listos para spawnear este tick. */
  actualizarProduccion(dtMs: number): TipoUnidad[] {
    const listos: TipoUnidad[] = [];
    if (this.colaProduccion.length > 0) {
      const primero = this.colaProduccion[0];
      primero.tiempoRestanteMs -= dtMs;
      if (primero.tiempoRestanteMs <= 0) {
        listos.push(primero.tipo);
        this.colaProduccion.shift();
      }
    }
    if (this.subiendoNivel) {
      this.tiempoRestanteSubidaMs -= dtMs;
      if (this.tiempoRestanteSubidaMs <= 0) {
        this.nivel = (this.nivel + 1) as NivelBase;
        this.subiendoNivel = false;
      }
    }
    return listos;
  }

  progresoSubidaNivel01(): number {
    if (!this.subiendoNivel || this.nivel >= 3) return 0;
    const siguiente = (this.nivel + 1) as 2 | 3;
    return 1 - Phaser.Math.Clamp(this.tiempoRestanteSubidaMs / BASE.tiempoSubirNivelMs[siguiente], 0, 1);
  }

  /** Devuelve true si este tick corresponde disparar contra `objetivo` (cooldown de defensa). */
  intentarDispararDefensa(dtMs: number): boolean {
    this.cronometroDefensaMs -= dtMs;
    if (this.cronometroDefensaMs <= 0) {
      this.cronometroDefensaMs = BASE.cadenciaDefensaMs;
      return true;
    }
    return false;
  }

  private actualizarBarraVida(): void {
    this.barraVida.clear();
    const ancho = RADIO_BASE_JUGADOR_PX * 1.6;
    const alto = 8;
    const y = -RADIO_BASE_JUGADOR_PX - 18;
    const frac = this.vida / this.vidaMax;
    const color = frac > 0.5 ? COLOR_HP_ALTO : frac > 0.25 ? COLOR_HP_MEDIO : COLOR_HP_BAJO;
    this.barraVida.fillStyle(0x000000, 0.5);
    this.barraVida.fillRect(-ancho / 2, y, ancho, alto);
    this.barraVida.fillStyle(color, 1);
    this.barraVida.fillRect(-ancho / 2, y, ancho * frac, alto);
    this.barraVida.lineStyle(1, PALETA[this.faccion].detalle, 1);
    this.barraVida.strokeRect(-ancho / 2, y, ancho, alto);
  }
}
