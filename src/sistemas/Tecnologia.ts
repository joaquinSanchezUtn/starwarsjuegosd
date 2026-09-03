// Árbol tecnológico de base: 2 ramas (armamento / defensa) × 2 niveles cada
// una, por facción, comprado con créditos. El daño se aplica en vivo (afecta
// a toda la flota ya construida); la vida y la velocidad de regeneración de
// escudo / producción se aplican a través de `ModificadoresTecnologia`, leído
// por Nave.ts y Base.ts en el momento en que corresponde.
import type { Faccion, ModificadoresTecnologia, NivelesTecnologia } from '../nucleo/tipos.ts';
import {
  COSTO_TECNOLOGIA,
  BONO_DANIO_POR_NIVEL,
  BONO_VIDA_POR_NIVEL,
  BONO_REGEN_ESCUDO_POR_NIVEL,
  BONO_VELOCIDAD_PRODUCCION_POR_NIVEL,
} from '../datos/balance.ts';

export function crearNivelesTecnologiaIniciales(): Record<Faccion, NivelesTecnologia> {
  return {
    coalicion: { armamento: 0, defensa: 0 },
    enjambre: { armamento: 0, defensa: 0 },
  };
}

/** Costo de subir una rama al siguiente nivel, o 0 si ya está al máximo (2). */
export function costoProximoNivel(niveles: NivelesTecnologia, rama: 'armamento' | 'defensa'): number {
  const actual = niveles[rama];
  if (actual >= 2) return 0;
  return COSTO_TECNOLOGIA[rama][actual as 0 | 1]; // índice 0 = costo nivel 1, índice 1 = costo nivel 2
}

/** Intenta comprar el siguiente nivel de `rama`. Devuelve el costo descontado, o 0 si falló. */
export function intentarComprarTecnologia(
  niveles: NivelesTecnologia,
  rama: 'armamento' | 'defensa',
  creditosDisponibles: number,
): number {
  const costo = costoProximoNivel(niveles, rama);
  if (costo <= 0 || creditosDisponibles < costo) return 0;
  niveles[rama] = (niveles[rama] + 1) as 0 | 1 | 2;
  return costo;
}

/** Traduce los niveles comprados a multiplicadores concretos, por facción. */
export function calcularModificadores(niveles: NivelesTecnologia, faccion: Faccion): ModificadoresTecnologia {
  const regenEscudoMult = faccion === 'coalicion' ? 1 + niveles.defensa * BONO_REGEN_ESCUDO_POR_NIVEL : 1;
  // `velocidadProduccionMult` multiplica el dtMs que se resta del tiempo
  // restante en Base.actualizarProduccion: un valor MAYOR a 1 hace que se
  // reste más por tick, es decir, que la producción termine antes (más
  // rápida). Tiene que ser 1 + bono, no 1 - bono (encontrado en la ronda de
  // QA adversarial: con el signo invertido, comprar esta rama volvía la
  // producción del Enjambre más LENTA en vez de más rápida).
  const velocidadProduccionMult =
    faccion === 'enjambre' ? 1 + niveles.defensa * BONO_VELOCIDAD_PRODUCCION_POR_NIVEL : 1;
  return {
    danioMult: 1 + niveles.armamento * BONO_DANIO_POR_NIVEL,
    vidaMult: 1 + niveles.defensa * BONO_VIDA_POR_NIVEL,
    regenEscudoMult,
    velocidadProduccionMult,
  };
}
