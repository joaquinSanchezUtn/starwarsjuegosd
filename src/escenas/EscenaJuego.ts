// Escena principal de partida: mundo, cámara, bases, minas, naves,
// producción, economía (minas ricas/mejoras/chatarra), tecnología,
// habilidades de crucero, IA enemiga, selección/órdenes del jugador y HUD.
import Phaser from 'phaser';
import type { Dificultad, Faccion, ModificadoresTecnologia, NivelesTecnologia, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { Nave, type OpcionesNave } from '../entidades/Nave.ts';
import { Base } from '../entidades/Base.ts';
import { Mina } from '../entidades/Mina.ts';
import { Chatarra } from '../entidades/Chatarra.ts';
import { lanzarTorpedo, type Torpedo } from '../entidades/Torpedo.ts';
import { GestorCamara } from '../sistemas/Camara.ts';
import { GestorSeleccion, type ContextoSeleccion } from '../sistemas/Seleccion.ts';
import {
  actualizarMinas,
  calcularIngresoTick,
  calcularDesgloseIngreso,
  contarMinasControladas,
  creditosIniciales,
  actualizarChatarra,
} from '../sistemas/Economia.ts';
import { intentarProducir, intentarSubirNivel } from '../sistemas/Produccion.ts';
import {
  crearNivelesTecnologiaIniciales,
  calcularModificadores,
  intentarComprarTecnologia,
  costoProximoNivel,
} from '../sistemas/Tecnologia.ts';
import { ANCHO_MUNDO, ALTO_MUNDO, POSICION_BASE_COALICION, POSICION_BASE_ENJAMBRE, POSICIONES_MINAS } from '../datos/mapa.ts';
import { BASE } from '../datos/balance.ts';
import { COLOR_FONDO_MAPA, PALETA } from '../datos/colores.ts';
import { crearFondoParallax } from '../render/vfx/Parallax.ts';
import { HUD, ALTURA_ZONA_HUD_PX } from '../ui/HUD.ts';
import { AdaptadorJuego } from '../ia/AdaptadorJuego.ts';
import { MaquinaEstadosIA } from '../ia/MaquinaEstadosIA.ts';
import { reproducirAlertaBase, reproducirCaptura } from '../sonido/index.ts';

const FACCION_JUGADOR: Faccion = 'coalicion';
const FACCION_IA: Faccion = 'enjambre';
const RADIO_ALERTA_BASE_JUGADOR = BASE.alcanceDefensa * 1.5;
const RADIO_ALERTA_MINA_JUGADOR = 200;
const INTERVALO_MIN_ALERTA_MINA_MS = 12000;

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
  private chatarras: Chatarra[] = [];
  private torpedos: Torpedo[] = [];

  private creditos: Record<Faccion, number> = { coalicion: 0, enjambre: 0 };
  private tecnologia: Record<Faccion, NivelesTecnologia> = crearNivelesTecnologiaIniciales();
  private modTecnologia!: Record<Faccion, ModificadoresTecnologia>;

  private camara!: GestorCamara;
  private seleccion!: GestorSeleccion;
  private hud!: HUD;
  private marcadorReunion!: Phaser.GameObjects.Graphics;
  private ia!: MaquinaEstadosIA;

  private juegoTerminado = false;
  private cruceroEnemigoAnunciado = false;
  private ultimaAlertaMinaMs: Map<number, number> = new Map();

  constructor() {
    super('Juego');
  }

  init(data: DatosInicioJuego): void {
    this.dificultad = data.dificultad ?? 'normal';
    this.juegoTerminado = false;
    this.navesCoalicion = [];
    this.navesEnjambre = [];
    this.minas = [];
    this.chatarras = [];
    this.torpedos = [];
    this.tecnologia = crearNivelesTecnologiaIniciales();
    this.cruceroEnemigoAnunciado = false;
    this.ultimaAlertaMinaMs = new Map();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_FONDO_MAPA);
    crearFondoParallax(this, ANCHO_MUNDO, ALTO_MUNDO);

    this.baseCoalicion = new Base(this, POSICION_BASE_COALICION.x, POSICION_BASE_COALICION.y, 'coalicion');
    this.baseEnjambre = new Base(this, POSICION_BASE_ENJAMBRE.x, POSICION_BASE_ENJAMBRE.y, 'enjambre');

    this.minas = POSICIONES_MINAS.map((p) => {
      const mina = new Mina(this, p.x, p.y, p.rica ?? false);
      mina.on('capturada', () => this.alCapturarMina());
      return mina;
    });

    this.creditos.coalicion = creditosIniciales('jugador', this.dificultad);
    this.creditos.enjambre = creditosIniciales('ia', this.dificultad);
    this.recalcularModTecnologia();

    this.camara = new GestorCamara(this, ANCHO_MUNDO, ALTO_MUNDO);
    this.camara.centrarEn(POSICION_BASE_COALICION.x, POSICION_BASE_COALICION.y);

    const contextoSeleccion: ContextoSeleccion = {
      faccionJugador: FACCION_JUGADOR,
      obtenerNavesJugador: () => this.navesCoalicion,
      obtenerNavesEnemigas: () => this.navesEnjambre,
      obtenerMinas: () => this.minas,
      obtenerBaseEnemiga: () => this.baseEnjambre,
      obtenerBasePropia: () => this.baseCoalicion,
      alturaZonaHudPx: ALTURA_ZONA_HUD_PX,
      puntoSobreUi: (x, y) => this.hud.contieneUI(x, y),
    };
    this.seleccion = new GestorSeleccion(this, contextoSeleccion);
    this.seleccion.onCambioPuntoReunion = () => this.redibujarMarcadorReunion();

    this.marcadorReunion = this.add.graphics();
    this.marcadorReunion.setDepth(4);

    this.hud = new HUD(this, FACCION_JUGADOR);
    this.hud.onClickProducir = (tipo) => this.intentarProducirJugador(tipo);
    this.hud.onClickSubirNivel = () => this.intentarSubirNivelJugador();
    this.hud.onClickMinimapa = (x, y) => this.camara.centrarEn(x, y);
    this.hud.onVolverAlMenu = () => this.scene.start('Menu');
    this.hud.onClickHabilidad = (idNave) => this.activarHabilidadCrucero(FACCION_JUGADOR, idNave);
    this.hud.onClickMejorarMina = () => this.intentarMejorarMinaSeleccionada();
    this.hud.onClickComprarTecnologia = (rama) => this.intentarComprarTecnologiaJugador(rama);
    this.hud.onClickQuitarPuntoReunion = () => this.seleccion.quitarPuntoReunion();

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

    this.torpedos = this.torpedos.filter((t) =>
      t.actualizar(dtMs, t.faccion === 'coalicion' ? objetivosEnjambre : objetivosCoalicion),
    );

    const todasLasNaves = [...this.navesCoalicion, ...this.navesEnjambre];
    actualizarMinas(this.minas, todasLasNaves, dtMs);

    const gananciaChatarra = actualizarChatarra(this.chatarras, todasLasNaves, dtMs);
    this.creditos.coalicion += gananciaChatarra.coalicion;
    this.creditos.enjambre += gananciaChatarra.enjambre;
    this.chatarras = this.chatarras.filter((c) => c.active);

    this.creditos.coalicion += calcularIngresoTick('coalicion', this.minas, dtSeg);
    this.creditos.enjambre += calcularIngresoTick('enjambre', this.minas, dtSeg);

    this.actualizarProduccionBase(this.baseCoalicion, 'coalicion', dtMs);
    this.actualizarProduccionBase(this.baseEnjambre, 'enjambre', dtMs);

    this.ia.actualizar(dtMs);

    this.navesCoalicion = this.navesCoalicion.filter((n) => n.active);
    this.navesEnjambre = this.navesEnjambre.filter((n) => n.active);
    this.seleccion.limpiarMuertas();

    this.detectarAmenazasParaJugador();

    const desglose = calcularDesgloseIngreso('coalicion', this.minas);
    this.hud.actualizarEconomia(this.creditos.coalicion, desglose, contarMinasControladas('coalicion', this.minas));
    this.hud.actualizarProduccion(this.baseCoalicion, this.creditos.coalicion);
    this.hud.actualizarTecnologia(this.tecnologia.coalicion, this.creditos.coalicion);
    this.hud.actualizarPanelContextual(
      this.seleccion.seleccionActual,
      this.seleccion.minaSeleccionada,
      this.seleccion.baseSeleccionada,
      this.creditos.coalicion,
    );
    this.hud.actualizarGrupos(this.seleccion.resumenGrupos());
    this.hud.actualizarMinimapa(this.minas, this.baseCoalicion, this.baseEnjambre, this.navesCoalicion, this.navesEnjambre, this.chatarras, this.cameras.main);

    this.comprobarFinDePartida();
  }

  // --- API pública usada por el HUD y por AdaptadorJuego (IA) --------------

  obtenerCreditos(faccion: Faccion): number {
    return this.creditos[faccion];
  }

  obtenerIngresoPorSegundoActual(faccion: Faccion): number {
    return calcularDesgloseIngreso(faccion, this.minas).total;
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

  mejorarMinaPara(faccion: Faccion, idMina: number): boolean {
    const mina = this.minas.find((m) => m.id === idMina);
    if (!mina) return false;
    const costo = mina.intentarMejorar(faccion, this.creditos[faccion]);
    if (costo <= 0) return false;
    this.creditos[faccion] -= costo;
    return true;
  }

  obtenerNivelesTecnologiaPara(faccion: Faccion): NivelesTecnologia {
    return this.tecnologia[faccion];
  }

  costoProximoNivelTecnologiaPara(faccion: Faccion, rama: 'armamento' | 'defensa'): number {
    return costoProximoNivel(this.tecnologia[faccion], rama);
  }

  comprarTecnologiaPara(faccion: Faccion, rama: 'armamento' | 'defensa'): boolean {
    const costo = intentarComprarTecnologia(this.tecnologia[faccion], rama, this.creditos[faccion]);
    if (costo <= 0) return false;
    this.creditos[faccion] -= costo;
    this.recalcularModTecnologia();
    // El bono de daño ya se lee en vivo al disparar, pero la vida máxima se
    // fija al construir la nave: hay que reaplicarla a mano a la flota que ya
    // está en el mapa.
    if (rama === 'defensa') {
      for (const n of this.obtenerNaves(faccion)) {
        if (n.estaVivo()) n.reaplicarBonoVida();
      }
    }
    return true;
  }

  activarHabilidadCrucero(faccion: Faccion, idNave: number): boolean {
    const naves = this.obtenerNaves(faccion);
    const nave = naves.find((n) => n.id === idNave && n.estaVivo() && n.tipo === 'crucero');
    if (!nave) return false;
    const enemigos: ObjetivoAtacable[] = this.obtenerNaves(faccion === 'coalicion' ? 'enjambre' : 'coalicion').filter((n) =>
      n.estaVivo(),
    );
    return nave.activarHabilidad(enemigos, (f, x, y, vidaUtilMs) => this.crearCazaAliado(f, x, y, vidaUtilMs));
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

  private recalcularModTecnologia(): void {
    this.modTecnologia = {
      coalicion: calcularModificadores(this.tecnologia.coalicion, 'coalicion'),
      enjambre: calcularModificadores(this.tecnologia.enjambre, 'enjambre'),
    };
  }

  private construirOpcionesNave(faccion: Faccion, extra: Partial<OpcionesNave> = {}): OpcionesNave {
    return {
      obtenerModTecnologia: () => this.modTecnologia[faccion],
      onGenerarChatarra: (x, y, valor) => this.chatarras.push(new Chatarra(this, x, y, valor)),
      onLanzarTorpedo: (x, y, objetivo, danio, tipoAtacante, faccionAtacante, radioDanioArea) =>
        this.torpedos.push(lanzarTorpedo(this, x, y, objetivo, danio, tipoAtacante, faccionAtacante, radioDanioArea)),
      creadorCazaAliado: (f, x, y, vidaUtilMs) => this.crearCazaAliado(f, x, y, vidaUtilMs),
      ...extra,
    };
  }

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

  private intentarMejorarMinaSeleccionada(): void {
    const mina = this.seleccion.minaSeleccionada;
    if (!mina) return;
    this.mejorarMinaPara(FACCION_JUGADOR, mina.id);
  }

  private intentarComprarTecnologiaJugador(rama: 'armamento' | 'defensa'): void {
    this.comprarTecnologiaPara(FACCION_JUGADOR, rama);
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
    const listos = base.actualizarProduccion(dtMs, this.modTecnologia[faccion].velocidadProduccionMult);
    for (const item of listos) {
      for (let i = 0; i < item.cantidad; i++) this.spawnearNave(faccion, item.tipo, i, item.cantidad);
    }
  }

  private crearCazaAliado(faccion: Faccion, x: number, y: number, vidaUtilMs?: number): Nave {
    const nave = new Nave(this, x, y, 'cazaLigero', faccion, this.construirOpcionesNave(faccion, { vidaUtilMs }));
    if (faccion === 'coalicion') this.navesCoalicion.push(nave);
    else this.navesEnjambre.push(nave);
    return nave;
  }

  private spawnearNave(faccion: Faccion, tipo: TipoUnidad, indiceEnLote: number, totalLote: number): void {
    const base = this.obtenerBase(faccion);
    const angulo = (Math.PI * 2 * indiceEnLote) / Math.max(1, totalLote) + Math.random() * 0.4;
    const radio = 90 + Math.random() * 30;
    const x = base.x + Math.cos(angulo) * radio;
    const y = base.y + Math.sin(angulo) * radio;
    const nave = new Nave(this, x, y, tipo, faccion, this.construirOpcionesNave(faccion));
    if (base.puntoReunion) nave.moverA(base.puntoReunion.x, base.puntoReunion.y);
    if (faccion === 'coalicion') this.navesCoalicion.push(nave);
    else this.navesEnjambre.push(nave);
  }

  private redibujarMarcadorReunion(): void {
    const g = this.marcadorReunion;
    g.clear();
    const punto = this.baseCoalicion.puntoReunion;
    if (!punto) return;
    const color = PALETA[FACCION_JUGADOR].seleccion;
    g.lineStyle(2, color, 0.9);
    g.strokeCircle(punto.x, punto.y, 16);
    g.lineStyle(1, color, 0.5);
    g.strokeCircle(punto.x, punto.y, 26);
    g.lineBetween(punto.x - 9, punto.y, punto.x + 9, punto.y);
    g.lineBetween(punto.x, punto.y - 9, punto.x, punto.y + 9);
  }

  private alCapturarMina(): void {
    reproducirCaptura();
  }

  private detectarAmenazasParaJugador(): void {
    if (!this.baseCoalicion.estaVivo()) return;

    const amenazaBase = this.navesEnjambre.some(
      (n) => n.estaVivo() && Phaser.Math.Distance.Between(n.x, n.y, this.baseCoalicion.x, this.baseCoalicion.y) <= RADIO_ALERTA_BASE_JUGADOR,
    );
    if (amenazaBase) {
      reproducirAlertaBase();
      this.hud.anunciar('¡Base bajo ataque!');
    }

    for (const mina of this.minas) {
      if (mina.destruida || mina.duenio !== FACCION_JUGADOR) continue;
      const amenazada = this.navesEnjambre.some(
        (n) => n.estaVivo() && Phaser.Math.Distance.Between(n.x, n.y, mina.x, mina.y) <= RADIO_ALERTA_MINA_JUGADOR,
      );
      if (!amenazada) continue;
      const ultima = this.ultimaAlertaMinaMs.get(mina.id) ?? -Infinity;
      const ahora = this.time.now;
      if (ahora - ultima < INTERVALO_MIN_ALERTA_MINA_MS) continue;
      this.ultimaAlertaMinaMs.set(mina.id, ahora);
      this.hud.anunciar(`Mina del sector ${nombreSector(mina)} bajo ataque`);
    }

    if (!this.cruceroEnemigoAnunciado && this.navesEnjambre.some((n) => n.tipo === 'crucero' && n.estaVivo())) {
      this.cruceroEnemigoAnunciado = true;
      this.hud.anunciar('Crucero enemigo detectado');
    }
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

function nombreSector(mina: Mina): string {
  const relX = mina.x / ANCHO_MUNDO;
  const relY = mina.y / ALTO_MUNDO;
  const horiz = relX < 0.4 ? 'oeste' : relX > 0.6 ? 'este' : '';
  const vert = relY < 0.4 ? 'norte' : relY > 0.6 ? 'sur' : '';
  const partes = [vert, horiz].filter(Boolean);
  return partes.length > 0 ? partes.join('-') : 'central';
}
