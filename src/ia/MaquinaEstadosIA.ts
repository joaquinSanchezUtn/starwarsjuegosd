// Máquina de estados de la IA que controla al bando "enjambre".
//
// Esta clase habla exclusivamente con `ApiJuegoParaIA` (ver interfazJuego.ts):
// no importa Phaser ni conoce clases concretas del motor. Toda la lectura del
// estado del juego pasa por `api`, y todo el estado propio de la IA (fase
// actual, asignaciones de tareas, temporizadores) vive en propiedades de la
// instancia.
//
// Diseño general: en vez de una secuencia fija con temporizadores ciegos, la
// IA recalcula cada cierto intervalo (`INTERVALO_RECALCULO_MS`) una "fase"
// dominante (expansión / presión / ataque) a partir de condiciones del juego
// (créditos, minas propias, poder de combate libre), y desde esa fase decide
// producción, expansión, defensa y ofensiva. Las fases se solapan: expansión
// y defensa corren siempre; presión y ataque son picos de agresividad que se
// activan y desactivan según el estado del ejército disponible.
import type { Faccion, TipoUnidad } from '../nucleo/tipos.ts';
import type {
  ApiJuegoParaIA,
  InfoBaseIA,
  InfoMinaIA,
  InfoUnidadIA,
} from './interfazJuego.ts';
import { BASE, UNIDADES } from '../datos/balance.ts';

/** Fase dominante de agresividad de la IA en el ciclo de decisión actual. */
type FaseIA = 'expansion' | 'presion' | 'ataque';

/**
 * Estrategia elegida frente al crucero de la Coalición (el "Custodio"),
 * intencionalmente muy superior al crucero propio del Enjambre.
 *  - 'ninguna': no hay crucero rival en el mapa ni señales de que se esté preparando.
 *  - 'enjambrar': hay crucero rival y la IA tiene números suficientes para rodearlo.
 *  - 'evitar': hay crucero rival pero la IA todavía no tiene números; golpea por otro flanco.
 *  - 'apurar': no hay crucero rival todavía, pero el rival está acumulando créditos con
 *    base nivel 3 y pocas naves en el mapa (probable ahorro para el crucero): la IA
 *    acelera su propio ataque a la base para llegar antes de que el Custodio esté listo.
 */
type EstrategiaCrucero = 'ninguna' | 'enjambrar' | 'evitar' | 'apurar';

/** Snapshot del estado del juego recolectado una vez por ciclo de decisión. */
interface AnalisisEstado {
  basePropia: InfoBaseIA;
  baseRival: InfoBaseIA;
  unidadesPropias: InfoUnidadIA[];
  unidadesRivales: InfoUnidadIA[];
  minas: InfoMinaIA[];
  minasPropias: InfoMinaIA[];
  creditos: number;
  cruceroRival: InfoUnidadIA | undefined;
  estrategiaCrucero: EstrategiaCrucero;
}

export class MaquinaEstadosIA {
  private readonly api: ApiJuegoParaIA;
  private readonly faccionPropia: Faccion;
  private readonly faccionRival: Faccion;

  // --- Estado interno de la máquina de estados ---
  private fase: FaseIA = 'expansion';
  private tiempoDesdeUltimoRecalculo = 0;

  /**
   * Naves comprometidas en una misión ofensiva (presión u ataque a base) en
   * curso: idUnidad -> ms transcurridos desde que se le asignó la misión.
   * Se liberan al morir, o por timeout (`TIEMPO_MAX_COMPROMISO_MS`) para que
   * una misión estancada (objetivo ya destruido/recapturado, tropa varada)
   * no reste unidades disponibles para siempre.
   */
  private readonly idsEnAtaque: Map<number, number> = new Map();
  /** Naves comprometidas en defensa este ciclo (se reconstruye entero cada ciclo). */
  private readonly idsEnDefensa: Set<number> = new Set();
  /** idUnidad -> idMina que tiene asignada para capturar (evita duplicar objetivos). */
  private readonly asignacionesCaptura: Map<number, number> = new Map();

