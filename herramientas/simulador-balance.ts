// Simulador headless de combate para validar balance.ts sin necesidad de
// abrir el navegador. Usa las mismas fórmulas de daño/triángulo de contras
// que el motor real (ver src/sistemas/Combate.ts), y el mismo orden de
// absorción de escudo/vida que Nave.recibirDanio (escudo primero, resto a la
// vida de casco). Pensado como herramienta de desarrollo para volver a
// chequear el balance si se tocan los números:
//
//   npx tsx herramientas/simulador-balance.ts
//
// Es una aproximación (nube de unidades que se acerca en línea recta,
// disparos a objetivos aleatorios dentro de rango), no una réplica exacta
// del motor con posiciones 2D reales — alcanza para verificar que el
// triángulo de contras, la asimetría Coalición/Enjambre y el desbalance del
// crucero apuntan en la dirección correcta y con qué margen.
//
// Nota sobre escudos: no se modela la regeneración (los combates simulados
// son cortos y continuos — mismo supuesto que vale en el motor real, donde
// el escudo solo regenera tras 3s sin recibir daño, algo que no ocurre en
// medio de un enfrentamiento sostenido).
import { UNIDADES, TRIANGULO_CONTRAS } from '../src/datos/balance.ts';
import type { TipoUnidad, Faccion } from '../src/nucleo/tipos.ts';

type Bando = 'A' | 'B';

interface UnidadSim {
  bando: Bando;
  tipo: TipoUnidad;
  vida: number;
  vidaMax: number;
  escudo: number;
  escudoMax: number;
  danio: number;
  alcance: number;
  velocidad: number;
  cadenciaMs: number;
  cronometro: number;
  radioDanioArea?: number;
}

function crearGrupo(bando: Bando, faccion: Faccion, tipo: TipoUnidad, cantidad: number): UnidadSim[] {
  const d = UNIDADES[faccion][tipo];
  const arr: UnidadSim[] = [];
  for (let i = 0; i < cantidad; i++) {
    arr.push({
      bando,
      tipo,
      vida: d.vidaMax,
      vidaMax: d.vidaMax,
      escudo: d.escudoMax ?? 0,
      escudoMax: d.escudoMax ?? 0,
      danio: d.danio,
      alcance: d.alcance,
      velocidad: d.velocidad,
      cadenciaMs: d.cadenciaFuegoMs,
      cronometro: Math.random() * d.cadenciaFuegoMs,
      radioDanioArea: d.radioDanioArea,
    });
  }
  return arr;
}

function multiplicador(atacante: TipoUnidad, defensor: TipoUnidad): number {
  return TRIANGULO_CONTRAS[atacante]?.[defensor] ?? 1;
}

function simularBatalla(
  grupoA: UnidadSim[],
  grupoB: UnidadSim[],
  distanciaInicial: number,
  velocidadCierreExtra = 0,
  maxMs = 120000,
): { ganador: Bando | 'empate'; msDuracion: number; sobrevivientesA: number; sobrevivientesB: number } {
  let distancia = distanciaInicial;
  const dtMs = 100;
  let t = 0;

  const vivos = (g: UnidadSim[]) => g.filter((u) => u.vida > 0);

  while (t < maxMs) {
    const vivosA = vivos(grupoA);
    const vivosB = vivos(grupoB);
    if (vivosA.length === 0 || vivosB.length === 0) break;

    // El grupo sigue cerrando distancia mientras no esté ya pegado, sin importar
    // si alguna unidad individual ya está en rango: en el juego real las naves
    // que todavía no llegaron a su alcance siguen acercándose aunque otras del
    // mismo grupo ya estén disparando. Frenar el cierre apenas la unidad de
    // mayor alcance queda "en rango" dejaba a las unidades de alcance corto
    // varadas para siempre fuera de rango — bug del simulador, no del balance.
    const velA = Math.max(...vivosA.map((u) => u.velocidad));
    const velB = Math.max(...vivosB.map((u) => u.velocidad));
    if (distancia > 0) {
      distancia -= ((velA + velB) / 2 + velocidadCierreExtra) * (dtMs / 1000);
      distancia = Math.max(0, distancia);
    }

    for (const u of vivosA) {
      u.cronometro -= dtMs;
      if (distancia <= u.alcance && u.cronometro <= 0) {
        u.cronometro = u.cadenciaMs;
        disparar(u, vivos(grupoB));
      }
    }
    for (const u of vivosB) {
      u.cronometro -= dtMs;
      if (distancia <= u.alcance && u.cronometro <= 0) {
        u.cronometro = u.cadenciaMs;
        disparar(u, vivos(grupoA));
      }
    }

    t += dtMs;
  }

  const vivosA = vivos(grupoA).length;
  const vivosB = vivos(grupoB).length;
  let ganador: Bando | 'empate' = 'empate';
  if (vivosA > 0 && vivosB === 0) ganador = 'A';
  else if (vivosB > 0 && vivosA === 0) ganador = 'B';
  return { ganador, msDuracion: t, sobrevivientesA: vivosA, sobrevivientesB: vivosB };
}

