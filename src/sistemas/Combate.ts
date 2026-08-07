// Sistema de combate: aplica el triángulo de contras y el daño en área, y
// ofrece la búsqueda de blancos en rango que usan naves y bases.
import type { ObjetivoAtacable, TipoUnidad } from '../nucleo/tipos.ts';
import { TRIANGULO_CONTRAS } from '../datos/balance.ts';

/** Aplica daño de `tipoAtacante` sobre `objetivo`, ya multiplicado por el triángulo de contras. */
export function aplicarDanio(tipoAtacante: TipoUnidad, objetivo: ObjetivoAtacable, danioBase: number): void {
  const multiplicador = TRIANGULO_CONTRAS[tipoAtacante]?.[objetivo.tipoObjetivo] ?? 1;
  objetivo.recibirDanio(danioBase * multiplicador, tipoAtacante);
}

/**
 * Aplica daño en área: golpea a `objetivoPrincipal` y además a todo objetivo
 * de `candidatos` (normalmente naves enemigas) dentro de `radio` del punto de
 * impacto, salvo el propio objetivo principal (que ya recibió el golpe).
 */
export function aplicarDanioEnArea(
  tipoAtacante: TipoUnidad,
  objetivoPrincipal: ObjetivoAtacable,
  danioBase: number,
  radio: number,
  candidatos: ObjetivoAtacable[],
): void {
  aplicarDanio(tipoAtacante, objetivoPrincipal, danioBase);
  const x = objetivoPrincipal.x;
  const y = objetivoPrincipal.y;
  for (const candidato of candidatos) {
    if (candidato === objetivoPrincipal || !candidato.estaVivo()) continue;
    const dx = candidato.x - x;
    const dy = candidato.y - y;
    if (dx * dx + dy * dy <= radio * radio) {
      aplicarDanio(tipoAtacante, candidato, danioBase);
    }
  }
}

/** Devuelve el objetivo vivo más cercano a (x,y) dentro de `alcance`, o null. */
export function buscarObjetivoEnRango(
  x: number,
  y: number,
  alcance: number,
  candidatos: ObjetivoAtacable[],
): ObjetivoAtacable | null {
  let mejor: ObjetivoAtacable | null = null;
  let mejorDistSq = alcance * alcance;
  for (const c of candidatos) {
    if (!c.estaVivo()) continue;
    const dx = c.x - x;
    const dy = c.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= mejorDistSq) {
      mejor = c;
      mejorDistSq = distSq;
    }
  }
  return mejor;
}

export function distancia(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
