// Adaptador que traduce el estado real del motor (EscenaJuego) al contrato
// ApiJuegoParaIA que consume la máquina de estados de la IA. Mantiene a la
// IA totalmente desacoplada de Phaser y de las clases concretas de entidades.
import type { ApiJuegoParaIA, InfoBaseIA, InfoMinaIA, InfoUnidadIA } from './interfazJuego.ts';
import type { Faccion, TipoUnidad } from '../nucleo/tipos.ts';
import type { EscenaJuego } from '../escenas/EscenaJuego.ts';
import { ANCHO_MUNDO, ALTO_MUNDO } from '../datos/mapa.ts';

export class AdaptadorJuego implements ApiJuegoParaIA {
  private readonly escena: EscenaJuego;

  constructor(escena: EscenaJuego) {
    this.escena = escena;
  }

  obtenerCreditos(faccion: Faccion): number {
    return this.escena.obtenerCreditos(faccion);
  }

  obtenerIngresoPorSegundo(faccion: Faccion): number {
    return this.escena.obtenerIngresoPorSegundoActual(faccion);
  }

  obtenerBase(faccion: Faccion): InfoBaseIA {
    const base = this.escena.obtenerBase(faccion);
    return {
      faccion,
      x: base.x,
      y: base.y,
      vida: base.vida,
      vidaMax: base.vidaMax,
      nivel: base.nivel,
      subiendoNivel: base.subiendoNivel,
    };
  }

  obtenerUnidades(faccion: Faccion): InfoUnidadIA[] {
    return this.escena
      .obtenerNaves(faccion)
      .filter((n) => n.estaVivo())
      .map((n) => ({
        id: n.id,
        tipo: n.tipo,
        faccion: n.faccion,
        x: n.x,
        y: n.y,
        vida: n.vida,
        vidaMax: n.vidaMax,
        capturando: n.objetivoCaptura !== null,
      }));
  }

  obtenerMinas(): InfoMinaIA[] {
    return this.escena.obtenerMinas().map((m) => ({
      id: m.id,
      x: m.x,
      y: m.y,
      duenio: m.duenio,
      vida: m.vida,
      vidaMax: m.vidaMax,
      destruida: m.destruida,
    }));
  }

  producirUnidad(faccion: Faccion, tipo: TipoUnidad): boolean {
    return this.escena.producirUnidadPara(faccion, tipo);
  }

  obtenerLargoColaProduccion(faccion: Faccion): number {
    return this.escena.obtenerBase(faccion).colaProduccion.length;
  }

  subirNivelBase(faccion: Faccion): boolean {
    return this.escena.subirNivelBasePara(faccion);
  }

  ordenarMover(idsUnidades: number[], x: number, y: number): void {
    if (idsUnidades.length === 0) return;
    this.escena.ordenarMoverNaves(idsUnidades, x, y);
  }

  ordenarAtacar(idsUnidades: number[], idObjetivo: number, tipoObjetivo: 'unidad' | 'base' | 'mina'): void {
    if (idsUnidades.length === 0) return;
    this.escena.ordenarAtacarConNaves(idsUnidades, idObjetivo, tipoObjetivo);
  }

  ordenarCapturar(idsUnidades: number[], idMina: number): void {
    if (idsUnidades.length === 0) return;
    this.escena.ordenarCapturarConNaves(idsUnidades, idMina);
  }

  obtenerLimitesMundo(): { ancho: number; alto: number } {
    return { ancho: ANCHO_MUNDO, alto: ALTO_MUNDO };
  }
}