/** Igual orden que Nave.recibirDanio: el daño se resta primero del escudo, el remanente de la vida. */
function aplicarDanioSim(objetivo: UnidadSim, danio: number): void {
  let restante = danio;
  if (objetivo.escudo > 0) {
    const absorbido = Math.min(objetivo.escudo, restante);
    objetivo.escudo -= absorbido;
    restante -= absorbido;
  }
  if (restante > 0) {
    objetivo.vida = Math.max(0, objetivo.vida - restante);
  }
}

function disparar(atacante: UnidadSim, objetivosVivos: UnidadSim[]): void {
  if (objetivosVivos.length === 0) return;
  const objetivo = objetivosVivos[Math.floor(Math.random() * objetivosVivos.length)];
  const dmg = atacante.danio * multiplicador(atacante.tipo, objetivo.tipo);
  aplicarDanioSim(objetivo, dmg);
  if (atacante.radioDanioArea) {
    for (let i = 0; i < 2; i++) {
      const otro = objetivosVivos[Math.floor(Math.random() * objetivosVivos.length)];
      if (otro !== objetivo) aplicarDanioSim(otro, dmg);
    }
  }
}

/**
 * Costo efectivo POR NAVE, no por orden: unidades con `cantidadPorOrden > 1`
 * (el Rapaz del Enjambre sale en tandas de 3) tienen `costo`/`tiempoProduccionMs`
 * expresados para la orden completa, así que hay que dividir por la cantidad
 * entregada para poder comparar contra unidades que se producen de una.
 */
function costoPorNave(faccion: Faccion, tipo: TipoUnidad): number {
  const d = UNIDADES[faccion][tipo];
  return d.costo / (d.cantidadPorOrden ?? 1);
}

function costoGrupo(faccion: Faccion, tipo: TipoUnidad, cantidad: number): number {
  return costoPorNave(faccion, tipo) * cantidad;
}

function correrN(
  nombre: string,
  fabricaA: () => UnidadSim[],
  fabricaB: () => UnidadSim[],
  distancia: number,
  n = 200,
  velocidadCierreExtra = 0,
) {
  let winsA = 0;
  let winsB = 0;
  let empates = 0;
  for (let i = 0; i < n; i++) {
    const r = simularBatalla(fabricaA(), fabricaB(), distancia, velocidadCierreExtra);
    if (r.ganador === 'A') winsA++;
    else if (r.ganador === 'B') winsB++;
    else empates++;
  }
  console.log(
    `${nombre}: A gana ${((winsA / n) * 100).toFixed(0)}%  |  B gana ${((winsB / n) * 100).toFixed(0)}%  |  empates ${empates}`,
  );
}

console.log('=== TRIÁNGULO DE CONTRAS (costo aproximadamente igual, ambos bandos Coalición) ===\n');

correrN(
  'A=cazaLigero(x8, 400cr) vs B=bombardero(x4, 400cr)',
  () => crearGrupo('A', 'coalicion', 'cazaLigero', 8),
  () => crearGrupo('B', 'coalicion', 'bombardero', 4),
  300,
);

correrN(
  'A=cazaPesado(x5, 475cr) vs B=cazaLigero(x9, 450cr)',
  () => crearGrupo('A', 'coalicion', 'cazaPesado', 5),
  () => crearGrupo('B', 'coalicion', 'cazaLigero', 9),
  300,
);

correrN(
  'A=fragata(x1, 320cr) vs B=cazaLigero(x6, 300cr)',
  () => crearGrupo('A', 'coalicion', 'fragata', 1),
  () => crearGrupo('B', 'coalicion', 'cazaLigero', 6),
  300,
);

correrN(
  'A=fragata(x1, 320cr) vs B=cazaPesado(x3, 285cr)',
  () => crearGrupo('A', 'coalicion', 'fragata', 1),
  () => crearGrupo('B', 'coalicion', 'cazaPesado', 3),
  300,
);

