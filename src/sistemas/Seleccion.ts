// Selección y control del jugador: click simple, rectángulo de arrastre,
// click derecho contextual (mover / atacar / capturar), y grupos de control
// (Ctrl+número asigna, número selecciona).
import Phaser from 'phaser';
import type { Faccion } from '../nucleo/tipos.ts';
import type { Nave } from '../entidades/Nave.ts';
import type { Mina } from '../entidades/Mina.ts';
import type { Base } from '../entidades/Base.ts';
import { PALETA } from '../datos/colores.ts';

export interface ContextoSeleccion {
  faccionJugador: Faccion;
  obtenerNavesJugador(): Nave[];
  obtenerNavesEnemigas(): Nave[];
  obtenerMinas(): Mina[];
  obtenerBaseEnemiga(): Base;
  /** alto en px de la franja inferior reservada al HUD, donde no se debe seleccionar */
  alturaZonaHudPx: number;
}

const UMBRAL_ARRASTRE_PX = 6;
const TOLERANCIA_CLICK_PX = 10;

export class GestorSeleccion {
  private escena: Phaser.Scene;
  private ctx: ContextoSeleccion;
  seleccionActual: Nave[] = [];
  private grupos: Map<number, Nave[]> = new Map();

  private arrastrando = false;
  private inicioScreenX = 0;
  private inicioScreenY = 0;
  private grafico: Phaser.GameObjects.Graphics;
  private teclaShift: Phaser.Input.Keyboard.Key;
  private teclaCtrl: Phaser.Input.Keyboard.Key;

  onCambioSeleccion?: (naves: Nave[]) => void;

  constructor(escena: Phaser.Scene, ctx: ContextoSeleccion) {
    this.escena = escena;
    this.ctx = ctx;
    this.grafico = escena.add.graphics();
    this.grafico.setScrollFactor(0);
    this.grafico.setDepth(1000);

    escena.input.on('pointerdown', this.alPointerDown, this);
    escena.input.on('pointermove', this.alPointerMove, this);
    escena.input.on('pointerup', this.alPointerUp, this);
    escena.input.mouse?.disableContextMenu();

    const teclado = escena.input.keyboard!;
    this.teclaShift = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.teclaCtrl = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    for (let n = 1; n <= 9; n++) {
      teclado.on(`keydown-${claveNumero(n)}`, () => this.alPresionarNumero(n));
    }
  }

  private enZonaHud(y: number): boolean {
    return y > this.escena.scale.height - this.ctx.alturaZonaHudPx;
  }

