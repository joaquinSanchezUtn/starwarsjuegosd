// Producción: encola naves en la base descontando créditos, y gestiona la
// subida de nivel. Centraliza las reglas para que HUD, jugador e IA usen
// exactamente las mismas condiciones.
import type { TipoUnidad } from '../nucleo/tipos.ts';
import type { Base } from '../entidades/Base.ts';
import { UNIDADES, BASE } from '../datos/balance.ts';

/** Intenta encolar `tipo` en `base`. Devuelve el costo descontado, o 0 si falló. */
export function intentarProducir(base: Base, tipo: TipoUnidad, creditosDisponibles: number): number {
  const datos = UNIDADES[base.faccion][tipo];
  if (!base.puedeProducir(tipo)) return 0;
  if (creditosDisponibles < datos.costo) return 0;
  base.encolar(tipo);
  return datos.costo;
}

/** Intenta iniciar la subida de nivel de `base`. Devuelve el costo descontado, o 0 si falló. */
export function intentarSubirNivel(base: Base, creditosDisponibles: number): number {
  if (base.nivel >= 3 || base.subiendoNivel) return 0;
  const siguiente = (base.nivel + 1) as 2 | 3;
  const costo = BASE.costoSubirNivel[siguiente];
  if (creditosDisponibles < costo) return 0;
  const ok = base.iniciarSubidaNivel();
  return ok ? costo : 0;
}
