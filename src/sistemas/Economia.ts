// Economía: la única fuente de créditos es controlar minas (más un goteo
// mínimo para nunca quedar completamente trabado) y la chatarra recolectada.
// Este sistema decide qué facción está presente en cada mina (para
// captura/recaptura), acumula ingresos y resuelve la recolección de chatarra.
import type { Faccion } from '../nucleo/tipos.ts';
import type { Mina } from '../entidades/Mina.ts';
import type { Nave } from '../entidades/Nave.ts';
import type { Chatarra } from '../entidades/Chatarra.ts';
import { ECONOMIA } from '../datos/balance.ts';
import { RADIO_CAPTURA_MINA_PX } from '../datos/escalas.ts';
import { CHATARRA } from '../datos/balance.ts';
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

/** Créditos ganados este tick por `faccion`: goteo + ingreso real de minas propias (ricas/mejoradas incluidas). */
export function calcularIngresoTick(faccion: Faccion, minas: Mina[], dtSeg: number): number {
  return calcularIngresoPorSegundo(faccion, minas) * dtSeg;
}

export function calcularIngresoPorSegundo(faccion: Faccion, minas: Mina[]): number {
  const deMinas = minas
    .filter((m) => !m.destruida && m.duenio === faccion)
    .reduce((acc, m) => acc + m.ingresoPorSegundo, 0);
  return ECONOMIA.goteoPorSegundo + deMinas;
}

/** Desglose del ingreso por segundo de `faccion`, para el panel económico del HUD. */
export interface DesgloseIngreso {
  goteo: number;
  minasEstandar: number;
  minasRicas: number;
  bonoMejoras: number;
  total: number;
}

export function calcularDesgloseIngreso(faccion: Faccion, minas: Mina[]): DesgloseIngreso {
  const propias = minas.filter((m) => !m.destruida && m.duenio === faccion);
  let minasEstandar = 0;
  let minasRicas = 0;
  let bonoMejoras = 0;
  for (const m of propias) {
    const base = m.ingresoPorSegundo;
    const sinBonos = m.esRica ? base / 2 : base; // aísla el aporte del filón rico
    const sinMejora = m.nivelMejora === 1 ? sinBonos / 1.5 : sinBonos;
    if (m.esRica) minasRicas += sinMejora;
    else minasEstandar += sinMejora;
    bonoMejoras += base - sinMejora;
  }
  const goteo = ECONOMIA.goteoPorSegundo;
  return {
    goteo,
    minasEstandar,
    minasRicas,
    bonoMejoras,
    total: goteo + minasEstandar + minasRicas + bonoMejoras,
  };
}

export function contarMinasControladas(faccion: Faccion, minas: Mina[]): number {
  return minas.filter((m) => !m.destruida && m.duenio === faccion).length;
}

export function creditosIniciales(faccion: 'jugador' | 'ia', dificultad: keyof typeof ECONOMIA.multiplicadorDificultad): number {
  const base = ECONOMIA.creditosInicialesEstandar;
  if (faccion === 'ia') return base;
  return base * ECONOMIA.multiplicadorDificultad[dificultad];
}

/**
 * Recorre toda la chatarra viva contra todas las naves vivas: la nave MÁS
 * CERCANA dentro del radio la recolecta para su propia facción. Devuelve los
 * créditos ganados este tick por cada facción (para sumarlos al total).
 *
 * Ojo: no alcanza con recorrer `todasLasNaves` y quedarse con la primera
 * dentro de rango — como ese array siempre trae primero a las naves de la
 * Coalición (ver `EscenaJuego`), eso le daba la chatarra a la Coalición en
 * cualquier empate aunque una nave del Enjambre estuviera objetivamente más
 * cerca (encontrado en la ronda de QA adversarial). Hay que comparar
 * distancias explícitamente.
 */
export function actualizarChatarra(
  chatarras: Chatarra[],
  todasLasNaves: Nave[],
  dtMs: number,
): Record<Faccion, number> {
  const ganancia: Record<Faccion, number> = { coalicion: 0, enjambre: 0 };
  for (const c of chatarras) {
    if (!c.actualizar(dtMs)) continue;
    let masCercana: Nave | null = null;
    let mejorDist = CHATARRA.radioRecoleccionPx;
    for (const nave of todasLasNaves) {
      if (!nave.estaVivo()) continue;
      const d = distancia(nave.x, nave.y, c.x, c.y);
      if (d <= mejorDist) {
        masCercana = nave;
        mejorDist = d;
      }
    }
    if (masCercana) {
      ganancia[masCercana.faccion] += c.recolectar();
    }
  }
  return ganancia;
}
