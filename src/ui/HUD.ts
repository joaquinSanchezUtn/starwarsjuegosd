// HUD de la partida: economía desglosada, cola de producción, subida de
// nivel, mejora de minas, árbol tecnológico, habilidad de crucero, mute,
// barra de anuncios holograma, minimapa clickeable y pantallas de fin.
import Phaser from 'phaser';
import type { Faccion, NivelesTecnologia, TipoHabilidadCrucero, TipoUnidad } from '../nucleo/tipos.ts';
import type { Base } from '../entidades/Base.ts';
import type { Mina } from '../entidades/Mina.ts';
import type { Nave } from '../entidades/Nave.ts';
import type { Chatarra } from '../entidades/Chatarra.ts';
import type { DesgloseIngreso } from '../sistemas/Economia.ts';
import type { ResumenGrupo } from '../sistemas/Seleccion.ts';
import { UNIDADES, BASE, MEJORA_MINA, CRUCERO_ESPECIAL, tiposDisponiblesParaFaccion } from '../datos/balance.ts';
import { costoProximoNivel } from '../sistemas/Tecnologia.ts';
import { PALETA, COLOR_MINA_NEUTRAL } from '../datos/colores.ts';
import { ANCHO_MUNDO, ALTO_MUNDO } from '../datos/mapa.ts';
import { setSilenciado, estaSilenciado, reproducirVictoria, reproducirDerrota } from '../sonido/index.ts';

export const ALTURA_ZONA_HUD_PX = 128;

const NOMBRE_HABILIDAD: Record<TipoHabilidadCrucero, string> = {
  andanadaTotal: 'Andanada total',
  enjambreEmergencia: 'Enjambre de emergencia',
};

const NOMBRE_RAMA: Record<'armamento' | 'defensa', string> = {
  armamento: 'Armamento',
  defensa: 'Casco/Escudos',
};

const ANCHO_MINIMAPA = 230;
const ALTO_MINIMAPA = 158;

export class HUD {
  onClickProducir?: (tipo: TipoUnidad) => void;
  onClickSubirNivel?: () => void;
  onClickMinimapa?: (xMundo: number, yMundo: number) => void;
  onVolverAlMenu?: () => void;
  onClickHabilidad?: (idNave: number) => void;
  onClickMejorarMina?: () => void;
  onClickComprarTecnologia?: (rama: 'armamento' | 'defensa') => void;
  onClickQuitarPuntoReunion?: () => void;

  private escena: Phaser.Scene;
  private faccionJugador: Faccion;
  private tiposProducibles: TipoUnidad[];

  private textoEconomia: Phaser.GameObjects.Text;
  private textoNivel: Phaser.GameObjects.Text;
  private barraProduccionActual: Phaser.GameObjects.Graphics;
  private botonesProduccion: { tipo: TipoUnidad; rect: Phaser.GameObjects.Rectangle; texto: Phaser.GameObjects.Text }[] = [];
  private botonNivel: Phaser.GameObjects.Rectangle;
  private textoBotonNivel: Phaser.GameObjects.Text;

  // Panel contextual (mejora de mina / habilidad de crucero) — mutuamente excluyentes.
  private botonMejoraMina: Phaser.GameObjects.Rectangle;
  private textoBotonMejoraMina: Phaser.GameObjects.Text;
  private botonHabilidad: Phaser.GameObjects.Rectangle;
  private textoBotonHabilidad: Phaser.GameObjects.Graphics;
  private textoNombreHabilidad: Phaser.GameObjects.Text;
  private botonReunion: Phaser.GameObjects.Rectangle;
  private textoBotonReunion: Phaser.GameObjects.Text;
  private idCruceroSeleccionado: number | null = null;

  // Indicador de grupos de control (fila de chips sobre la franja del HUD).
  private gruposGraficos: Phaser.GameObjects.Graphics;
  private gruposTextos: Phaser.GameObjects.Text[] = [];

  // Tecnología.
  private botonesTecnologia: Record<'armamento' | 'defensa', { rect: Phaser.GameObjects.Rectangle; texto: Phaser.GameObjects.Text }>;

  // Mute.
  private botonMute: Phaser.GameObjects.Rectangle;
  private textoBotonMute: Phaser.GameObjects.Text;

  // Anuncios estilo holograma.
  private colaAnuncios: string[] = [];
  private anuncioActivo: Phaser.GameObjects.Container | null = null;

