// Nave jugable o enemiga: movimiento, combate automático en rango, captura
// de minas, escudos regenerativos (Coalición), banking visual al girar y
// habilidad activa de crucero. El casco (arte) vive en un sub-contenedor que
// rota para encarar el rumbo con inercia angular (ver `rotarHacia`); la barra
// de vida y el anillo de selección no rotan ni se escoran.
import Phaser from 'phaser';
import type { DatosUnidad, Faccion, ModificadoresTecnologia, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { UNIDADES, CRUCERO_ESPECIAL, ESCUDOS, CHATARRA } from '../datos/balance.ts';
import { LARGO_BASE_PX, RADIO_CAPTURA_MINA_PX, offsetSombraPx, intensidadBankingPorTipo, velocidadAngularMaxPorTipo } from '../datos/escalas.ts';
import { dibujarNave } from '../render/dibujos/index.ts';
import {
  crearEstelaMotor,
  crearDisparo,
  crearExplosion,
  crearDestelloEscudo,
  crearFogonazoHiperespacio,
  type EstelaMotor,
} from '../render/efectos.ts';
import { crearSombraNave, type SombraNave } from '../render/vfx/Sombras.ts';
import { crearEfectoDanioProgresivo, type EfectoDanioProgresivo } from '../render/vfx/DanioProgresivo.ts';
import { PALETA, COLOR_HP_ALTO, COLOR_HP_MEDIO, COLOR_HP_BAJO } from '../datos/colores.ts';
import { aplicarDanio, aplicarDanioEnArea, buscarObjetivoEnRango, distancia } from '../sistemas/Combate.ts';
import type { Mina } from './Mina.ts';

let proximoId = 1;

/** Provisto por quien crea un crucero portanaves: instancia y registra un caza aliado, y lo devuelve. */
export type CreadorCazaAliado = (faccion: Faccion, x: number, y: number, vidaUtilMs?: number) => Nave;

export interface OpcionesNave {
  creadorCazaAliado?: CreadorCazaAliado;
  /** Devuelve los modificadores tecnológicos vigentes de la facción (armamento/defensa comprados en la base). */
  obtenerModTecnologia?: () => ModificadoresTecnologia;
  /** Llamado al morir una nave grande (fragata en adelante): deja chatarra recolectable en el mapa. */
  onGenerarChatarra?: (x: number, y: number, valorCreditos: number) => void;
  /**
   * El bombardero no dispara por hitscan: lanza un torpedo real (Torpedo.ts)
   * con tiempo de vuelo y leve guiado, que puede "fallar" si el objetivo se
   * aleja lo bastante antes de que llegue. Si no está provisto, dispara
   * hitscan como cualquier otra nave (fallback seguro).
   */
  onLanzarTorpedo?: (
    x: number,
    y: number,
    objetivo: ObjetivoAtacable,
    danio: number,
    tipoAtacante: TipoUnidad,
    faccion: Faccion,
    radioDanioArea?: number,
  ) => void;
  /** Dron temporal (enjambre de emergencia del Devorador): se autodestruye sin dejar chatarra ni escombros grandes. */
  vidaUtilMs?: number;
  /** false para las naves de la formación inicial; true (default) dispara el destello de llegada hiperespacial. */
  esLlegadaHiperespacial?: boolean;
}

export class Nave extends Phaser.GameObjects.Container implements ObjetivoAtacable {
  readonly id: number;
  readonly tipo: TipoUnidad;
  readonly tipoObjetivo: TipoUnidad;
  readonly faccion: Faccion;

  vida: number;
  vidaMax: number;
  escudo = 0;
  escudoMax = 0;
  seleccionada = false;
  grupoControl: number | null = null;

  destino: { x: number; y: number } | null = null;
  objetivoAtaque: ObjetivoAtacable | null = null;
  ordenExplicitaAtaque = false;
  objetivoCaptura: Mina | null = null;

  readonly datos: DatosUnidad;
  private cronometroDisparoMs = 0;
  private cascoContenedor: Phaser.GameObjects.Container;
  private barraVida: Phaser.GameObjects.Graphics;
  private anilloSeleccion: Phaser.GameObjects.Graphics;
  private estela: EstelaMotor | null = null;
  private sombra: SombraNave | null = null;
  private efectoDanio: EfectoDanioProgresivo | null = null;
  private largo: number;
  private moviendoseEsteFrame = false;

  // Banking / inercia angular (semi-3D): ver DECISIONES.md, técnica elegida.
  private anguloVisual = 0;
  private anguloVisualInicializado = false;
  private readonly velocidadAngularMax: number;
  private readonly intensidadBanking: number;

  // Escudo: retraso sin daño antes de regenerar.
  private msSinDanio = Infinity;

  // Vida útil (drones temporales de "enjambre de emergencia").
  private vidaUtilRestanteMs: number | null = null;

  // Portanaves (crucero Coalición): lanza cazas livianos gratis periódicamente, desde la franja dorsal.
  private cronometroLanzamientoMs = 0;
  private cazasLanzados: Nave[] = [];

  // Habilidad activa de crucero (andanada total / enjambre de emergencia).
  private cronometroHabilidadMs = 0;

  private readonly opciones: OpcionesNave;

  constructor(escena: Phaser.Scene, x: number, y: number, tipo: TipoUnidad, faccion: Faccion, opciones: OpcionesNave = {}) {
    super(escena, x, y);
    this.id = proximoId++;
    this.tipo = tipo;
    this.tipoObjetivo = tipo;
    this.faccion = faccion;
    this.opciones = opciones;
    this.datos = UNIDADES[faccion][tipo];

    const mods = opciones.obtenerModTecnologia?.() ?? { danioMult: 1, vidaMult: 1, regenEscudoMult: 1, velocidadProduccionMult: 1 };
    this.vidaMax = this.datos.vidaMax * mods.vidaMult;
    this.vida = this.vidaMax;
    this.escudoMax = (this.datos.escudoMax ?? 0) * mods.vidaMult;
    this.escudo = this.escudoMax;
    this.largo = LARGO_BASE_PX * this.datos.escalaVisual;

    this.velocidadAngularMax = velocidadAngularMaxPorTipo(tipo);
    this.intensidadBanking = intensidadBankingPorTipo(tipo);

    if (opciones.vidaUtilMs) this.vidaUtilRestanteMs = opciones.vidaUtilMs;

    this.cascoContenedor = new Phaser.GameObjects.Container(escena, 0, 0);
    this.add(this.cascoContenedor);
    dibujarNave(this.cascoContenedor, escena, tipo, faccion);

    this.anilloSeleccion = new Phaser.GameObjects.Graphics(escena);
    this.add(this.anilloSeleccion);
    this.barraVida = new Phaser.GameObjects.Graphics(escena);
    this.add(this.barraVida);
    this.actualizarBarraVida();

    escena.add.existing(this);
    this.setDepth(10 + this.datos.escalaVisual);

    this.sombra = crearSombraNave(escena, this, tipo, faccion, this.largo, offsetSombraPx(tipo));
    this.estela = crearEstelaMotor(escena, this, faccion, -this.largo / 2);
    this.efectoDanio = crearEfectoDanioProgresivo(escena, this, this.largo);

    if (opciones.esLlegadaHiperespacial !== false) {
      crearFogonazoHiperespacio(escena, x, y, faccion);
    }

    const especialCrucero = CRUCERO_ESPECIAL[faccion];
    if (tipo === 'crucero' && especialCrucero.intervaloLanzamientoMs && opciones.creadorCazaAliado) {
      this.cronometroLanzamientoMs = especialCrucero.intervaloLanzamientoMs;
    }
    if (tipo === 'crucero') {
      this.cronometroHabilidadMs = 0; // lista desde el arranque
    }
  }

  estaVivo(): boolean {
    return this.vida > 0 && this.active;
  }

  recibirDanio(cantidad: number, _tipoAtacante: TipoUnidad): void {
    if (!this.estaVivo()) return;
    this.msSinDanio = 0;
    let restante = cantidad;
    if (this.escudo > 0) {
      const absorbido = Math.min(this.escudo, restante);
      this.escudo -= absorbido;
      restante -= absorbido;
      if (absorbido > 0) crearDestelloEscudo(this.scene, this, this.largo * 0.6, this.faccion);
    }
    if (restante > 0) {
      this.vida = Math.max(0, this.vida - restante);
    }
    this.actualizarBarraVida();
    if (this.vida <= 0) this.morir();
  }

  radioColision(): number {
    return this.largo * 0.5;
  }

  /** Fracción de vida de casco (0-1), usada por el HUD y por los efectos de daño progresivo. */
  fraccionVida(): number {
    return this.vidaMax > 0 ? this.vida / this.vidaMax : 0;
  }

  puedeUsarHabilidad(): boolean {
    return this.tipo === 'crucero' && this.estaVivo() && this.cronometroHabilidadMs <= 0;
  }

  progresoHabilidad01(): number {
    if (this.tipo !== 'crucero') return 1;
    const total = CRUCERO_ESPECIAL[this.faccion].cooldownHabilidadMs;
    return 1 - Phaser.Math.Clamp(this.cronometroHabilidadMs / total, 0, 1);
  }

  /**
   * Activa la habilidad del crucero. `enemigos` es la lista de objetivos
   * rivales vivos (para la andanada total); `creadorCazaAliado`, el mismo
   * callback que usa el lanzamiento pasivo de cazas (para la oleada de
   * emergencia). Devuelve true si se ejecutó.
   */
  activarHabilidad(enemigos: ObjetivoAtacable[], creadorCazaAliado?: CreadorCazaAliado): boolean {
    if (!this.puedeUsarHabilidad()) return false;
    const especial = CRUCERO_ESPECIAL[this.faccion];
    this.cronometroHabilidadMs = especial.cooldownHabilidadMs;

    if (especial.tipoHabilidad === 'andanadaTotal') {
      const alcance = this.datos.alcance * 1.1;
      const anguloCono = Phaser.Math.DegToRad(especial.anguloConoAndanadaGrados ?? 100);
      const anguloNave = this.cascoContenedor.rotation;
      const mult = especial.multiplicadorAndanada ?? 3;
      for (const enemigo of enemigos) {
        if (!enemigo.estaVivo()) continue;
        const d = distancia(this.x, this.y, enemigo.x, enemigo.y);
        if (d > alcance) continue;
        const anguloHacia = Phaser.Math.Angle.Between(this.x, this.y, enemigo.x, enemigo.y);
        const diff = Math.abs(Phaser.Math.Angle.Wrap(anguloHacia - anguloNave));
        if (diff > anguloCono / 2) continue;
        crearDisparo(this.scene, this.x, this.y, enemigo.x, enemigo.y, this.faccion, this.tipo);
        aplicarDanio(this.tipo, enemigo, this.datos.danio * mult);
      }
      this.emit('habilidadAndanada');
      return true;
    }

    // enjambreEmergencia (Enjambre): oleada de cazas droide gratis, de vida útil corta.
    if (creadorCazaAliado) {
      const cantidad = especial.cantidadDronesEmergencia ?? 4;
      const vidaUtil = especial.vidaUtilDronMs ?? 15000;
      for (let i = 0; i < cantidad; i++) {
        const angulo = (Math.PI * 2 * i) / cantidad;
        creadorCazaAliado(
          this.faccion,
          this.x + Math.cos(angulo) * this.largo * 0.6,
          this.y + Math.sin(angulo) * this.largo * 0.6,
          vidaUtil,
        );
      }
    }
    this.emit('habilidadEnjambre');
    return true;
  }

  moverA(x: number, y: number): void {
    this.destino = { x, y };
    this.objetivoAtaque = null;
    this.ordenExplicitaAtaque = false;
    this.objetivoCaptura = null;
  }

  ordenarAtacar(objetivo: ObjetivoAtacable): void {
    if (this.datos.sinArmas) return;
    this.objetivoAtaque = objetivo;
    this.ordenExplicitaAtaque = true;
    this.destino = null;
    this.objetivoCaptura = null;
  }

  ordenarCapturar(mina: Mina): void {
    this.objetivoCaptura = mina;
    this.objetivoAtaque = null;
    this.ordenExplicitaAtaque = false;
    this.destino = null;
  }

  detener(): void {
    this.destino = null;
    this.objetivoAtaque = null;
    this.ordenExplicitaAtaque = false;
    this.objetivoCaptura = null;
  }

  setSeleccionada(v: boolean): void {
    this.seleccionada = v;
    this.redibujarSeleccion();
  }

  /** Se llama una vez por frame. `enemigos` son las naves vivas del bando rival (para auto-adquisición). */
  actualizar(dtMs: number, enemigos: ObjetivoAtacable[]): void {
    if (!this.estaVivo()) return;
    this.moviendoseEsteFrame = false;
    this.cronometroDisparoMs = Math.max(0, this.cronometroDisparoMs - dtMs);
    if (this.cronometroHabilidadMs > 0) this.cronometroHabilidadMs = Math.max(0, this.cronometroHabilidadMs - dtMs);

    if (this.vidaUtilRestanteMs !== null) {
      this.vidaUtilRestanteMs -= dtMs;
      if (this.vidaUtilRestanteMs <= 0) {
        this.desvanecerse();
        return;
      }
    }

    this.actualizarEscudo(dtMs);

    if (this.tipo === 'crucero' && this.opciones.creadorCazaAliado && CRUCERO_ESPECIAL[this.faccion].intervaloLanzamientoMs) {
      this.actualizarPortanaves(dtMs);
    }

    if (this.objetivoAtaque && !this.objetivoAtaque.estaVivo()) {
      this.objetivoAtaque = null;
      this.ordenExplicitaAtaque = false;
    }

    // 1) Captura de mina: máxima prioridad (pero sin dejar de defenderse si la atacan)
    if (this.objetivoCaptura) {
      if (!this.objetivoCaptura.active || this.objetivoCaptura.destruida) {
        // la mina fue destruida a tiros mientras íbamos hacia ella: la misión ya no tiene sentido
        this.objetivoCaptura = null;
      } else {
        const d = distancia(this.x, this.y, this.objetivoCaptura.x, this.objetivoCaptura.y);
        if (d > RADIO_CAPTURA_MINA_PX * 0.6) {
          this.moverHacia(this.objetivoCaptura.x, this.objetivoCaptura.y, dtMs);
        } else {
          this.mirarHacia(this.objetivoCaptura.x, this.objetivoCaptura.y, dtMs);
        }
        if (!this.datos.sinArmas) {
          const objetivo = buscarObjetivoEnRango(this.x, this.y, this.datos.alcance, enemigos);
          if (objetivo && this.cronometroDisparoMs <= 0) {
            this.disparar(objetivo, enemigos);
            this.cronometroDisparoMs = this.datos.cadenciaFuegoMs;
          }
        }
        this.actualizarPostMovimiento(dtMs);
        return;
      }
    }

    // 2) Combate: objetivo explícito o auto-adquirido en rango
    if (!this.datos.sinArmas) {
      let objetivo = this.objetivoAtaque;
      if (!objetivo) {
        objetivo = buscarObjetivoEnRango(this.x, this.y, this.datos.alcance, enemigos);
      }

      if (objetivo) {
        const d = distancia(this.x, this.y, objetivo.x, objetivo.y);
        if (d <= this.datos.alcance) {
          this.mirarHacia(objetivo.x, objetivo.y, dtMs);
          if (this.cronometroDisparoMs <= 0) {
            this.disparar(objetivo, enemigos);
            this.cronometroDisparoMs = this.datos.cadenciaFuegoMs;
          }
          if (this.ordenExplicitaAtaque) {
            this.actualizarPostMovimiento(dtMs);
            return; // se queda plantado atacando la orden explícita
          }
          // si fue auto-adquirido, seguimos con el destino de abajo (dispara al pasar)
        } else if (this.ordenExplicitaAtaque) {
          this.moverHacia(objetivo.x, objetivo.y, dtMs);
          this.actualizarPostMovimiento(dtMs);
          return;
        }
      }
    }

    // 3) Movimiento normal hacia destino
    if (this.destino) {
      const d = distancia(this.x, this.y, this.destino.x, this.destino.y);
      if (d < 4) {
        this.destino = null;
      } else {
        this.moverHacia(this.destino.x, this.destino.y, dtMs);
      }
    }

    this.actualizarPostMovimiento(dtMs);
  }

  private actualizarPostMovimiento(dtMs: number): void {
    this.sombra?.actualizar();
    this.estela?.actualizarIntensidad?.(this.moviendoseEsteFrame);
    this.efectoDanio?.actualizar(this.fraccionVida(), dtMs);
    this.actualizarPosadoAlas();
  }

  /**
   * Convención opcional de arte (como `torretas`): si el dibujo de esta nave
   * registró un sub-contenedor de alas vía `contenedor.setData('alas', ...)`,
   * se pliega (achatado en Y) cuando la nave está quieta defendiendo una
   * mina capturada, y se despliega en cuanto vuelve a moverse o a combatir.
   * No-op si la nave no tiene ese dato (la mayoría no lo necesita).
   */
  private actualizarPosadoAlas(): void {
    const alas = this.cascoContenedor.getData('alas') as Phaser.GameObjects.Container | undefined;
    if (!alas) return;
    const quieta = !this.moviendoseEsteFrame && this.objetivoCaptura !== null && this.objetivoAtaque === null;
    const objetivo = quieta ? 0.25 : 1;
    alas.scaleY = Phaser.Math.Linear(alas.scaleY, objetivo, 0.08);
  }

  private actualizarEscudo(dtMs: number): void {
    if (this.escudoMax <= 0) return;
    this.msSinDanio += dtMs;
    if (this.msSinDanio < ESCUDOS.retrasoRegenMs) return;
    if (this.escudo >= this.escudoMax) return;
    const mods = this.opciones.obtenerModTecnologia?.() ?? { danioMult: 1, vidaMult: 1, regenEscudoMult: 1, velocidadProduccionMult: 1 };
    const regen = (this.datos.escudoRegenPorSegundo ?? 0) * mods.regenEscudoMult * (dtMs / 1000);
    if (regen <= 0) return;
    this.escudo = Math.min(this.escudoMax, this.escudo + regen);
    this.actualizarBarraVida();
  }

  private actualizarPortanaves(dtMs: number): void {
    this.cronometroLanzamientoMs -= dtMs;
    this.cazasLanzados = this.cazasLanzados.filter((n) => n.estaVivo());
    const maximo = CRUCERO_ESPECIAL[this.faccion].maxCazasLanzados ?? 0;
    if (this.cronometroLanzamientoMs <= 0) {
      if (this.cazasLanzados.length < maximo) {
        // Sale visiblemente desde la franja dorsal (eje local +Y hacia "arriba" del casco,
        // rotado según el rumbo actual de la nave), no de un ángulo aleatorio.
        const anguloDorsal = this.cascoContenedor.rotation - Math.PI / 2;
        const caza = this.opciones.creadorCazaAliado!(
          this.faccion,
          this.x + Math.cos(anguloDorsal) * this.largo * 0.32,
          this.y + Math.sin(anguloDorsal) * this.largo * 0.32,
        );
        this.cazasLanzados.push(caza);
      }
      this.cronometroLanzamientoMs = CRUCERO_ESPECIAL[this.faccion].intervaloLanzamientoMs!;
    }
  }

  private disparar(objetivo: ObjetivoAtacable, enemigos: ObjetivoAtacable[]): void {
    const mods = this.opciones.obtenerModTecnologia?.() ?? { danioMult: 1, vidaMult: 1, regenEscudoMult: 1, velocidadProduccionMult: 1 };
    const danio = this.datos.danio * mods.danioMult;

    if (this.tipo === 'bombardero' && this.opciones.onLanzarTorpedo) {
      // Torpedo real, con tiempo de vuelo y leve guiado (ver Torpedo.ts):
      // el daño se aplica al llegar, no al instante del disparo.
      this.opciones.onLanzarTorpedo(this.x, this.y, objetivo, danio, this.tipo, this.faccion, this.datos.radioDanioArea);
    } else {
      crearDisparo(this.scene, this.x, this.y, objetivo.x, objetivo.y, this.faccion, this.tipo);
      if (this.datos.radioDanioArea) {
        aplicarDanioEnArea(this.tipo, objetivo, danio, this.datos.radioDanioArea, enemigos);
      } else {
        aplicarDanio(this.tipo, objetivo, danio);
      }
    }
    this.rotarTorretasHacia(objetivo.x, objetivo.y);
  }

  /**
   * Convención opcional de arte: si el dibujo de esta nave registró
   * sub-contenedores de torreta vía `contenedor.setData('torretas', [...])`,
   * se rotan hacia el objetivo actual. No-op si la nave no tiene torretas.
   */
  private rotarTorretasHacia(x: number, y: number): void {
    const torretas = this.cascoContenedor.getData('torretas') as Phaser.GameObjects.Container[] | undefined;
    if (!torretas || torretas.length === 0) return;
    const anguloMundo = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    const anguloLocal = anguloMundo - this.cascoContenedor.rotation;
    for (const t of torretas) t.rotation = anguloLocal;
  }

  private mirarHacia(x: number, y: number, dtMs: number): void {
    const angulo = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.rotarHacia(angulo, dtMs);
  }

  private moverHacia(x: number, y: number, dtMs: number): void {
    const angulo = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.rotarHacia(angulo, dtMs);
    const pasoMax = this.datos.velocidad * (dtMs / 1000);
    const d = distancia(this.x, this.y, x, y);
    const paso = Math.min(pasoMax, d);
    this.x += Math.cos(angulo) * paso;
    this.y += Math.sin(angulo) * paso;
    this.moviendoseEsteFrame = true;
  }

  /**
   * Gira el casco hacia `anguloObjetivo` con una velocidad angular máxima
   * (más lenta en naves grandes: da sensación de masa/inercia) y aplica un
   * "banking" visual — un ligero achatado + corrimiento vertical del casco,
   * proporcional a cuán rápido está girando — para simular alabeo sin
   * necesitar sprites por ángulo ni un motor 3D. Ver DECISIONES.md.
   */
  private rotarHacia(anguloObjetivo: number, dtMs: number): void {
    if (!this.anguloVisualInicializado) {
      this.anguloVisual = anguloObjetivo;
      this.anguloVisualInicializado = true;
    }
    const maxDelta = this.velocidadAngularMax * (dtMs / 1000);
    const anterior = this.anguloVisual;
    this.anguloVisual = Phaser.Math.Angle.RotateTo(this.anguloVisual, anguloObjetivo, maxDelta);
    this.cascoContenedor.rotation = this.anguloVisual;

    const deltaAngulo = Phaser.Math.Angle.Wrap(this.anguloVisual - anterior);
    const veloAngular = dtMs > 0 ? deltaAngulo / (dtMs / 1000) : 0;
    const factor = Phaser.Math.Clamp(Math.abs(veloAngular) / this.velocidadAngularMax, 0, 1);
    const escoraObjetivo = 1 - factor * this.intensidadBanking * 0.4;
    this.cascoContenedor.scaleY = Phaser.Math.Linear(this.cascoContenedor.scaleY, escoraObjetivo, 0.3);
    const signo = Math.sign(veloAngular);
    const inclinacionObjetivo = factor * this.intensidadBanking * this.largo * 0.05 * signo;
    this.cascoContenedor.y = Phaser.Math.Linear(this.cascoContenedor.y, inclinacionObjetivo, 0.3);
  }

  private desvanecerse(): void {
    // `vida = 0` hace que `estaVivo()` devuelva false desde ya (deja de ser
    // objetivo válido y su propio `actualizar()` corta en la primera línea),
    // así el fade-out de abajo se dispara una sola vez en vez de reintentarse
    // cada frame mientras dura la animación.
    this.vida = 0;
    this.sombra?.destroy();
    this.estela?.destroy();
    this.efectoDanio?.destroy();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 400,
      onComplete: () => this.destroy(),
    });
  }

  private morir(): void {
    crearExplosion(this.scene, this.scene.cameras.main, this.x, this.y, this.tipo, this.faccion, this.datos.escalaVisual, this.cascoContenedor.rotation);
    if (this.datos.escalaVisual >= CHATARRA.escalaVisualMinima) {
      const valor = this.datos.costo * CHATARRA.fraccionValorCosto;
      this.opciones.onGenerarChatarra?.(this.x, this.y, valor);
    }
    this.sombra?.destroy();
    this.estela?.destroy();
    this.efectoDanio?.destroy();
    this.destroy();
  }

  /**
   * Reaplica el multiplicador de vida de la tecnología de Casco/Escudos a una
   * nave ya construida, **manteniendo la fracción de vida y escudo actual**.
   *
   * Escalar la fracción en vez de sumar la diferencia en crudo es lo que
   * resuelve la ambigüedad que había dejado esta mejora fuera del alcance
   * retroactivo: una nave al 30% sigue al 30% de un máximo más alto, así que
   * la barra no salta ni cura de golpe a la flota herida, pero toda la flota
   * gana el aguante extra que el jugador pagó.
   */
  reaplicarBonoVida(): void {
    const mods = this.opciones.obtenerModTecnologia?.() ?? {
      danioMult: 1,
      vidaMult: 1,
      regenEscudoMult: 1,
      velocidadProduccionMult: 1,
    };
    const fracVida = this.vidaMax > 0 ? this.vida / this.vidaMax : 0;
    const fracEscudo = this.escudoMax > 0 ? this.escudo / this.escudoMax : 0;
    this.vidaMax = this.datos.vidaMax * mods.vidaMult;
    this.vida = this.vidaMax * fracVida;
    this.escudoMax = (this.datos.escudoMax ?? 0) * mods.vidaMult;
    this.escudo = this.escudoMax * fracEscudo;
    this.actualizarBarraVida();
  }

  private redibujarSeleccion(): void {
    this.anilloSeleccion.clear();
    if (!this.seleccionada) return;
    this.anilloSeleccion.lineStyle(2, PALETA[this.faccion].seleccion, 0.9);
    this.anilloSeleccion.strokeCircle(0, 0, this.largo * 0.75);
  }

  private actualizarBarraVida(): void {
    this.barraVida.clear();
    const anchoBarra = Math.max(this.largo * 0.9, 14);
    const y = -this.largo * 0.5 - 8;
    const frac = this.vida / this.vidaMax;
    const color = frac > 0.5 ? COLOR_HP_ALTO : frac > 0.25 ? COLOR_HP_MEDIO : COLOR_HP_BAJO;
    this.barraVida.fillStyle(0x000000, 0.5);
    this.barraVida.fillRect(-anchoBarra / 2, y, anchoBarra, 4);
    this.barraVida.fillStyle(color, 1);
    this.barraVida.fillRect(-anchoBarra / 2, y, anchoBarra * frac, 4);
    if (this.escudoMax > 0) {
      const fracEscudo = this.escudo / this.escudoMax;
      const yEscudo = y - 4;
      this.barraVida.fillStyle(0x000000, 0.5);
      this.barraVida.fillRect(-anchoBarra / 2, yEscudo, anchoBarra, 3);
      this.barraVida.fillStyle(0x5ad8ff, 1);
      this.barraVida.fillRect(-anchoBarra / 2, yEscudo, anchoBarra * fracEscudo, 3);
    }
  }
}