correrN(
  'A=bombardero(x3, 300cr) vs B=fragata(x1, 320cr) [bombardero ≻ fragata]',
  () => crearGrupo('A', 'coalicion', 'bombardero', 3),
  () => crearGrupo('B', 'coalicion', 'fragata', 1),
  300,
);

console.log('\n=== ASIMETRÍA DE BANDOS: Coalición vs Enjambre, costo por nave igual, por tier ===\n');
console.log(
  'Costo por nave — cazaLigero: Vencejo ' +
    costoPorNave('coalicion', 'cazaLigero').toFixed(0) +
    'cr, Rapaz ' +
    costoPorNave('enjambre', 'cazaLigero').toFixed(0) +
    'cr (120cr/orden ÷3)',
);
console.log(
  'Costo por nave — cazaPesado: Alabarda ' +
    costoPorNave('coalicion', 'cazaPesado').toFixed(0) +
    'cr, Alacrán ' +
    costoPorNave('enjambre', 'cazaPesado').toFixed(0) +
    'cr',
);
console.log(
  'Costo por nave — bombardero: Yunque ' +
    costoPorNave('coalicion', 'bombardero').toFixed(0) +
    'cr, Chacal ' +
    costoPorNave('enjambre', 'bombardero').toFixed(0) +
    'cr',
);
console.log(
  'Costo por nave — fragata: Bastión ' +
    costoPorNave('coalicion', 'fragata').toFixed(0) +
    'cr, Espina ' +
    costoPorNave('enjambre', 'fragata').toFixed(0) +
    'cr\n',
);

correrN(
  `A=Vencejo(x10, ${costoGrupo('coalicion', 'cazaLigero', 10)}cr) vs B=Rapaz(x15, ${costoGrupo('enjambre', 'cazaLigero', 15)}cr)`,
  () => crearGrupo('A', 'coalicion', 'cazaLigero', 10),
  () => crearGrupo('B', 'enjambre', 'cazaLigero', 15),
  300,
);

correrN(
  `A=Alabarda(x5, ${costoGrupo('coalicion', 'cazaPesado', 5)}cr) vs B=Alacrán(x6, ${costoGrupo('enjambre', 'cazaPesado', 6)}cr)`,
  () => crearGrupo('A', 'coalicion', 'cazaPesado', 5),
  () => crearGrupo('B', 'enjambre', 'cazaPesado', 6),
  300,
);

correrN(
  `A=Yunque(x8, ${costoGrupo('coalicion', 'bombardero', 8)}cr) vs B=Chacal(x10, ${costoGrupo('enjambre', 'bombardero', 10)}cr)`,
  () => crearGrupo('A', 'coalicion', 'bombardero', 8),
  () => crearGrupo('B', 'enjambre', 'bombardero', 10),
  300,
);

correrN(
  `A=Bastión(x3, ${costoGrupo('coalicion', 'fragata', 3)}cr) vs B=Espina(x4, ${costoGrupo('enjambre', 'fragata', 4)}cr)`,
  () => crearGrupo('A', 'coalicion', 'fragata', 3),
  () => crearGrupo('B', 'enjambre', 'fragata', 4),
  300,
);

console.log('\n=== ESTILETE (interceptor de élite, Coalición) vs fuerzas equivalentes del Enjambre ===\n');
const costoEstilete = UNIDADES.coalicion.interceptor.costo;
console.log(`Costo del Estilete: ${costoEstilete}cr/nave\n`);

correrN(
  `A=Estilete(x1, ${costoGrupo('coalicion', 'interceptor', 1)}cr) vs B=Rapaz(x7, ${costoGrupo('enjambre', 'cazaLigero', 7)}cr)`,
  () => crearGrupo('A', 'coalicion', 'interceptor', 1),
  () => crearGrupo('B', 'enjambre', 'cazaLigero', 7),
  300,
);

correrN(
  `A=Estilete(x1, ${costoGrupo('coalicion', 'interceptor', 1)}cr) vs B=Alacrán(x3, ${costoGrupo('enjambre', 'cazaPesado', 3)}cr)`,
  () => crearGrupo('A', 'coalicion', 'interceptor', 1),
  () => crearGrupo('B', 'enjambre', 'cazaPesado', 3),
  300,
);

correrN(
  `A=Estilete(x2, ${costoGrupo('coalicion', 'interceptor', 2)}cr) vs B=Rapaz(x13, ${costoGrupo('enjambre', 'cazaLigero', 13)}cr)`,
  () => crearGrupo('A', 'coalicion', 'interceptor', 2),
  () => crearGrupo('B', 'enjambre', 'cazaLigero', 13),
  300,
);