  private alPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.enZonaHud(pointer.y)) return;
    if (pointer.rightButtonDown()) {
      this.ejecutarOrdenContextual(pointer);
      return;
    }
    this.arrastrando = true;
    this.inicioScreenX = pointer.x;
    this.inicioScreenY = pointer.y;
  }

  private alPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.arrastrando) return;
    this.grafico.clear();
    const x = Math.min(this.inicioScreenX, pointer.x);
    const y = Math.min(this.inicioScreenY, pointer.y);
    const w = Math.abs(pointer.x - this.inicioScreenX);
    const h = Math.abs(pointer.y - this.inicioScreenY);
    if (w > UMBRAL_ARRASTRE_PX || h > UMBRAL_ARRASTRE_PX) {
      this.grafico.lineStyle(1.5, PALETA[this.ctx.faccionJugador].seleccion, 0.9);
      this.grafico.fillStyle(PALETA[this.ctx.faccionJugador].seleccion, 0.12);
      this.grafico.fillRect(x, y, w, h);
      this.grafico.strokeRect(x, y, w, h);
    }
  }

  private alPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.arrastrando) return;
    this.arrastrando = false;
    this.grafico.clear();
    if (pointer.rightButtonReleased()) return;

    const dx = pointer.x - this.inicioScreenX;
    const dy = pointer.y - this.inicioScreenY;
    const esClick = Math.hypot(dx, dy) < UMBRAL_ARRASTRE_PX;

    const cam = this.escena.cameras.main;
    if (esClick) {
      const mundo = cam.getWorldPoint(pointer.x, pointer.y);
      const nave = this.buscarNaveCercana(mundo.x, mundo.y);
      this.setSeleccion(nave ? [nave] : []);
      return;
    }

    const p1 = cam.getWorldPoint(this.inicioScreenX, this.inicioScreenY);
    const p2 = cam.getWorldPoint(pointer.x, pointer.y);
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const seleccion = this.ctx
      .obtenerNavesJugador()
      .filter((n) => n.estaVivo() && n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY);
    this.setSeleccion(seleccion);
  }

  private buscarNaveCercana(x: number, y: number): Nave | null {
    let mejor: Nave | null = null;
    let mejorDist = Infinity;
    for (const n of this.ctx.obtenerNavesJugador()) {
      if (!n.estaVivo()) continue;
      const d = Phaser.Math.Distance.Between(x, y, n.x, n.y);
      const tolerancia = n.radioColision() + TOLERANCIA_CLICK_PX;
      if (d <= tolerancia && d < mejorDist) {
        mejor = n;
        mejorDist = d;
      }
    }
    return mejor;
  }

  private ejecutarOrdenContextual(pointer: Phaser.Input.Pointer): void {
    if (this.seleccionActual.length === 0) return;
    const cam = this.escena.cameras.main;
    const mundo = cam.getWorldPoint(pointer.x, pointer.y);

    // ¿clickeó una nave enemiga?
    for (const enemiga of this.ctx.obtenerNavesEnemigas()) {
      if (!enemiga.estaVivo()) continue;
      if (Phaser.Math.Distance.Between(mundo.x, mundo.y, enemiga.x, enemiga.y) <= enemiga.radioColision() + TOLERANCIA_CLICK_PX) {
        for (const n of this.seleccionActual) n.ordenarAtacar(enemiga);
        return;
      }
    }

    // ¿clickeó la base enemiga?
    const baseEnemiga = this.ctx.obtenerBaseEnemiga();
    if (baseEnemiga.estaVivo() && Phaser.Math.Distance.Between(mundo.x, mundo.y, baseEnemiga.x, baseEnemiga.y) <= 90) {
      for (const n of this.seleccionActual) n.ordenarAtacar(baseEnemiga);
      return;
    }

    // ¿clickeó una mina (propia, ajena o neutral)?
    for (const mina of this.ctx.obtenerMinas()) {
      if (mina.destruida) continue;
      if (Phaser.Math.Distance.Between(mundo.x, mundo.y, mina.x, mina.y) <= 26) {
        for (const n of this.seleccionActual) n.ordenarCapturar(mina);
        return;
      }
    }

    // suelo vacío: mover
    for (const n of this.seleccionActual) n.moverA(mundo.x, mundo.y);
  }

  private alPresionarNumero(n: number): void {
    const modificador = this.teclaShift.isDown || this.teclaCtrl.isDown;
    if (modificador && this.seleccionActual.length > 0) {
      this.grupos.set(n, [...this.seleccionActual]);
    } else {
      const grupo = (this.grupos.get(n) ?? []).filter((nave) => nave.estaVivo());
      if (grupo.length > 0) this.setSeleccion(grupo);
    }
  }

  setSeleccion(naves: Nave[]): void {
    for (const n of this.seleccionActual) n.setSeleccionada(false);
    this.seleccionActual = naves;
    for (const n of this.seleccionActual) n.setSeleccionada(true);
    this.onCambioSeleccion?.(this.seleccionActual);
  }

  /** Quita del estado interno (grupos, selección) las naves que ya murieron. */
  limpiarMuertas(): void {
    this.seleccionActual = this.seleccionActual.filter((n) => n.estaVivo());
    for (const [k, naves] of this.grupos) {
      this.grupos.set(k, naves.filter((n) => n.estaVivo()));
    }
  }
}

function claveNumero(n: number): string {
  const nombres = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  return nombres[n];
}
