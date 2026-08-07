// HUD de la partida: economía, cola de producción, subida de nivel,
// minimapa clickeable, y pantallas de victoria/derrota.
import Phaser from 'phaser';
import type { Faccion, TipoUnidad } from '../nucleo/tipos.ts';
import type { Base } from '../entidades/Base.ts';
import type { Mina } from '../entidades/Mina.ts';
import type { Nave } from '../entidades/Nave.ts';
import { UNIDADES, BASE } from '../datos/balance.ts';
import { PALETA, COLOR_MINA_NEUTRAL } from '../datos/colores.ts';
import { ANCHO_MUNDO, ALTO_MUNDO } from '../datos/mapa.ts';

export const ALTURA_ZONA_HUD_PX = 128;

const TIPOS_PRODUCIBLES: TipoUnidad[] = ['cazaLigero', 'cazaPesado', 'bombardero', 'fragata', 'crucero', 'captura'];

const ANCHO_MINIMAPA = 230;
const ALTO_MINIMAPA = 158;

export class HUD {
  onClickProducir?: (tipo: TipoUnidad) => void;
  onClickSubirNivel?: () => void;
  onClickMinimapa?: (xMundo: number, yMundo: number) => void;
  onVolverAlMenu?: () => void;

  private escena: Phaser.Scene;
  private faccionJugador: Faccion;

  private textoEconomia: Phaser.GameObjects.Text;
  private textoNivel: Phaser.GameObjects.Text;
  private barraProduccionActual: Phaser.GameObjects.Graphics;
  private botonesProduccion: { tipo: TipoUnidad; rect: Phaser.GameObjects.Rectangle; texto: Phaser.GameObjects.Text }[] = [];
  private botonNivel: Phaser.GameObjects.Rectangle;
  private textoBotonNivel: Phaser.GameObjects.Text;
  private minimapaFondo: Phaser.GameObjects.Rectangle;
  private minimapaGraficos: Phaser.GameObjects.Graphics;
  private minimapaOrigenX: number;
  private minimapaOrigenY: number;
  private overlayFin: Phaser.GameObjects.Container | null = null;

  constructor(escena: Phaser.Scene, faccionJugador: Faccion) {
    this.escena = escena;
    this.faccionJugador = faccionJugador;
    const w = escena.scale.width;
    const h = escena.scale.height;

    // Franja inferior de fondo
    const fondoHud = escena.add.rectangle(0, h - ALTURA_ZONA_HUD_PX, w, ALTURA_ZONA_HUD_PX, 0x05070d, 0.88);
    fondoHud.setOrigin(0, 0);
    fondoHud.setScrollFactor(0);
    fondoHud.setDepth(900);

    // Economía (arriba a la izquierda)
    this.textoEconomia = escena.add.text(14, 12, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8ecf0',
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

    // Panel de producción (centro)
    const anchoBoton = 76;
    const separacion = 8;
    const totalAncho = TIPOS_PRODUCIBLES.length * anchoBoton + (TIPOS_PRODUCIBLES.length - 1) * separacion;
    const inicioX = w / 2 - totalAncho / 2;
    const y = h - ALTURA_ZONA_HUD_PX + 20;

    this.barraProduccionActual = escena.add.graphics();
    this.barraProduccionActual.setScrollFactor(0);
    this.barraProduccionActual.setDepth(910);

    TIPOS_PRODUCIBLES.forEach((tipo, i) => {
      const x = inicioX + i * (anchoBoton + separacion);
      const rect = escena.add.rectangle(x, y, anchoBoton, 64, 0x1c2230, 0.95);
      rect.setOrigin(0, 0);
      rect.setScrollFactor(0);
      rect.setDepth(910);
      rect.setStrokeStyle(1, PALETA[faccionJugador].acento, 0.6);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onClickProducir?.(tipo));

      const nombre = UNIDADES[faccionJugador][tipo].nombre[faccionJugador];
      const costo = UNIDADES[faccionJugador][tipo].costo;
      const texto = escena.add.text(x + anchoBoton / 2, y + 32, `${nombre}\n${costo}cr`, {
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
      const relX = (p.x - this.minimapaOrigenX) / ANCHO_MINIMAPA;
      const relY = (p.y - this.minimapaOrigenY) / ALTO_MINIMAPA;
      this.onClickMinimapa?.(relX * ANCHO_MUNDO, relY * ALTO_MUNDO);
    });

    this.minimapaGraficos = escena.add.graphics();
    this.minimapaGraficos.setScrollFactor(0);
    this.minimapaGraficos.setDepth(911);
  }

  actualizarEconomia(creditos: number, ingresoPorSegundo: number, minasControladas: number): void {
    this.textoEconomia.setText(
      `Créditos: ${Math.floor(creditos)}   Ingreso: ${ingresoPorSegundo.toFixed(1)}/s   Minas: ${minasControladas}`,
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

  actualizarMinimapa(
    minas: Mina[],
    baseCoalicion: Base,
    baseEnjambre: Base,
    navesCoalicion: Nave[],
    navesEnjambre: Nave[],
    camara: Phaser.Cameras.Scene2D.Camera,
  ): void {
    const g = this.minimapaGraficos;
    g.clear();

    const aX = (x: number) => this.minimapaOrigenX + (x / ANCHO_MUNDO) * ANCHO_MINIMAPA;
    const aY = (y: number) => this.minimapaOrigenY + (y / ALTO_MUNDO) * ALTO_MINIMAPA;

    for (const m of minas) {
      const color = m.destruida ? 0x333333 : m.duenio ? PALETA[m.duenio].acento : COLOR_MINA_NEUTRAL;
      g.fillStyle(color, 1);
      g.fillCircle(aX(m.x), aY(m.y), 3);
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
  }

  mostrarDerrota(): void {
    this.mostrarFin('DERROTA', '#ef4444');
  }
}
