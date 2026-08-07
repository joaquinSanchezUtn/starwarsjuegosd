// Escena principal de partida: mundo, cámara, bases, minas, naves,
// producción, economía, IA enemiga, selección/órdenes del jugador y HUD.
import Phaser from 'phaser';
import type { Dificultad, Faccion, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { Nave } from '../entidades/Nave.ts';
import { Base } from '../entidades/Base.ts';
import { Mina } from '../entidades/Mina.ts';
import { GestorCamara } from '../sistemas/Camara.ts';
import { GestorSeleccion, type ContextoSeleccion } from '../sistemas/Seleccion.ts';
import { actualizarMinas, calcularIngresoTick, calcularIngresoPorSegundo, contarMinasControladas, creditosIniciales } from '../sistemas/Economia.ts';
import { intentarProducir, intentarSubirNivel } from '../sistemas/Produccion.ts';
import { ANCHO_MUNDO, ALTO_MUNDO, POSICION_BASE_COALICION, POSICION_BASE_ENJAMBRE, POSICIONES_MINAS } from '../datos/mapa.ts';
import { BASE } from '../datos/balance.ts';
import { COLOR_FONDO_MAPA } from '../datos/colores.ts';
import { HUD, ALTURA_ZONA_HUD_PX } from '../ui/HUD.ts';
import { AdaptadorJuego } from '../ia/AdaptadorJuego.ts';
import { MaquinaEstadosIA } from '../ia/MaquinaEstadosIA.ts';

const FACCION_JUGADOR: Faccion = 'coalicion';
const FACCION_IA: Faccion = 'enjambre';

interface DatosInicioJuego {
  dificultad: Dificultad;
}

export class EscenaJuego extends Phaser.Scene {
  private dificultad: Dificultad = 'normal';

  private baseCoalicion!: Base;
  private baseEnjambre!: Base;
  private minas: Mina[] = [];
  private navesCoalicion: Nave[] = [];
  private navesEnjambre: Nave[] = [];

  private creditos: Record<Faccion, number> = { coalicion: 0, enjambre: 0 };

  private camara!: GestorCamara;
  private seleccion!: GestorSeleccion;
  private hud!: HUD;
  private ia!: MaquinaEstadosIA;

  private juegoTerminado = false;

  constructor() {
    super('Juego');
  }

  init(data: DatosInicioJuego): void {
    this.dificultad = data.dificultad ?? 'normal';
    this.juegoTerminado = false;
    this.navesCoalicion = [];
    this.navesEnjambre = [];
    this.minas = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_FONDO_MAPA);
    this.dibujarFondoEstrellado();

    this.baseCoalicion = new Base(this, POSICION_BASE_COALICION.x, POSICION_BASE_COALICION.y, 'coalicion');
    this.baseEnjambre = new Base(this, POSICION_BASE_ENJAMBRE.x, POSICION_BASE_ENJAMBRE.y, 'enjambre');

    this.minas = POSICIONES_MINAS.map((p) => new Mina(this, p.x, p.y));

    this.creditos.coalicion = creditosIniciales('jugador', this.dificultad);
    this.creditos.enjambre = creditosIniciales('ia', this.dificultad);

    this.camara = new GestorCamara(this, ANCHO_MUNDO, ALTO_MUNDO);
    this.camara.centrarEn(POSICION_BASE_COALICION.x, POSICION_BASE_COALICION.y);

    const contextoSeleccion: ContextoSeleccion = {
      faccionJugador: FACCION_JUGADOR,
      obtenerNavesJugador: () => this.navesCoalicion,
      obtenerNavesEnemigas: () => this.navesEnjambre,
      obtenerMinas: () => this.minas,
      obtenerBaseEnemiga: () => this.baseEnjambre,
      alturaZonaHudPx: ALTURA_ZONA_HUD_PX,
    };
    this.seleccion = new GestorSeleccion(this, contextoSeleccion);

    this.hud = new HUD(this, FACCION_JUGADOR);
    this.hud.onClickProducir = (tipo) => this.intentarProducirJugador(tipo);
    this.hud.onClickSubirNivel = () => this.intentarSubirNivelJugador();
    this.hud.onClickMinimapa = (x, y) => this.camara.centrarEn(x, y);
    this.hud.onVolverAlMenu = () => this.scene.start('Menu');

    this.ia = new MaquinaEstadosIA(new AdaptadorJuego(this), FACCION_IA, FACCION_JUGADOR);
  }

  update(_time: number, delta: number): void {
    if (this.juegoTerminado) return;
    const dtMs = Math.min(delta, 100);
    const dtSeg = dtMs / 1000;

    this.camara.actualizar(dtMs, ALTURA_ZONA_HUD_PX);

    const objetivosCoalicion: ObjetivoAtacable[] = this.navesCoalicion.filter((n) => n.estaVivo());
    const objetivosEnjambre: ObjetivoAtacable[] = this.navesEnjambre.filter((n) => n.estaVivo());

    for (const n of this.navesCoalicion) n.actualizar(dtMs, objetivosEnjambre);
    for (const n of this.navesEnjambre) n.actualizar(dtMs, objetivosCoalicion);

    this.actualizarDefensaBase(this.baseCoalicion, objetivosEnjambre, dtMs);
    this.actualizarDefensaBase(this.baseEnjambre, objetivosCoalicion, dtMs);

    const todasLasNaves = [...this.navesCoalicion, ...this.navesEnjambre];
    actualizarMinas(this.minas, todasLasNaves, dtMs);

    this.creditos.coalicion += calcularIngresoTick('coalicion', this.minas, dtSeg);
    this.creditos.enjambre += calcularIngresoTick('enjambre', this.minas, dtSeg);

    this.actualizarProduccionBase(this.baseCoalicion, 'coalicion', dtMs);
    this.actualizarProduccionBase(this.baseEnjambre, 'enjambre', dtMs);

    this.ia.actualizar(dtMs);

    this.navesCoalicion = this.navesCoalicion.filter((n) => n.active);
    this.navesEnjambre = this.navesEnjambre.filter((n) => n.active);
    this.seleccion.limpiarMuertas();

    this.hud.actualizarEconomia(
      this.creditos.coalicion,
      calcularIngresoPorSegundo('coalicion', this.minas),
      contarMinasControladas('coalicion', this.minas),
    );
    this.hud.actualizarProduccion(this.baseCoalicion, this.creditos.coalicion);
    this.hud.actualizarMinimapa(this.minas, this.baseCoalicion, this.baseEnjambre, this.navesCoalicion, this.navesEnjambre, this.cameras.main);

    this.comprobarFinDePartida();
  }

  // --- API pública usada por el HUD y por AdaptadorJuego (IA) --------------

  obtenerCreditos(faccion: Faccion): number {
    return this.creditos[faccion];
  }

  obtenerIngresoPorSegundoActual(faccion: Faccion): number {
    return calcularIngresoPorSegundo(faccion, this.minas);
  }

  obtenerBase(faccion: Faccion): Base {
    return faccion === 'coalicion' ? this.baseCoalicion : this.baseEnjambre;
  }

  obtenerNaves(faccion: Faccion): Nave[] {
    return faccion === 'coalicion' ? this.navesCoalicion : this.navesEnjambre;
  }

  obtenerMinas(): Mina[] {
    return this.minas;
  }

  producirUnidadPara(faccion: Faccion, tipo: TipoUnidad): boolean {
    const base = this.obtenerBase(faccion);
    const costo = intentarProducir(base, tipo, this.creditos[faccion]);
    if (costo <= 0) return false;
    this.creditos[faccion] -= costo;
    return true;
  }

  subirNivelBasePara(faccion: Faccion): boolean {
    const base = this.obtenerBase(faccion);
    const costo = intentarSubirNivel(base, this.creditos[faccion]);
    if (costo <= 0) return false;
    this.creditos[faccion] -= costo;
    return true;
  }

  ordenarMoverNaves(idsUnidades: number[], x: number, y: number): void {
    const idsSet = new Set(idsUnidades);
    for (const n of [...this.navesCoalicion, ...this.navesEnjambre]) {
      if (idsSet.has(n.id) && n.estaVivo()) n.moverA(x, y);
    }
  }

  ordenarAtacarConNaves(idsUnidades: number[], idObjetivo: number, tipoObjetivo: 'unidad' | 'base' | 'mina'): void {
    const objetivo = this.resolverObjetivo(idObjetivo, tipoObjetivo);
    if (!objetivo) return;
    const idsSet = new Set(idsUnidades);
    for (const n of [...this.navesCoalicion, ...this.navesEnjambre]) {
      if (idsSet.has(n.id) && n.estaVivo()) n.ordenarAtacar(objetivo);
    }
  }

  ordenarCapturarConNaves(idsUnidades: number[], idMina: number): void {
    const mina = this.minas.find((m) => m.id === idMina);
    if (!mina) return;
    const idsSet = new Set(idsUnidades);
    for (const n of [...this.navesCoalicion, ...this.navesEnjambre]) {
      if (idsSet.has(n.id) && n.estaVivo()) n.ordenarCapturar(mina);
    }
  }

  // --- privado ---------------------------------------------------------

  private resolverObjetivo(idObjetivo: number, tipoObjetivo: 'unidad' | 'base' | 'mina'): ObjetivoAtacable | null {
    if (tipoObjetivo === 'base') {
      // Este método solo lo invoca la IA (vía AdaptadorJuego), y su único rival es el
      // jugador: no hace falta desambiguar con el id, siempre es la base de la Coalición.
      return this.baseCoalicion.estaVivo() ? this.baseCoalicion : null;
    }
    if (tipoObjetivo === 'mina') {
      return this.minas.find((m) => m.id === idObjetivo && !m.destruida) ?? null;
    }
    return [...this.navesCoalicion, ...this.navesEnjambre].find((n) => n.id === idObjetivo && n.estaVivo()) ?? null;
  }

  private intentarProducirJugador(tipo: TipoUnidad): void {
    this.producirUnidadPara(FACCION_JUGADOR, tipo);
  }

  private intentarSubirNivelJugador(): void {
    this.subirNivelBasePara(FACCION_JUGADOR);
  }

  private actualizarDefensaBase(base: Base, enemigos: ObjetivoAtacable[], dtMs: number): void {
    if (!base.estaVivo()) return;
    if (!base.intentarDispararDefensa(dtMs)) return;
    let mejor: ObjetivoAtacable | null = null;
    let mejorDist = BASE.alcanceDefensa;
    for (const e of enemigos) {
      if (!e.estaVivo()) continue;
      const d = Phaser.Math.Distance.Between(base.x, base.y, e.x, e.y);
      if (d <= mejorDist) {
        mejor = e;
        mejorDist = d;
      }
    }
    if (mejor) mejor.recibirDanio(BASE.danioDefensa, 'cazaLigero');
  }

  private actualizarProduccionBase(base: Base, faccion: Faccion, dtMs: number): void {
    const listos = base.actualizarProduccion(dtMs);
    for (const tipo of listos) this.spawnearNave(faccion, tipo);
  }

  private dibujarFondoEstrellado(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 260; i++) {
      const x = Phaser.Math.Between(0, ANCHO_MUNDO);
      const y = Phaser.Math.Between(0, ALTO_MUNDO);
      const r = Phaser.Math.FloatBetween(0.4, 1.4);
      g.fillCircle(x, y, r);
    }
    g.setDepth(-10);
  }

  private crearCazaAliado(faccion: Faccion, x: number, y: number): Nave {
    const nave = new Nave(this, x, y, 'cazaLigero', faccion);
    if (faccion === 'coalicion') this.navesCoalicion.push(nave);
    else this.navesEnjambre.push(nave);
    return nave;
  }

  private spawnearNave(faccion: Faccion, tipo: TipoUnidad): void {
    const base = this.obtenerBase(faccion);
    const angulo = Math.random() * Math.PI * 2;
    const radio = 90 + Math.random() * 30;
    const x = base.x + Math.cos(angulo) * radio;
    const y = base.y + Math.sin(angulo) * radio;
    const nave = new Nave(this, x, y, tipo, faccion, (f, nx, ny) => this.crearCazaAliado(f, nx, ny));
    if (faccion === 'coalicion') this.navesCoalicion.push(nave);
    else this.navesEnjambre.push(nave);
  }

  private comprobarFinDePartida(): void {
    if (!this.baseCoalicion.estaVivo()) {
      this.juegoTerminado = true;
      this.hud.mostrarDerrota();
    } else if (!this.baseEnjambre.estaVivo()) {
      this.juegoTerminado = true;
      this.hud.mostrarVictoria();
    }
  }
}
