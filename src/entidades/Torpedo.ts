// Torpedo: proyectil real (no hitscan) que dispara el bombardero. Vuela
// despacio con leve guiado hacia la posición actual del objetivo; si el
// objetivo se aleja lo bastante antes de que llegue, el torpedo agota su
// vida útil y falla — esa es la forma en la que resulta "interceptable" sin
// necesitar un sistema de defensa antimisiles dedicado.
//
// Los torpedos se reciclan en un pool por escena y por bando (el color del
// casco depende del bando, así que separarlos evita redibujar el `Graphics`
// en cada lanzamiento). Se usa el mismo patrón que el resto de los efectos
// pooleados en `render/efectos.ts`: cache en un `WeakMap` por escena, que se
// invalida sola en el `shutdown` de la escena al reiniciar la partida.
import Phaser from 'phaser';
import type { Faccion, ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { PALETA } from '../datos/colores.ts';
import { aplicarDanio, aplicarDanioEnArea } from '../sistemas/Combate.ts';
import { crearExplosion } from '../render/efectos.ts';

const VELOCIDAD_PX_SEG = 230;
const VIDA_UTIL_MAX_MS = 3200;
const RADIO_IMPACTO_PX = 16;

let proximoId = 1;

type PoolPorFaccion = Record<Faccion, Torpedo[]>;
const cachePools = new WeakMap<Phaser.Scene, PoolPorFaccion>();

function obtenerPool(escena: Phaser.Scene): PoolPorFaccion {
  let pool = cachePools.get(escena);
  if (pool) return pool;
  pool = { coalicion: [], enjambre: [] };
  cachePools.set(escena, pool);
  escena.events.once('shutdown', () => cachePools.delete(escena));
  return pool;
}

/**
 * Lanza un torpedo, reutilizando uno libre del pool si hay. Devuelve el
 * torpedo, que el llamador debe seguir actualizando hasta que `actualizar`
 * devuelva false.
 */
export function lanzarTorpedo(
  escena: Phaser.Scene,
  x: number,
  y: number,
  objetivo: ObjetivoAtacable,
  danio: number,
  tipoAtacante: TipoUnidad,
  faccion: Faccion,
  radioDanioArea?: number,
): Torpedo {
  const libres = obtenerPool(escena)[faccion];
  const reciclado = libres.pop();
  if (reciclado) {
    reciclado.reiniciar(x, y, objetivo, danio, tipoAtacante, radioDanioArea);
    return reciclado;
  }
  return new Torpedo(escena, x, y, objetivo, danio, tipoAtacante, faccion, radioDanioArea);
}

export class Torpedo extends Phaser.GameObjects.Container {
  readonly id: number;
  readonly faccion: Faccion;
  private objetivo: ObjetivoAtacable | null = null;
  private danio = 0;
  private tipoAtacante: TipoUnidad = 'bombardero';
  private radioDanioArea?: number;
  private vidaUtilRestanteMs = VIDA_UTIL_MAX_MS;

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
    this.faccion = faccion;

    const grafico = new Phaser.GameObjects.Graphics(escena);
    grafico.fillStyle(PALETA[faccion].acento, 1);
    grafico.fillTriangle(8, 0, -6, 4, -6, -4);
    grafico.fillStyle(0xffffff, 0.9);
    grafico.fillCircle(6, 0, 1.6);
    this.add(grafico);

    escena.add.existing(this);
    this.setDepth(41);
    this.reiniciar(x, y, objetivo, danio, tipoAtacante, radioDanioArea);
  }

  /** Reconfigura un torpedo (nuevo o reciclado del pool) para un lanzamiento. */
  reiniciar(
    x: number,
    y: number,
    objetivo: ObjetivoAtacable,
    danio: number,
    tipoAtacante: TipoUnidad,
    radioDanioArea?: number,
  ): void {
    this.objetivo = objetivo;
    this.danio = danio;
    this.tipoAtacante = tipoAtacante;
    this.radioDanioArea = radioDanioArea;
    this.vidaUtilRestanteMs = VIDA_UTIL_MAX_MS;
    this.setPosition(x, y);
    this.rotation = Phaser.Math.Angle.Between(x, y, objetivo.x, objetivo.y);
    this.setActive(true);
    this.setVisible(true);
  }

  /** Devuelve false cuando el torpedo debe eliminarse (impactó, falló o expiró). */
  actualizar(dtMs: number, candidatosAoE: ObjetivoAtacable[]): boolean {
    const objetivo = this.objetivo;
    this.vidaUtilRestanteMs -= dtMs;
    if (this.vidaUtilRestanteMs <= 0 || !objetivo || !objetivo.estaVivo()) {
      this.devolverAlPool();
      return false;
    }

    const anguloObjetivo = Phaser.Math.Angle.Between(this.x, this.y, objetivo.x, objetivo.y);
    // Guiado leve: no corrige instantáneamente, así un blanco rápido puede escaparle.
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, anguloObjetivo, 6 * (dtMs / 1000));
    const paso = VELOCIDAD_PX_SEG * (dtMs / 1000);
    this.x += Math.cos(this.rotation) * paso;
    this.y += Math.sin(this.rotation) * paso;

    const d = Phaser.Math.Distance.Between(this.x, this.y, objetivo.x, objetivo.y);
    if (d <= RADIO_IMPACTO_PX) {
      if (this.radioDanioArea) {
        aplicarDanioEnArea(this.tipoAtacante, objetivo, this.danio, this.radioDanioArea, candidatosAoE);
      } else {
        aplicarDanio(this.tipoAtacante, objetivo, this.danio);
      }
      crearExplosion(this.scene, this.scene.cameras.main, this.x, this.y, 'cazaLigero', this.faccion, 0.5, this.rotation);
      this.devolverAlPool();
      return false;
    }
    return true;
  }

  private devolverAlPool(): void {
    this.setActive(false);
    this.setVisible(false);
    // Soltar el objetivo es lo que evita que un torpedo dormido en el pool
    // mantenga viva la referencia a una nave ya destruida.
    this.objetivo = null;
    obtenerPool(this.scene)[this.faccion].push(this);
  }
}
