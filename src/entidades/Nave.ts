// Nave jugable o enemiga: movimiento, combate automático en rango, y captura
// de minas. El casco (arte) vive en un sub-contenedor que rota para encarar
// el rumbo; la barra de vida y el anillo de selección no rotan.
import Phaser from 'phaser';
import type { DatosUnidad, Faccion, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { UNIDADES } from '../datos/balance.ts';
import { LARGO_BASE_PX, RADIO_CAPTURA_MINA_PX } from '../datos/escalas.ts';
import { dibujarNave } from '../render/dibujos/index.ts';
import { crearEstelaMotor, crearDisparo, crearExplosion, type EstelaMotor } from '../render/efectos.ts';
import { PALETA, COLOR_HP_ALTO, COLOR_HP_MEDIO, COLOR_HP_BAJO } from '../datos/colores.ts';
import { aplicarDanio, aplicarDanioEnArea, buscarObjetivoEnRango, distancia } from '../sistemas/Combate.ts';
import { CRUCERO_ESPECIAL } from '../datos/balance.ts';
import type { Mina } from './Mina.ts';

let proximoId = 1;

/** Provisto por quien crea un crucero portanaves: instancia y registra un caza aliado, y lo devuelve. */
export type CreadorCazaAliado = (faccion: Faccion, x: number, y: number) => Nave;

export class Nave extends Phaser.GameObjects.Container implements ObjetivoAtacable {
  readonly id: number;
  readonly tipo: TipoUnidad;
  readonly tipoObjetivo: TipoUnidad;
  readonly faccion: Faccion;

  vida: number;
  vidaMax: number;
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
  private largo: number;

  // Portanaves (crucero Coalición): lanza cazas livianos gratis periódicamente.
  private cronometroLanzamientoMs = 0;
  private cazasLanzados: Nave[] = [];
  private creadorCazaAliado?: CreadorCazaAliado;

  constructor(
    escena: Phaser.Scene,
    x: number,
    y: number,
    tipo: TipoUnidad,
    faccion: Faccion,
    creadorCazaAliado?: CreadorCazaAliado,
  ) {
    super(escena, x, y);
    this.id = proximoId++;
    this.tipo = tipo;
    this.tipoObjetivo = tipo;
    this.faccion = faccion;
    this.datos = UNIDADES[faccion][tipo];
    this.vidaMax = this.datos.vidaMax;
    this.vida = this.vidaMax;
    this.largo = LARGO_BASE_PX * this.datos.escalaVisual;

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

    this.estela = crearEstelaMotor(escena, this, faccion, -this.largo / 2);

    const especialCrucero = CRUCERO_ESPECIAL[faccion];
    if (tipo === 'crucero' && especialCrucero.intervaloLanzamientoMs && creadorCazaAliado) {
      this.creadorCazaAliado = creadorCazaAliado;
      this.cronometroLanzamientoMs = especialCrucero.intervaloLanzamientoMs;
    }
  }

  estaVivo(): boolean {
    return this.vida > 0 && this.active;
  }

  recibirDanio(cantidad: number, _tipoAtacante: TipoUnidad): void {
    if (!this.estaVivo()) return;
    this.vida = Math.max(0, this.vida - cantidad);
    this.actualizarBarraVida();
    if (this.vida <= 0) this.morir();
  }

  radioColision(): number {
    return this.largo * 0.5;
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
    this.cronometroDisparoMs = Math.max(0, this.cronometroDisparoMs - dtMs);

    if (this.creadorCazaAliado) {
      this.cronometroLanzamientoMs -= dtMs;
      this.cazasLanzados = this.cazasLanzados.filter((n) => n.estaVivo());
      const maximo = CRUCERO_ESPECIAL[this.faccion].maxCazasLanzados ?? 0;
      if (this.cronometroLanzamientoMs <= 0) {
        if (this.cazasLanzados.length < maximo) {
          const angulo = Math.random() * Math.PI * 2;
          const caza = this.creadorCazaAliado(
            this.faccion,
            this.x + Math.cos(angulo) * this.largo * 0.6,
            this.y + Math.sin(angulo) * this.largo * 0.6,
          );
          this.cazasLanzados.push(caza);
        }
        this.cronometroLanzamientoMs = CRUCERO_ESPECIAL[this.faccion].intervaloLanzamientoMs!;
      }
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
          this.mirarHacia(this.objetivoCaptura.x, this.objetivoCaptura.y);
        }
        if (!this.datos.sinArmas) {
          const objetivo = buscarObjetivoEnRango(this.x, this.y, this.datos.alcance, enemigos);
          if (objetivo && this.cronometroDisparoMs <= 0) {
            this.disparar(objetivo, enemigos);
            this.cronometroDisparoMs = this.datos.cadenciaFuegoMs;
          }
        }
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
          this.mirarHacia(objetivo.x, objetivo.y);
          if (this.cronometroDisparoMs <= 0) {
            this.disparar(objetivo, enemigos);
            this.cronometroDisparoMs = this.datos.cadenciaFuegoMs;
          }
          if (this.ordenExplicitaAtaque) return; // se queda plantado atacando la orden explícita
          // si fue auto-adquirido, seguimos con el destino de abajo (dispara al pasar)
        } else if (this.ordenExplicitaAtaque) {
          this.moverHacia(objetivo.x, objetivo.y, dtMs);
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
  }

  private disparar(objetivo: ObjetivoAtacable, enemigos: ObjetivoAtacable[]): void {
    crearDisparo(this.scene, this.x, this.y, objetivo.x, objetivo.y, this.faccion);
    if (this.datos.radioDanioArea) {
      aplicarDanioEnArea(this.tipo, objetivo, this.datos.danio, this.datos.radioDanioArea, enemigos);
    } else {
      aplicarDanio(this.tipo, objetivo, this.datos.danio);
    }
  }

  private mirarHacia(x: number, y: number): void {
    this.cascoContenedor.rotation = Phaser.Math.Angle.Between(this.x, this.y, x, y);
  }

  private moverHacia(x: number, y: number, dtMs: number): void {
    const angulo = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.cascoContenedor.rotation = angulo;
    const pasoMax = this.datos.velocidad * (dtMs / 1000);
    const d = distancia(this.x, this.y, x, y);
    const paso = Math.min(pasoMax, d);
    this.x += Math.cos(angulo) * paso;
    this.y += Math.sin(angulo) * paso;
  }

  private morir(): void {
    crearExplosion(this.scene, this.x, this.y, this.datos.escalaVisual);
    this.estela?.destroy();
    this.destroy();
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
  }
}