  private minimapaFondo: Phaser.GameObjects.Rectangle;
  private minimapaGraficos: Phaser.GameObjects.Graphics;
  private minimapaOrigenX: number;
  private minimapaOrigenY: number;
  private arrastrandoMinimapa = false;
  private overlayFin: Phaser.GameObjects.Container | null = null;

  constructor(escena: Phaser.Scene, faccionJugador: Faccion) {
    this.escena = escena;
    this.faccionJugador = faccionJugador;
    this.tiposProducibles = tiposDisponiblesParaFaccion(faccionJugador);
    const w = escena.scale.width;
    const h = escena.scale.height;

    // Franja inferior de fondo
    const fondoHud = escena.add.rectangle(0, h - ALTURA_ZONA_HUD_PX, w, ALTURA_ZONA_HUD_PX, 0x05070d, 0.88);
    fondoHud.setOrigin(0, 0);
    fondoHud.setScrollFactor(0);
    fondoHud.setDepth(900);

    // Economía (arriba a la izquierda)
    this.textoEconomia = escena.add.text(14, 10, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#e8ecf0',
      lineSpacing: 4,
    });
    this.textoEconomia.setScrollFactor(0);
    this.textoEconomia.setDepth(910);

    this.textoNivel = escena.add.text(14, h - ALTURA_ZONA_HUD_PX + 10, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#e8ecf0',
    });
    this.textoNivel.setScrollFactor(0);
    this.textoNivel.setDepth(910);

    // Botón subir de nivel
    this.botonNivel = escena.add.rectangle(14, h - 40, 170, 30, PALETA[faccionJugador].detalle, 0.9);
    this.botonNivel.setOrigin(0, 0.5);
    this.botonNivel.setScrollFactor(0);
    this.botonNivel.setDepth(910);
    this.botonNivel.setInteractive({ useHandCursor: true });
    this.botonNivel.on('pointerdown', () => this.onClickSubirNivel?.());
    this.textoBotonNivel = escena.add.text(20, h - 40, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    });
    this.textoBotonNivel.setOrigin(0, 0.5);
    this.textoBotonNivel.setScrollFactor(0);
    this.textoBotonNivel.setDepth(911);

    // Panel contextual: mejora de mina.
    this.botonMejoraMina = escena.add.rectangle(200, h - 40, 190, 30, 0xffd76a, 0.85);
    this.botonMejoraMina.setOrigin(0, 0.5);
    this.botonMejoraMina.setScrollFactor(0);
    this.botonMejoraMina.setDepth(910);
    this.botonMejoraMina.setInteractive({ useHandCursor: true });
    this.botonMejoraMina.on('pointerdown', () => this.onClickMejorarMina?.());
    this.botonMejoraMina.setVisible(false);
    this.textoBotonMejoraMina = escena.add.text(206, h - 40, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#1b1400',
    });
    this.textoBotonMejoraMina.setOrigin(0, 0.5);
    this.textoBotonMejoraMina.setScrollFactor(0);
    this.textoBotonMejoraMina.setDepth(911);
    this.textoBotonMejoraMina.setVisible(false);

    // Panel contextual: habilidad de crucero (con anillo de cooldown).
    this.botonHabilidad = escena.add.rectangle(200, h - 40, 190, 30, PALETA[faccionJugador].acento, 0.85);
    this.botonHabilidad.setOrigin(0, 0.5);
    this.botonHabilidad.setScrollFactor(0);
    this.botonHabilidad.setDepth(910);
    this.botonHabilidad.setInteractive({ useHandCursor: true });
    this.botonHabilidad.on('pointerdown', () => {
      if (this.idCruceroSeleccionado !== null) this.onClickHabilidad?.(this.idCruceroSeleccionado);
    });
    this.botonHabilidad.setVisible(false);
    this.textoNombreHabilidad = escena.add.text(206, h - 40, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
    });
    this.textoNombreHabilidad.setOrigin(0, 0.5);
    this.textoNombreHabilidad.setScrollFactor(0);
    this.textoNombreHabilidad.setDepth(911);
    this.textoNombreHabilidad.setVisible(false);
    this.textoBotonHabilidad = escena.add.graphics();
    this.textoBotonHabilidad.setScrollFactor(0);
    this.textoBotonHabilidad.setDepth(910);

    // Panel contextual: punto de reunión (con la base propia seleccionada).
    this.botonReunion = escena.add.rectangle(200, h - 40, 250, 30, 0x5ad8ff, 0.85);
    this.botonReunion.setOrigin(0, 0.5);
    this.botonReunion.setScrollFactor(0);
    this.botonReunion.setDepth(910);
    this.botonReunion.setInteractive({ useHandCursor: true });
    this.botonReunion.on('pointerdown', () => this.onClickQuitarPuntoReunion?.());
    this.botonReunion.setVisible(false);
    this.textoBotonReunion = escena.add.text(206, h - 40, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#04212e',
    });
    this.textoBotonReunion.setOrigin(0, 0.5);
    this.textoBotonReunion.setScrollFactor(0);
    this.textoBotonReunion.setDepth(911);
    this.textoBotonReunion.setVisible(false);

    // Chips de grupos de control, en una fila justo encima de la franja del HUD.
    this.gruposGraficos = escena.add.graphics();
    this.gruposGraficos.setScrollFactor(0);
    this.gruposGraficos.setDepth(910);
    for (let i = 0; i < 9; i++) {
      const t = escena.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e8ecf0' });
      t.setOrigin(0.5, 0.5);
      t.setScrollFactor(0);
      t.setDepth(911);
      t.setVisible(false);
      this.gruposTextos.push(t);
    }

    // Panel de producción (centro)
    const anchoBoton = 76;
    const separacion = 8;
    const totalAncho = this.tiposProducibles.length * anchoBoton + (this.tiposProducibles.length - 1) * separacion;
    const inicioX = w / 2 - totalAncho / 2;
    const y = h - ALTURA_ZONA_HUD_PX + 20;

    this.barraProduccionActual = escena.add.graphics();
    this.barraProduccionActual.setScrollFactor(0);
    this.barraProduccionActual.setDepth(910);

    this.tiposProducibles.forEach((tipo, i) => {
      const x = inicioX + i * (anchoBoton + separacion);
      const rect = escena.add.rectangle(x, y, anchoBoton, 64, 0x1c2230, 0.95);
      rect.setOrigin(0, 0);
      rect.setScrollFactor(0);
      rect.setDepth(910);
      rect.setStrokeStyle(1, PALETA[faccionJugador].acento, 0.6);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onClickProducir?.(tipo));

      const datos = UNIDADES[faccionJugador][tipo];
      const nombre = datos.nombre[faccionJugador];
      const lote = datos.cantidadPorOrden && datos.cantidadPorOrden > 1 ? ` ×${datos.cantidadPorOrden}` : '';
      const texto = escena.add.text(x + anchoBoton / 2, y + 32, `${nombre}${lote}\n${datos.costo}cr`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#e8ecf0',
        align: 'center',
      });
      texto.setOrigin(0.5, 0.5);
      texto.setScrollFactor(0);
      texto.setDepth(911);

      this.botonesProduccion.push({ tipo, rect, texto });
    });

    // Tecnología (arriba a la derecha, debajo del mute).
    const construirBotonTecnologia = (rama: 'armamento' | 'defensa', yy: number) => {
      const rect = escena.add.rectangle(w - 210, yy, 196, 26, 0x1c2230, 0.95);
      rect.setOrigin(0, 0);
      rect.setScrollFactor(0);
      rect.setDepth(910);
      rect.setStrokeStyle(1, PALETA[faccionJugador].acento, 0.6);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onClickComprarTecnologia?.(rama));
      const texto = escena.add.text(w - 202, yy + 13, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e8ecf0' });
      texto.setOrigin(0, 0.5);
      texto.setScrollFactor(0);
      texto.setDepth(911);
      return { rect, texto };
    };
    this.botonesTecnologia = {
      armamento: construirBotonTecnologia('armamento', 44),
      defensa: construirBotonTecnologia('defensa', 74),
    };

    // Mute.
    this.botonMute = escena.add.rectangle(w - 210, 12, 196, 24, 0x1c2230, 0.95);
    this.botonMute.setOrigin(0, 0);
    this.botonMute.setScrollFactor(0);
    this.botonMute.setDepth(910);
    this.botonMute.setStrokeStyle(1, 0x555b66, 0.9);
    this.botonMute.setInteractive({ useHandCursor: true });
    this.botonMute.on('pointerdown', () => {
      setSilenciado(!estaSilenciado());
      this.actualizarBotonMute();
    });
    this.textoBotonMute = escena.add.text(w - 202, 24, '', { fontFamily: 'monospace', fontSize: '11px', color: '#e8ecf0' });
    this.textoBotonMute.setOrigin(0, 0.5);
    this.textoBotonMute.setScrollFactor(0);
    this.textoBotonMute.setDepth(911);
    this.actualizarBotonMute();

    // Minimapa (abajo a la derecha)
    this.minimapaOrigenX = w - ANCHO_MINIMAPA - 14;
    this.minimapaOrigenY = h - ALTO_MINIMAPA - 10;
    this.minimapaFondo = escena.add.rectangle(this.minimapaOrigenX, this.minimapaOrigenY, ANCHO_MINIMAPA, ALTO_MINIMAPA, 0x0a0d16, 0.95);
    this.minimapaFondo.setOrigin(0, 0);
    this.minimapaFondo.setScrollFactor(0);
    this.minimapaFondo.setDepth(910);
    this.minimapaFondo.setStrokeStyle(1, 0x3a3d44, 1);
    this.minimapaFondo.setInteractive({ useHandCursor: true });
    this.minimapaFondo.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.arrastrandoMinimapa = true;
      this.recentrarDesdeMinimapa(p.x, p.y);
    });
    // El paneo continuo se escucha a nivel de escena, no del rectángulo del
    // minimapa: así el arrastre sigue funcionando aunque el puntero se salga
    // de sus bordes, en vez de cortarse de golpe.
    escena.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.arrastrandoMinimapa) return;
      if (!p.isDown) {
        this.arrastrandoMinimapa = false;
        return;
      }
      this.recentrarDesdeMinimapa(p.x, p.y);
    });
    escena.input.on('pointerup', () => {
      this.arrastrandoMinimapa = false;
    });

    this.minimapaGraficos = escena.add.graphics();
    this.minimapaGraficos.setScrollFactor(0);
    this.minimapaGraficos.setDepth(911);
  }

  private recentrarDesdeMinimapa(xPantalla: number, yPantalla: number): void {
    const relX = Phaser.Math.Clamp((xPantalla - this.minimapaOrigenX) / ANCHO_MINIMAPA, 0, 1);
    const relY = Phaser.Math.Clamp((yPantalla - this.minimapaOrigenY) / ALTO_MINIMAPA, 0, 1);
    this.onClickMinimapa?.(relX * ANCHO_MUNDO, relY * ALTO_MUNDO);
  }

  /**
   * True si el punto cae sobre algún widget del HUD. Lo usa la selección para
   * no abrir un rectángulo de arrastre por debajo del minimapa o de los
   * botones de tecnología/mute, que sobresalen de la franja inferior.
   */
  contieneUI(xPantalla: number, yPantalla: number): boolean {
    if (yPantalla > this.escena.scale.height - ALTURA_ZONA_HUD_PX) return true;
    const rects = [this.minimapaFondo, this.botonMute, this.botonesTecnologia.armamento.rect, this.botonesTecnologia.defensa.rect];
    return rects.some((r) => r.getBounds().contains(xPantalla, yPantalla));
  }

  actualizarEconomia(creditos: number, desglose: DesgloseIngreso, minasControladas: number): void {
    const linea2 = `  minas ${desglose.minasEstandar.toFixed(1)}/s · ricas ${desglose.minasRicas.toFixed(1)}/s · mejoras +${desglose.bonoMejoras.toFixed(1)}/s`;
    this.textoEconomia.setText(
      `Créditos: ${Math.floor(creditos)}   Ingreso: ${desglose.total.toFixed(1)}/s   Minas: ${minasControladas}\n${linea2}`,
    );
  }

  actualizarProduccion(base: Base, creditos: number): void {
    this.textoNivel.setText(`Nivel de base: ${base.nivel}${base.subiendoNivel ? ' (subiendo...)' : ''}`);

    if (base.nivel < 3) {
      const siguiente = (base.nivel + 1) as 2 | 3;
      const costo = BASE.costoSubirNivel[siguiente];
      this.textoBotonNivel.setText(base.subiendoNivel ? 'Subiendo nivel...' : `Subir a nivel ${siguiente} (${costo}cr)`);
      const puede = !base.subiendoNivel && creditos >= costo;
      this.botonNivel.setFillStyle(PALETA[this.faccionJugador].detalle, puede ? 0.9 : 0.35);
    } else {
      this.textoBotonNivel.setText('Nivel máximo');
      this.botonNivel.setFillStyle(0x333333, 0.5);
    }

    for (const { tipo, rect } of this.botonesProduccion) {
      const datos = UNIDADES[this.faccionJugador][tipo];
      const puede = base.puedeProducir(tipo) && creditos >= datos.costo;
      rect.setFillStyle(0x1c2230, puede ? 0.95 : 0.4);
      rect.setStrokeStyle(1, puede ? PALETA[this.faccionJugador].acento : 0x444444, 0.8);
    }

    this.barraProduccionActual.clear();
    if (base.colaProduccion.length > 0) {
      const item = base.colaProduccion[0];
      const frac = 1 - item.tiempoRestanteMs / item.tiempoTotalMs;
      const boton = this.botonesProduccion.find((b) => b.tipo === item.tipo);
      if (boton) {
        const b = boton.rect.getBounds();
        this.barraProduccionActual.fillStyle(0x000000, 0.5);
        this.barraProduccionActual.fillRect(b.x, b.y + b.height - 6, b.width, 6);
        this.barraProduccionActual.fillStyle(0x4ade80, 1);
        this.barraProduccionActual.fillRect(b.x, b.y + b.height - 6, b.width * frac, 6);
      }
    }
  }

  actualizarTecnologia(niveles: NivelesTecnologia, creditos: number): void {
    for (const rama of ['armamento', 'defensa'] as const) {
      const { rect, texto } = this.botonesTecnologia[rama];
      const nivel = niveles[rama];
      const costo = costoProximoNivel(niveles, rama);
      if (costo <= 0) {
        texto.setText(`${NOMBRE_RAMA[rama]} MAX (${nivel}/2)`);
        rect.setFillStyle(0x223322, 0.7);
        rect.setStrokeStyle(1, 0x4ade80, 0.7);
      } else {
        const puede = creditos >= costo;
        texto.setText(`${NOMBRE_RAMA[rama]} ${nivel}/2 (${costo}cr)`);
        rect.setFillStyle(0x1c2230, puede ? 0.95 : 0.4);
        rect.setStrokeStyle(1, puede ? PALETA[this.faccionJugador].acento : 0x444444, 0.8);
      }
    }
  }

  /**
   * Único punto que decide qué muestra el panel contextual: habilidad de
   * crucero, mejora de mina o punto de reunión. Antes eran dos métodos que se
   * ocultaban mutuamente a mano, lo que no escalaba a un tercer estado.
   */
  actualizarPanelContextual(naves: Nave[], mina: Mina | null, base: Base | null, creditos: number): void {
    const crucero = naves.find((n) => n.tipo === 'crucero' && n.faccion === this.faccionJugador) ?? null;
    this.idCruceroSeleccionado = crucero?.id ?? null;
    this.textoBotonHabilidad.clear();

    const modo = crucero ? 'habilidad' : mina ? 'mina' : base ? 'reunion' : 'ninguno';

    this.botonHabilidad.setVisible(modo === 'habilidad');
    this.textoNombreHabilidad.setVisible(modo === 'habilidad');
    this.botonMejoraMina.setVisible(modo === 'mina');
    this.textoBotonMejoraMina.setVisible(modo === 'mina');
    this.botonReunion.setVisible(modo === 'reunion');
    this.textoBotonReunion.setVisible(modo === 'reunion');

    if (modo === 'habilidad' && crucero) this.dibujarPanelHabilidad(crucero);
    else if (modo === 'mina' && mina) this.dibujarPanelMina(mina, creditos);
    else if (modo === 'reunion' && base) this.dibujarPanelReunion(base);
  }

  private dibujarPanelReunion(base: Base): void {
    if (base.puntoReunion) {
      this.textoBotonReunion.setText('Quitar punto de reunión');
      this.botonReunion.setFillStyle(0x5ad8ff, 0.9);
    } else {
      this.textoBotonReunion.setText('Click derecho: fijar punto de reunión');
      this.botonReunion.setFillStyle(0x5ad8ff, 0.35);
    }
  }

  private dibujarPanelHabilidad(crucero: Nave): void {
    const especial = CRUCERO_ESPECIAL[this.faccionJugador];
    const lista = crucero.puedeUsarHabilidad();
    const progreso = crucero.progresoHabilidad01();
    this.textoNombreHabilidad.setText(lista ? NOMBRE_HABILIDAD[especial.tipoHabilidad] : `Recargando ${(progreso * 100).toFixed(0)}%`);
    this.botonHabilidad.setFillStyle(PALETA[this.faccionJugador].acento, lista ? 0.9 : 0.35);

    const b = this.botonHabilidad.getBounds();
    this.textoBotonHabilidad.fillStyle(0x000000, 0.35);
    this.textoBotonHabilidad.fillRect(b.x, b.y + b.height - 4, b.width, 4);
    this.textoBotonHabilidad.fillStyle(0x4ade80, 1);
    this.textoBotonHabilidad.fillRect(b.x, b.y + b.height - 4, b.width * progreso, 4);
  }

  private dibujarPanelMina(mina: Mina, creditos: number): void {
    const puedeMejorar = mina.puedeMejorar(this.faccionJugador);
    if (!puedeMejorar) {
      this.textoBotonMejoraMina.setText(mina.nivelMejora === 1 ? 'Mina ya mejorada' : 'Mina no disponible');
      this.botonMejoraMina.setFillStyle(0x555555, 0.6);
      return;
    }
    const costo = mina.costoMejora();
    const puedePagar = creditos >= costo;
    this.textoBotonMejoraMina.setText(`Mejorar mina (+${Math.round(MEJORA_MINA.bonoIngresoFraccion * 100)}%, ${costo}cr)`);
    this.botonMejoraMina.setFillStyle(0xffd76a, puedePagar ? 0.9 : 0.35);
  }

  /** Fila de chips "N:cantidad" con los grupos de control asignados. */
  actualizarGrupos(grupos: ResumenGrupo[]): void {
    this.gruposGraficos.clear();
    for (const t of this.gruposTextos) t.setVisible(false);
    if (grupos.length === 0) return;

    const anchoChip = 40;
    const altoChip = 18;
    const separacion = 5;
    const total = grupos.length * anchoChip + (grupos.length - 1) * separacion;
    const inicioX = this.escena.scale.width / 2 - total / 2;
    const y = this.escena.scale.height - ALTURA_ZONA_HUD_PX - altoChip - 6;

    grupos.forEach((grupo, i) => {
      const x = inicioX + i * (anchoChip + separacion);
      this.gruposGraficos.fillStyle(0x05070d, grupo.activo ? 0.95 : 0.7);
      this.gruposGraficos.fillRect(x, y, anchoChip, altoChip);
      this.gruposGraficos.lineStyle(1, grupo.activo ? PALETA[this.faccionJugador].seleccion : 0x555b66, 0.9);
      this.gruposGraficos.strokeRect(x, y, anchoChip, altoChip);

      const texto = this.gruposTextos[i];
      texto.setText(`${grupo.numero}:${grupo.cantidad}`);
      texto.setColor(grupo.activo ? '#ffffff' : '#9aa3ad');
      texto.setPosition(x + anchoChip / 2, y + altoChip / 2);
      texto.setVisible(true);
    });
  }

  private actualizarBotonMute(): void {
    const silencio = estaSilenciado();
    this.textoBotonMute.setText(silencio ? 'Sonido: silenciado' : 'Sonido: activado');
    this.botonMute.setStrokeStyle(1, silencio ? 0xef4444 : 0x4ade80, 0.9);
  }

  /** Encola un anuncio estilo holograma (traslúcido celeste) en la parte superior de la pantalla. */
  anunciar(mensaje: string): void {
    this.colaAnuncios.push(mensaje);
    if (!this.anuncioActivo) this.procesarSiguienteAnuncio();
  }

  private procesarSiguienteAnuncio(): void {
    const mensaje = this.colaAnuncios.shift();
    if (!mensaje) {
      this.anuncioActivo = null;
      return;
    }
    const w = this.escena.scale.width;
    const cont = this.escena.add.container(w / 2, 46);
    cont.setScrollFactor(0);
    cont.setDepth(1500);
    cont.setAlpha(0);

    const texto = this.escena.add.text(0, 0, mensaje, {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#bfeaff',
    });
    texto.setOrigin(0.5, 0.5);
    const anchoCaja = texto.width + 36;
    const fondo = this.escena.add.rectangle(0, 0, anchoCaja, 30, 0x0a2a3a, 0.55);
    fondo.setStrokeStyle(1, 0x5ad8ff, 0.8);
    cont.add([fondo, texto]);
    this.anuncioActivo = cont;

    this.escena.tweens.add({
      targets: cont,
      alpha: 1,
      duration: 220,
      onComplete: () => {
        this.escena.time.delayedCall(2400, () => {
          this.escena.tweens.add({
            targets: cont,
            alpha: 0,
            duration: 260,
            onComplete: () => {
              cont.destroy();
              this.procesarSiguienteAnuncio();
            },
          });
        });
      },
    });
  }

  actualizarMinimapa(
    minas: Mina[],
    baseCoalicion: Base,
    baseEnjambre: Base,
    navesCoalicion: Nave[],
    navesEnjambre: Nave[],
    chatarras: Chatarra[],
    camara: Phaser.Cameras.Scene2D.Camera,
  ): void {
    const g = this.minimapaGraficos;
    g.clear();

    const aX = (x: number) => this.minimapaOrigenX + (x / ANCHO_MUNDO) * ANCHO_MINIMAPA;
    const aY = (y: number) => this.minimapaOrigenY + (y / ALTO_MUNDO) * ALTO_MINIMAPA;

    for (const m of minas) {
      const color = m.destruida ? 0x333333 : m.duenio ? PALETA[m.duenio].acento : COLOR_MINA_NEUTRAL;
      g.fillStyle(color, 1);
      g.fillCircle(aX(m.x), aY(m.y), m.esRica ? 4.5 : 3);
    }

    g.fillStyle(0xffd76a, 0.9);
    for (const c of chatarras) {
      g.fillCircle(aX(c.x), aY(c.y), 1.6);
    }

    g.fillStyle(PALETA.coalicion.seleccion, 1);
    for (const n of navesCoalicion) {
      if (n.estaVivo()) g.fillCircle(aX(n.x), aY(n.y), 1.6);
    }
    g.fillStyle(PALETA.enjambre.seleccion, 1);
    for (const n of navesEnjambre) {
      if (n.estaVivo()) g.fillCircle(aX(n.x), aY(n.y), 1.6);
    }

    if (baseCoalicion.estaVivo()) {
      g.fillStyle(PALETA.coalicion.casco, 1);
      g.fillRect(aX(baseCoalicion.x) - 4, aY(baseCoalicion.y) - 4, 8, 8);
    }
    if (baseEnjambre.estaVivo()) {
      g.fillStyle(PALETA.enjambre.cascoOscuro, 1);
      g.fillRect(aX(baseEnjambre.x) - 4, aY(baseEnjambre.y) - 4, 8, 8);
    }

    // rectángulo de vista de cámara
    g.lineStyle(1, 0xffffff, 0.7);
    g.strokeRect(
      aX(camara.scrollX),
      aY(camara.scrollY),
      (camara.width / camara.zoom / ANCHO_MUNDO) * ANCHO_MINIMAPA,
      (camara.height / camara.zoom / ALTO_MUNDO) * ALTO_MINIMAPA,
    );
  }

  private mostrarFin(titulo: string, color: string): void {
    if (this.overlayFin) return;
    const w = this.escena.scale.width;
    const h = this.escena.scale.height;
    const cont = this.escena.add.container(0, 0);
    cont.setScrollFactor(0);
    cont.setDepth(2000);

    const fondo = this.escena.add.rectangle(0, 0, w, h, 0x000000, 0.75);
    fondo.setOrigin(0, 0);
    cont.add(fondo);

    const texto = this.escena.add.text(w / 2, h / 2 - 40, titulo, {
      fontFamily: 'monospace',
      fontSize: '48px',
      color,
      fontStyle: 'bold',
    });
    texto.setOrigin(0.5, 0.5);
    cont.add(texto);

    const boton = this.escena.add.rectangle(w / 2, h / 2 + 40, 220, 46, 0x1c2230, 1);
    boton.setStrokeStyle(2, 0xe8ecf0, 1);
    boton.setInteractive({ useHandCursor: true });
    boton.on('pointerdown', () => this.onVolverAlMenu?.());
    cont.add(boton);

    const textoBoton = this.escena.add.text(w / 2, h / 2 + 40, 'Volver al menú', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8ecf0',
    });
    textoBoton.setOrigin(0.5, 0.5);
    cont.add(textoBoton);

    this.overlayFin = cont;
  }

  mostrarVictoria(): void {
    this.mostrarFin('¡VICTORIA!', '#4ade80');
    reproducirVictoria();
  }

  mostrarDerrota(): void {
    this.mostrarFin('DERROTA', '#ef4444');
    reproducirDerrota();
  }
}