  // --- Parámetros de la propia estrategia de la IA (no son balance del juego) ---
  private readonly INTERVALO_RECALCULO_MS = 1500;
  private readonly MAX_COLA_PRODUCCION = 3;
  private readonly UMBRAL_MINAS_PRESION = 3;
  private readonly UMBRAL_PODER_ATAQUE = 800;
  private readonly FACTOR_APURO = 0.6;
  private readonly UMBRAL_ENJAMBRE_CRUCERO = 8;
  private readonly PROPORCION_AHORRO_SOSPECHOSA = 0.7;
  private readonly UMBRAL_POCAS_NAVES_RIVAL = 4;
  private readonly RADIO_ALERTA_BASE = BASE.alcanceDefensa * 1.6;
  private readonly RADIO_ALERTA_MINA = 180;
  private readonly RADIO_EVITAR_CRUCERO = 260;
  private readonly UMBRAL_MINA_CERCANA = 320;
  private readonly MARGEN_RESERVA_SUBIDA = 0.3;
  private readonly MIN_GRUPO_PRESION = 3;
  private readonly MAX_GRUPO_PRESION = 6;
  /** Tiempo máximo que una unidad queda "reservada" para una misión ofensiva antes de liberarse sola. */
  private readonly TIEMPO_MAX_COMPROMISO_MS = 25000;
  /**
   * `InfoBaseIA` no expone un `id` propio (hay una única base por bando).
   * Para `ordenarAtacar(..., tipoObjetivo: 'base')` se asume que el motor
   * resuelve el objetivo por bando rival + tipoObjetivo === 'base', y que
   * el valor numérico de `idObjetivo` no se usa en ese caso. Se documenta
   * acá porque es el único punto donde el contrato es ambiguo.
   */
  private readonly ID_OBJETIVO_BASE_PLACEHOLDER = 0;

  constructor(api: ApiJuegoParaIA, faccionPropia: Faccion, faccionRival: Faccion) {
    this.api = api;
    this.faccionPropia = faccionPropia;
    this.faccionRival = faccionRival;
  }

  /** Punto de entrada: el motor llama esto cada frame (o cada cierto intervalo). */
  actualizar(dtMs: number): void {
    this.tiempoDesdeUltimoRecalculo += dtMs;
    if (this.tiempoDesdeUltimoRecalculo < this.INTERVALO_RECALCULO_MS) {
      return;
    }
    this.tiempoDesdeUltimoRecalculo = 0;
    this.ejecutarCicloDecision();
  }

  // -------------------------------------------------------------------------
  // Ciclo de decisión principal
  // -------------------------------------------------------------------------

  private ejecutarCicloDecision(): void {
    const basePropia = this.api.obtenerBase(this.faccionPropia);
    if (!basePropia || basePropia.vida <= 0) {
      return; // Nuestra base fue destruida: no hay nada más que gestionar.
    }
    const baseRival = this.api.obtenerBase(this.faccionRival);
    const unidadesPropias = this.api.obtenerUnidades(this.faccionPropia) ?? [];
    const unidadesRivales = this.api.obtenerUnidades(this.faccionRival) ?? [];
    const minas = this.api.obtenerMinas() ?? [];
    const creditos = this.api.obtenerCreditos(this.faccionPropia);

    this.limpiarAsignaciones(unidadesPropias, minas);

    const cruceroRival = unidadesRivales.find((u) => u.tipo === 'crucero');
    const estrategiaCrucero = this.evaluarEstrategiaCrucero(
      unidadesPropias,
      unidadesRivales,
      baseRival,
      cruceroRival,
    );

    const analisis: AnalisisEstado = {
      basePropia,
      baseRival,
      unidadesPropias,
      unidadesRivales,
      minas,
      minasPropias: minas.filter((m) => m.duenio === this.faccionPropia),
      creditos,
      cruceroRival,
      estrategiaCrucero,
    };

    this.actualizarFase(analisis);
    this.decidirProduccion(analisis);
    this.decidirSubidaNivel(analisis);
    this.decidirDefensa(analisis);
    this.decidirOfensiva(analisis);
    this.decidirCaptura(analisis);
  }

  // -------------------------------------------------------------------------
  // Limpieza de asignaciones (evita que naves muertas o tareas cumplidas
  // queden "reservadas" para siempre)
  // -------------------------------------------------------------------------

