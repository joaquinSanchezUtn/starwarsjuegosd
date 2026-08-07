// Economía: la única fuente de créditos es controlar minas, más un goteo
// mínimo para nunca quedar completamente trabado. Este sistema decide qué
// facción está presente en cada mina (para captura/recaptura) y acumula
// ingresos.
import type { Faccion } from '../nucleo/tipos.ts';
import type { Mina } from '../entidades/Mina.ts';
import type { Nave } from '../entidades/Nave.ts';
import { MINA, ECONOMIA } from '../datos/balance.ts';
import { RADIO_CAPTURA_MINA_PX } from '../datos/escalas.ts';
import { distancia } from './Combate.ts';

/** Avanza captura/regeneración de todas las minas según las naves presentes. */
export function actualizarMinas(minas: Mina[], todasLasNaves: Nave[], dtMs: number): void {
  for (const mina of minas) {
    if (mina.destruida) {
      mina.actualizarRegeneracion(dtMs);
      continue;
    }
    const presentes = new Map<Faccion, number>();
    for (const nave of todasLasNaves) {
      if (!nave.estaVivo()) continue;
      const d = distancia(nave.x, nave.y, mina.x, mina.y);
      if (d <= RADIO_CAPTURA_MINA_PX) {
        const actual = presentes.get(nave.faccion) ?? 0;
        presentes.set(nave.faccion, Math.max(actual, nave.datos.multiplicadorCaptura));
      }
    }
    mina.actualizarCaptura(dtMs, presentes);
  }
}

/** Créditos ganados este tick por `faccion`: goteo + minas propias controladas. */
export function calcularIngresoTick(faccion: Faccion, minas: Mina[], dtSeg: number): number {
  const minasPropias = minas.filter((m) => !m.destruida && m.duenio === faccion).length;
  const porSegundo = ECONOMIA.goteoPorSegundo + minasPropias * MINA.ingresoPorSegundo;
  return porSegundo * dtSeg;
}

export function calcularIngresoPorSegundo(faccion: Faccion, minas: Mina[]): number {
  const minasPropias = minas.filter((m) => !m.destruida && m.duenio === faccion).length;
  return ECONOMIA.goteoPorSegundo + minasPropias * MINA.ingresoPorSegundo;
}

export function contarMinasControladas(faccion: Faccion, minas: Mina[]): number {
  return minas.filter((m) => !m.destruida && m.duenio === faccion).length;
}

export function creditosIniciales(faccion: 'jugador' | 'ia', dificultad: keyof typeof ECONOMIA.multiplicadorDificultad): number {
  const base = ECONOMIA.creditosInicialesEstandar;
  if (faccion === 'ia') return base;
  return base * ECONOMIA.multiplicadorDificultad[dificultad];
}