correrN(
  `A=Estilete(x2, ${costoGrupo('coalicion', 'interceptor', 2)}cr) vs B=Alacrán(x6, ${costoGrupo('enjambre', 'cazaPesado', 6)}cr)`,
  () => crearGrupo('A', 'coalicion', 'interceptor', 2),
  () => crearGrupo('B', 'enjambre', 'cazaPesado', 6),
  300,
);

console.log('\n=== GUADAÑA (destructor esquelético, Enjambre) vs fuerzas equivalentes de la Coalición ===\n');
const costoGuadana = UNIDADES.enjambre.destructor.costo;
console.log(`Costo de la Guadaña: ${costoGuadana}cr/nave\n`);

correrN(
  `A=Guadaña(x1, ${costoGrupo('enjambre', 'destructor', 1)}cr) vs B=Bastión(x2, ${costoGrupo('coalicion', 'fragata', 2)}cr)`,
  () => crearGrupo('A', 'enjambre', 'destructor', 1),
  () => crearGrupo('B', 'coalicion', 'fragata', 2),
  300,
);

correrN(
  `A=Guadaña(x1, ${costoGrupo('enjambre', 'destructor', 1)}cr) vs B=Vencejo(x10, ${costoGrupo('coalicion', 'cazaLigero', 10)}cr)`,
  () => crearGrupo('A', 'enjambre', 'destructor', 1),
  () => crearGrupo('B', 'coalicion', 'cazaLigero', 10),
  300,
);

correrN(
  `A=Guadaña(x1, ${costoGrupo('enjambre', 'destructor', 1)}cr) vs B=Alabarda(x6, ${costoGrupo('coalicion', 'cazaPesado', 6)}cr)`,
  () => crearGrupo('A', 'enjambre', 'destructor', 1),
  () => crearGrupo('B', 'coalicion', 'cazaPesado', 6),
  300,
);

console.log('\n=== CUSTODIO (crucero Coalición) vs FUERZAS EQUIVALENTES EN COSTO (Enjambre) ===\n');
const costoCrucero = UNIDADES.coalicion.crucero.costo;
console.log(`Costo del Custodio: ${costoCrucero}cr (ahora con escudo ${UNIDADES.coalicion.crucero.escudoMax}, modelado en esta corrida)\n`);

for (const nCazas of [10, 16, 22, 28, 34, 40, 46]) {
  correrN(
    `A=Custodio(x1) vs B=Rapaz(x${nCazas}, ${costoGrupo('enjambre', 'cazaLigero', nCazas)}cr)`,
    () => crearGrupo('A', 'coalicion', 'crucero', 1),
    () => crearGrupo('B', 'enjambre', 'cazaLigero', nCazas),
    350,
    100,
    60,
  );
}

console.log('\n=== CUSTODIO vs DEVORADOR (crucero Enjambre), 1v1 ===\n');
correrN(
  'A=Custodio(x1) vs B=Devorador(x1)',
  () => crearGrupo('A', 'coalicion', 'crucero', 1),
  () => crearGrupo('B', 'enjambre', 'crucero', 1),
  350,
  200,
);

console.log('\n=== Ratios crudos del desbalance intencional del crucero ===\n');
const cCoal = UNIDADES.coalicion.crucero;
const cEnj = UNIDADES.enjambre.crucero;
console.log(
  `Custodio: vida=${cCoal.vidaMax} escudo=${cCoal.escudoMax ?? 0} danio=${cCoal.danio} costo=${cCoal.costo} tProd=${cCoal.tiempoProduccionMs / 1000}s AoE=${cCoal.radioDanioArea}`,
);
console.log(
  `Devorador: vida=${cEnj.vidaMax} escudo=${cEnj.escudoMax ?? 0} danio=${cEnj.danio} costo=${cEnj.costo} tProd=${cEnj.tiempoProduccionMs / 1000}s AoE=${cEnj.radioDanioArea}`,
);
console.log(
  `Ratio vida (casco): ${(cCoal.vidaMax / cEnj.vidaMax).toFixed(2)}x   Ratio daño: ${(cCoal.danio / cEnj.danio).toFixed(2)}x`,
);
console.log(
  `Ratio costo: ${(cCoal.costo / cEnj.costo).toFixed(2)}x   Ratio tiempo prod: ${(cCoal.tiempoProduccionMs / cEnj.tiempoProduccionMs).toFixed(2)}x`,
);