  private limpiarAsignaciones(unidadesPropias: InfoUnidadIA[], minas: InfoMinaIA[]): void {
    const vivos = new Set(unidadesPropias.map((u) => u.id));

    for (const [id, msComprometido] of Array.from(this.idsEnAtaque.entries())) {
      if (!vivos.has(id)) {
        this.idsEnAtaque.delete(id);
        continue;
      }
      const nuevoTotal = msComprometido + this.INTERVALO_RECALCULO_MS;
      if (nuevoTotal >= this.TIEMPO_MAX_COMPROMISO_MS) {
        this.idsEnAtaque.delete(id); // misión estancada: se libera para reasignar
      } else {
        this.idsEnAtaque.set(id, nuevoTotal);
      }
    }

    const minasPorId = new Map(minas.map((m) => [m.id, m]));
    for (const [idUnidad, idMina] of Array.from(this.asignacionesCaptura.entries())) {
      if (!vivos.has(idUnidad)) {
        this.asignacionesCaptura.delete(idUnidad);
        continue;
      }
      const mina = minasPorId.get(idMina);
      if (!mina || mina.duenio === this.faccionPropia) {
        this.asignacionesCaptura.delete(idUnidad); // objetivo cumplido o ya no existe
      }
    }
    // idsEnDefensa se reconstruye entero cada ciclo dentro de decidirDefensa.
  }

  // -------------------------------------------------------------------------
  // Reacción al crucero rival (Custodio)
  // -------------------------------------------------------------------------

  private evaluarEstrategiaCrucero(
    unidadesPropias: InfoUnidadIA[],
    unidadesRivales: InfoUnidadIA[],
    baseRival: InfoBaseIA,
    cruceroRival: InfoUnidadIA | undefined,
  ): EstrategiaCrucero {
    if (cruceroRival) {
      // Ya hay un Custodio en el mapa: enjambrarlo si tenemos números, si no evitarlo.
      const libres = this.obtenerUnidadesCombateLibres(unidadesPropias);
      return libres.length >= this.UMBRAL_ENJAMBRE_CRUCERO ? 'enjambrar' : 'evitar';
    }

    // Sin crucero rival todavía: buscar señales de que el jugador está ahorrando para uno
    // (base nivel máximo, créditos acumulados, pocas naves gastadas en el mapa).
    const creditosRival = this.api.obtenerCreditos(this.faccionRival);
    const costoCruceroRival = UNIDADES[this.faccionRival].crucero.costo;
    const rivalAhorrando = creditosRival >= costoCruceroRival * this.PROPORCION_AHORRO_SOSPECHOSA;
    const rivalNivelMax = baseRival.nivel === 3;
    const rivalPocasNaves = unidadesRivales.length <= this.UMBRAL_POCAS_NAVES_RIVAL;

    if (rivalAhorrando && rivalNivelMax && rivalPocasNaves) {
      return 'apurar';
    }
    return 'ninguna';
  }

  // -------------------------------------------------------------------------
  // Transición de fase (expansión / presión / ataque)
  // -------------------------------------------------------------------------

  private actualizarFase(a: AnalisisEstado): void {
    const libres = this.obtenerUnidadesCombateLibres(a.unidadesPropias);
    const poderLibre = this.calcularPoder(libres);
    // En modo "apurar" bajamos el umbral de ataque: preferimos golpear antes,
    // con menos fuerza, a esperar a juntar un ejército ideal mientras el
    // jugador termina de ahorrar para su Custodio.
    const umbralAtaque =
      a.estrategiaCrucero === 'apurar'
        ? this.UMBRAL_PODER_ATAQUE * this.FACTOR_APURO
        : this.UMBRAL_PODER_ATAQUE;

    if (poderLibre >= umbralAtaque) {
      this.fase = 'ataque';
    } else if (a.minasPropias.length >= this.UMBRAL_MINAS_PRESION) {
      this.fase = 'presion';
    } else {
      this.fase = 'expansion';
    }
  }

  // -------------------------------------------------------------------------
  // Producción
  // -------------------------------------------------------------------------

  private decidirProduccion(a: AnalisisEstado): void {
    let intentos = 0;
    while (
      this.api.obtenerLargoColaProduccion(this.faccionPropia) < this.MAX_COLA_PRODUCCION &&
      intentos < this.MAX_COLA_PRODUCCION
    ) {
      intentos++;
      const tipo = this.elegirProximaUnidadAProducir(a);
      if (tipo === null) break;
      const producida = this.api.producirUnidad(this.faccionPropia, tipo);
      if (!producida) break; // sin créditos suficientes por ahora: no insistir este ciclo
    }
  }

  private elegirProximaUnidadAProducir(a: AnalisisEstado): TipoUnidad | null {
    const nivel = a.basePropia.nivel;
    const datos = UNIDADES[this.faccionPropia];
    const disponible = (tipo: TipoUnidad): boolean => datos[tipo].nivelBaseRequerido <= nivel;
    const cantidad = (tipo: TipoUnidad): number =>
      a.unidadesPropias.filter((u) => u.tipo === tipo).length;
    const minasCapturables = a.minas.filter(
      (m) => !m.destruida && m.duenio !== this.faccionPropia,
    ).length;

    switch (this.fase) {
      case 'expansion': {
        // Prioriza naves de captura (baratas, disponibles desde nivel 1) y cazas livianos.
        const capturasDeseadas = Math.min(3, minasCapturables);
        if (cantidad('captura') < capturasDeseadas) return 'captura';
        return 'cazaLigero';
      }
      case 'presion': {
        // Mantiene algo de expansión de fondo y arma grupos de hostigamiento.
        if (minasCapturables > 0 && cantidad('captura') < 2) return 'captura';
        if (disponible('cazaPesado') && cantidad('cazaPesado') * 2 < cantidad('cazaLigero')) {
          return 'cazaPesado';
        }
        return 'cazaLigero';
      }
      case 'ataque': {
        // Prioriza apoyo pesado para el asalto a la base; el crucero propio es un lujo
        // ocasional (y se salta durante un "apuro" para no perder tiempo construyéndolo).
        if (
          a.estrategiaCrucero !== 'apurar' &&
          nivel === 3 &&
          cantidad('crucero') === 0 &&
          a.creditos >= datos.crucero.costo * 1.15
        ) {
          return 'crucero';
        }
        if (disponible('bombardero') && cantidad('bombardero') < 2) return 'bombardero';
        if (disponible('fragata') && cantidad('fragata') < 2) return 'fragata';
        if (disponible('cazaPesado') && cantidad('cazaPesado') * 2 < cantidad('cazaLigero')) {
          return 'cazaPesado';
        }
        return 'cazaLigero';
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Subida de nivel de base
  // -------------------------------------------------------------------------

  private decidirSubidaNivel(a: AnalisisEstado): void {
    if (a.basePropia.subiendoNivel) return;
    const nivel = a.basePropia.nivel;
    if (nivel >= 3) return;

    const nivelSiguiente: 2 | 3 = nivel === 1 ? 2 : 3;
    const costo = BASE.costoSubirNivel[nivelSiguiente];
    // Solo sube de nivel si además de pagarlo le queda un margen para seguir produciendo.
    const margenReserva = costo * this.MARGEN_RESERVA_SUBIDA;
    if (a.creditos >= costo + margenReserva) {
      this.api.subirNivelBase(this.faccionPropia);
    }
  }

  // -------------------------------------------------------------------------
  // Defensa reactiva de base y minas propias
  // -------------------------------------------------------------------------

  private decidirDefensa(a: AnalisisEstado): void {
    this.idsEnDefensa.clear();
    if (a.unidadesRivales.length === 0) return;

    const amenazasBase = a.unidadesRivales.filter(
      (u) => this.distancia(u, a.basePropia) <= this.RADIO_ALERTA_BASE,
    );
    if (amenazasBase.length > 0) {
      const libres = this.obtenerUnidadesCombateLibres(a.unidadesPropias);
      const objetivo = this.masCercana(amenazasBase, a.basePropia);
      if (libres.length > 0 && objetivo) {
        const cantidadDefensores = Math.min(libres.length, Math.max(amenazasBase.length * 2, 3));
        const defensores = this.masCercanasA(libres, a.basePropia, cantidadDefensores);
        if (defensores.length > 0) {
          this.api.ordenarAtacar(
            defensores.map((u) => u.id),
            objetivo.id,
            'unidad',
          );
          defensores.forEach((u) => this.idsEnDefensa.add(u.id));
        }
      }
    }

    for (const mina of a.minasPropias) {
      const amenazasMina = a.unidadesRivales.filter(
        (u) => this.distancia(u, mina) <= this.RADIO_ALERTA_MINA,
      );
      if (amenazasMina.length === 0) continue;

      const libres = this.obtenerUnidadesCombateLibres(a.unidadesPropias);
      const objetivo = this.masCercana(amenazasMina, mina);
      if (libres.length === 0 || !objetivo) continue;

      const cantidadDefensores = Math.min(libres.length, Math.max(amenazasMina.length, 2));
      const defensores = this.masCercanasA(libres, mina, cantidadDefensores);
      if (defensores.length === 0) continue;

      this.api.ordenarAtacar(
        defensores.map((u) => u.id),
        objetivo.id,
        'unidad',
      );
      defensores.forEach((u) => this.idsEnDefensa.add(u.id));
    }
  }

  // -------------------------------------------------------------------------
  // Ofensiva: presión sobre minas rivales y ataque a la base rival
  // -------------------------------------------------------------------------

  private decidirOfensiva(a: AnalisisEstado): void {
    if (this.fase === 'presion') {
      this.ejecutarPresion(a);
    } else if (this.fase === 'ataque') {
      this.ejecutarAtaqueBase(a);
    }
  }

  private ejecutarPresion(a: AnalisisEstado): void {
    const libres = this.obtenerUnidadesCombateLibres(a.unidadesPropias);
    if (libres.length < this.MIN_GRUPO_PRESION) return; // todavía no hay ni un grupo mínimo

    const objetivo = this.elegirMinaRivalParaHostigar(a);
    if (!objetivo) return;

    const grupo = libres.slice(0, Math.min(libres.length, this.MAX_GRUPO_PRESION));
    if (grupo.length === 0) return;
    this.api.ordenarAtacar(
      grupo.map((u) => u.id),
      objetivo.id,
      'mina',
    );
    grupo.forEach((u) => this.idsEnAtaque.set(u.id, 0));
  }

  private ejecutarAtaqueBase(a: AnalisisEstado): void {
    const libres = this.obtenerUnidadesCombateLibres(a.unidadesPropias);
    if (libres.length === 0) return;

    const crucero = a.cruceroRival;
    if (crucero) {
      if (a.estrategiaCrucero === 'evitar') {
        // No comprometer la fuerza contra el Custodio: golpear por otro flanco.
        const alternativa = this.elegirMinaRivalLejosDe(a.minas, crucero);
        if (!alternativa) return; // sin flanco seguro todavía: esperar a juntar más fuerza
        this.api.ordenarAtacar(
          libres.map((u) => u.id),
          alternativa.id,
          'mina',
        );
        libres.forEach((u) => this.idsEnAtaque.set(u.id, 0));
        return;
      }
      if (a.estrategiaCrucero === 'enjambrar') {
        // Números suficientes: concentrar todo el ataque sobre el propio Custodio.
        this.api.ordenarAtacar(
          libres.map((u) => u.id),
          crucero.id,
          'unidad',
        );
        libres.forEach((u) => this.idsEnAtaque.set(u.id, 0));
        return;
      }
    }

    // Sin crucero rival presente (o modo "apurar"): ataque directo a la base.
    this.api.ordenarAtacar(
      libres.map((u) => u.id),
      this.ID_OBJETIVO_BASE_PLACEHOLDER,
      'base',
    );
    libres.forEach((u) => this.idsEnAtaque.set(u.id, 0));
  }

  private elegirMinaRivalParaHostigar(a: AnalisisEstado): InfoMinaIA | null {
    let candidatas = a.minas.filter((m) => m.duenio === this.faccionRival && !m.destruida);
    if (candidatas.length === 0) return null;

    const crucero = a.cruceroRival;
    if (crucero && a.estrategiaCrucero === 'evitar') {
      const lejos = candidatas.filter((m) => this.distancia(m, crucero) > this.RADIO_EVITAR_CRUCERO);
      if (lejos.length > 0) candidatas = lejos;
    }

    return this.masCercana(candidatas, a.basePropia);
  }

  private elegirMinaRivalLejosDe(
    minas: InfoMinaIA[],
    punto: { x: number; y: number },
  ): InfoMinaIA | null {
    const candidatas = minas.filter((m) => m.duenio === this.faccionRival && !m.destruida);
    if (candidatas.length === 0) return null;
    return [...candidatas].sort((x, y) => this.distancia(y, punto) - this.distancia(x, punto))[0] ?? null;
  }

  // -------------------------------------------------------------------------
  // Expansión: captura de minas neutrales y en disputa
  // -------------------------------------------------------------------------

  private decidirCaptura(a: AnalisisEstado): void {
    const centro = this.obtenerCentroMapa();
    const objetivosOrdenados = a.minas
      .filter((m) => !m.destruida && m.duenio !== this.faccionPropia)
      .map((m) => ({
        mina: m,
        // Prioriza minas cercanas a nuestra base y minas cercanas al centro del mapa.
        score: this.distancia(m, a.basePropia) * 0.6 + this.distancia(m, centro) * 0.4,
      }))
      .sort((x, y) => x.score - y.score)
      .map((x) => x.mina);

    if (objetivosOrdenados.length === 0) return;

    const minasOcupadas = new Set(this.asignacionesCaptura.values());
    const objetivosLibres = objetivosOrdenados.filter((m) => !minasOcupadas.has(m.id));
    const objetivosDisponibles = objetivosLibres.length > 0 ? objetivosLibres : objetivosOrdenados;

    const restantes = [...objetivosDisponibles];

    // Naves de captura: capturan al doble de velocidad, se usan para todo el mapa.
    const navesCaptura = a.unidadesPropias.filter(
      (u) => u.tipo === 'captura' && !this.asignacionesCaptura.has(u.id),
    );
    for (const nave of navesCaptura) {
      const objetivo = restantes.shift();
      if (!objetivo) break;
      this.api.ordenarCapturar([nave.id], objetivo.id);
      this.asignacionesCaptura.set(nave.id, objetivo.id);
    }

    // Minas cercanas que sobraron: cualquier nave de combate libre conviene mandarla,
    // pero solo si no estamos en plena fase de ataque (no distraer al ejército principal).
    if (restantes.length > 0 && this.fase !== 'ataque') {
      const cercanas = restantes.filter(
        (m) => this.distancia(m, a.basePropia) <= this.UMBRAL_MINA_CERCANA,
      );
      const libres = this.obtenerUnidadesCombateLibres(a.unidadesPropias);
      let idx = 0;
      for (const mina of cercanas) {
        if (idx >= libres.length) break;
        const nave = libres[idx];
        this.api.ordenarCapturar([nave.id], mina.id);
        this.asignacionesCaptura.set(nave.id, mina.id);
        idx++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Utilidades
  // -------------------------------------------------------------------------

  /** Naves de combate (no captura) que no están comprometidas en ninguna tarea. */
  private obtenerUnidadesCombateLibres(unidadesPropias: InfoUnidadIA[]): InfoUnidadIA[] {
    return unidadesPropias.filter(
      (u) =>
        u.tipo !== 'captura' &&
        u.vida > 0 &&
        !u.capturando &&
        !this.idsEnAtaque.has(u.id) &&
        !this.idsEnDefensa.has(u.id) &&
        !this.asignacionesCaptura.has(u.id),
    );
  }

  /** Suma del costo de las unidades como proxy simple de poder de combate acumulado. */
  private calcularPoder(unidades: InfoUnidadIA[]): number {
    return unidades.reduce((acc, u) => acc + UNIDADES[this.faccionPropia][u.tipo].costo, 0);
  }

  private distancia(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private masCercana<T extends { x: number; y: number }>(
    lista: T[],
    punto: { x: number; y: number },
  ): T | null {
    if (lista.length === 0) return null;
    return [...lista].sort((a, b) => this.distancia(a, punto) - this.distancia(b, punto))[0] ?? null;
  }

  private masCercanasA<T extends { x: number; y: number }>(
    lista: T[],
    punto: { x: number; y: number },
    cantidad: number,
  ): T[] {
    return [...lista]
      .sort((a, b) => this.distancia(a, punto) - this.distancia(b, punto))
      .slice(0, Math.max(0, cantidad));
  }

  private obtenerCentroMapa(): { x: number; y: number } {
    const limites = this.api.obtenerLimitesMundo();
    return { x: limites.ancho / 2, y: limites.alto / 2 };
  }
}
