// Efectos visuales: estela de motor, disparo, explosiones escaladas por
// tamaño (con la muerte del crucero como evento especial), destello de
// escudo y llegada hiperespacial.
//
// TÉCNICA DE POOLING ELEGIDA (ver DECISIONES.md): en vez de crear un
// GameObject nuevo por cada partícula (chispa, fragmento, humo...), se usan
// `Phaser.GameObjects.Particles.ParticleEmitter` compartidos — UN emisor por
// "estilo" de partícula (fuego, chispa, humo, escombros por bando...),
// reutilizado para TODAS las explosiones/estelas de la partida. Phaser pool­ea
// internamente las partículas de cada emisor (las recicla en vez de
// destruirlas y crearlas de nuevo), que es exactamente el comportamiento que
// pide la regla de rendimiento del prompt. Los emisores se cachean por
// escena en un WeakMap y se invalidan solos al hacer shutdown de la escena
// (reinicio de partida), así nunca se referencia un emisor destruido.
import Phaser from 'phaser';
import type { Faccion, TipoUnidad } from '../nucleo/tipos.ts';
import { PALETA, COLOR_ANILLO_CAPTURA } from '../datos/colores.ts';
import { LARGO_BASE_PX } from '../datos/escalas.ts';
import { reproducirLaser, reproducirExplosion, reproducirDestelloEscudo, reproducirHiperespacio } from '../sonido/index.ts';

// ---------------------------------------------------------------------------
// Texturas y emisores compartidos (pooling)
// ---------------------------------------------------------------------------
type Emisor = Phaser.GameObjects.Particles.ParticleEmitter;

interface ConjuntoEmisores {
  fuego: Emisor;
  chispa: Emisor;
  humo: Emisor;
  escombros: Record<Faccion, Emisor>;
  estela: Record<Faccion, Emisor>;
  escudo: Record<Faccion, Emisor>;
}

/** Pool de líneas reciclables para el haz de disparo (ver `crearDisparo`): naves con armas
 * disparan mucho más seguido que las explosiones (evento puntual), así que un `Line` nuevo
 * por disparo era, en frecuencia, comparable al problema ya encontrado y arreglado en la
 * estela de motor. En vez de un `ParticleEmitter` (no representa bien un haz direccional),
 * se recicla un puñado fijo de `Line` en vez de crear uno nuevo por disparo. */
const TAMANO_POOL_DISPARO = 32;
interface PoolLineas {
  lineas: Phaser.GameObjects.Line[];
  indice: number;
}
const cacheLineasDisparo = new WeakMap<Phaser.Scene, PoolLineas>();

function obtenerLineaDelPool(escena: Phaser.Scene): Phaser.GameObjects.Line {
  let pool = cacheLineasDisparo.get(escena);
  if (!pool) {
    const lineas: Phaser.GameObjects.Line[] = [];
    for (let i = 0; i < TAMANO_POOL_DISPARO; i++) {
      const l = escena.add.line(0, 0, 0, 0, 0, 0, 0xffffff, 0);
      l.setOrigin(0, 0);
      l.setDepth(40);
      l.setVisible(false);
      lineas.push(l);
    }
    pool = { lineas, indice: 0 };
    cacheLineasDisparo.set(escena, pool);
    escena.events.once('shutdown', () => cacheLineasDisparo.delete(escena));
  }
  const linea = pool.lineas[pool.indice];
  pool.indice = (pool.indice + 1) % pool.lineas.length;
  return linea;
}

const cacheEmisores = new WeakMap<Phaser.Scene, ConjuntoEmisores>();

function asegurarTexturas(escena: Phaser.Scene): void {
  if (escena.textures.exists('efx_particula')) return;
  // Generadas una sola vez (persisten en el TextureManager global del juego,
  // ver `escena.add.graphics()` + destroy() inmediato: nunca llegan a pintarse).
  const g = escena.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture('efx_particula', 16, 16);
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(0, 7, 9, 0, 12, 9);
  g.generateTexture('efx_astilla', 13, 10);
  g.destroy();
}

function construirEmisores(escena: Phaser.Scene): ConjuntoEmisores {
  const fuego = escena.add.particles(0, 0, 'efx_particula', {
    lifespan: { min: 220, max: 420 },
    speed: { min: 40, max: 160 },
    scale: { start: 0.9, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xfff2b0, 0xffb347, 0xff5a1f],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  fuego.setDepth(50);

  const chispa = escena.add.particles(0, 0, 'efx_particula', {
    lifespan: { min: 120, max: 260 },
    speed: { min: 80, max: 220 },
    scale: { start: 0.35, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: 0xfff6d8,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  chispa.setDepth(52);

  const humo = escena.add.particles(0, 0, 'efx_particula', {
    lifespan: { min: 900, max: 1800 },
    speed: { min: 8, max: 30 },
    scale: { start: 0.6, end: 1.8 },
    alpha: { start: 0.5, end: 0 },
    tint: 0x555555,
    emitting: false,
  });
  humo.setDepth(46);

  const escombros: Record<Faccion, Emisor> = {
    coalicion: crearEmisorEscombros(escena, PALETA.coalicion.cascoOscuro),
    enjambre: crearEmisorEscombros(escena, PALETA.enjambre.cascoOscuro),
  };

  // Estela de motor: es, con diferencia, el efecto de más alta frecuencia del
  // juego (se emite para CADA nave viva, todo el tiempo, no solo en eventos
  // puntuales como una explosión) — por eso es el que más necesita pooling
  // real. Un solo emisor compartido por bando, alimentado vía
  // `emitParticleAt` en la posición de cada nave, en vez de crear un
  // GameObject + tween nuevo a mano por nave y por tick (eso fue lo que se
  // encontró y corrigió en la ronda de testing: con 30+ naves era la fuente
  // dominante de creación de objetos por segundo).
  const estela: Record<Faccion, Emisor> = {
    coalicion: crearEmisorEstela(escena, PALETA.coalicion.estelaMotor),
    enjambre: crearEmisorEstela(escena, PALETA.enjambre.estelaMotor),
  };

  // Destello de escudo: también pooled (cada nave con escudo — la mayoría de
  // la Coalición — lo dispara cada vez que absorbe daño; en una batalla
  // grande eso es frecuente, así que un emisor compartido por bando
  // reemplaza el `Circle` + `tween` manual que había antes.
  const escudo: Record<Faccion, Emisor> = {
    coalicion: crearEmisorEscudo(escena, PALETA.coalicion.estelaMotor),
    enjambre: crearEmisorEscudo(escena, PALETA.enjambre.estelaMotor),
  };

  return { fuego, chispa, humo, escombros, estela, escudo };
}

function crearEmisorEstela(escena: Phaser.Scene, tint: number): Emisor {
  const e = escena.add.particles(0, 0, 'efx_particula', {
    lifespan: { min: 220, max: 340 },
    speed: { min: 2, max: 10 },
    scale: { start: 0.55, end: 0 },
    alpha: { start: 0.8, end: 0 },
    tint,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  e.setDepth(9);
  return e;
}

function crearEmisorEscudo(escena: Phaser.Scene, tint: number): Emisor {
  const e = escena.add.particles(0, 0, 'efx_particula', {
    lifespan: { min: 150, max: 260 },
    speed: { min: 60, max: 150 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.9, end: 0 },
    tint,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  e.setDepth(53);
  return e;
}

function crearEmisorEscombros(escena: Phaser.Scene, tint: number): Emisor {
  const e = escena.add.particles(0, 0, 'efx_astilla', {
    lifespan: { min: 500, max: 1100 },
    speed: { min: 30, max: 140 },
    rotate: { start: 0, end: 360 },
    scale: { start: 1, end: 0.4 },
    alpha: { start: 1, end: 0 },
    tint,
    emitting: false,
  });
  e.setDepth(49);
  return e;
}

function obtenerEmisores(escena: Phaser.Scene): ConjuntoEmisores {
  let set = cacheEmisores.get(escena);
  if (set) return set;
  asegurarTexturas(escena);
  set = construirEmisores(escena);
  cacheEmisores.set(escena, set);
  escena.events.once('shutdown', () => cacheEmisores.delete(escena));
  return set;
}

// ---------------------------------------------------------------------------
// Helpers visuales de un solo uso (flash, onda expansiva): volumen bajo,
// no necesitan pooling — un par por explosión, no un stream continuo.
// ---------------------------------------------------------------------------
function flashBlanco(escena: Phaser.Scene, x: number, y: number, radioFinal: number): void {
  const c = escena.add.circle(x, y, radioFinal * 0.25, 0xffffff, 1);
  c.setDepth(55);
  c.setBlendMode(Phaser.BlendModes.ADD);
  escena.tweens.add({
    targets: c,
    radius: radioFinal,
    alpha: 0,
    duration: 220,
    ease: 'Cubic.Out',
    onComplete: () => c.destroy(),
  });
}

function ondaExpansiva(escena: Phaser.Scene, x: number, y: number, color: number): void {
  const g = escena.add.circle(x, y, 14, color, 0);
  g.setStrokeStyle(4, color, 0.9);
  g.setDepth(54);
  escena.tweens.add({
    targets: g,
    radius: 240,
    alpha: 0,
    duration: 750,
    ease: 'Cubic.Out',
    onComplete: () => g.destroy(),
  });
}

function sacudirCamara(camara: Phaser.Cameras.Scene2D.Camera, nivel: 'fragata' | 'crucero'): void {
  if (nivel === 'fragata') camara.shake(180, 0.0035);
  else camara.shake(450, 0.011);
}

type CategoriaExplosion = 'caza' | 'media' | 'grande' | 'crucero';

function categoriaExplosion(escalaVisual: number): CategoriaExplosion {
  if (escalaVisual < 1.4) return 'caza';
  if (escalaVisual < 2.6) return 'media';
  if (escalaVisual < 4.8) return 'grande';
  return 'crucero';
}

// ---------------------------------------------------------------------------
// Explosión principal: escala según el tamaño de la nave destruida.
// ---------------------------------------------------------------------------
export function crearExplosion(
  escena: Phaser.Scene,
  camara: Phaser.Cameras.Scene2D.Camera,
  x: number,
  y: number,
  _tipo: TipoUnidad,
  faccion: Faccion,
  escalaVisual: number,
  anguloMovimiento: number,
): void {
  const emisores = obtenerEmisores(escena);
  const categoria = categoriaExplosion(escalaVisual);
  reproducirExplosion(categoria);

  if (categoria === 'caza') {
    // flash blanco → bola de fuego breve → 2-3 escombros despedidos girando.
    flashBlanco(escena, x, y, 12);
    emisores.fuego.explode(9, x, y);
    emisores.escombros[faccion].explode(3, x, y);
    return;
  }

  if (categoria === 'media') {
    flashBlanco(escena, x, y, 18);
    emisores.fuego.explode(16, x, y);
    emisores.escombros[faccion].explode(4, x, y);
    emisores.humo.explode(3, x, y);
    return;
  }

  if (categoria === 'grande') {
    // 2-3 detonaciones internas encadenadas a lo largo del casco → explosión
    // principal → escombros grandes + humo persistente. Screen shake sutil.
    const largo = LARGO_BASE_PX * escalaVisual;
    const dx = Math.cos(anguloMovimiento);
    const dy = Math.sin(anguloMovimiento);
    const puntos = [-0.28, 0.05, 0.32];
    puntos.forEach((f, i) => {
      escena.time.delayedCall(i * 130, () => {
        if (!escena.sys.isActive()) return;
        flashBlanco(escena, x + dx * largo * f, y + dy * largo * f, 12);
        emisores.fuego.explode(10, x + dx * largo * f, y + dy * largo * f);
      });
    });
    escena.time.delayedCall(puntos.length * 130 + 100, () => {
      if (!escena.sys.isActive()) return;
      flashBlanco(escena, x, y, 30);
      emisores.fuego.explode(24, x, y);
      emisores.escombros[faccion].explode(7, x, y);
      emisores.humo.explode(9, x, y);
      sacudirCamara(camara, 'fragata');
    });
    return;
  }

  // crucero: el evento espectacular. Cadena proa→popa, el casco se parte en
  // 2-3 pedazos que derivan por inercia mientras siguen detonando, explosión
  // final con onda expansiva, restos que quedan flotando un buen rato.
  const largo = LARGO_BASE_PX * escalaVisual;
  const dx = Math.cos(anguloMovimiento);
  const dy = Math.sin(anguloMovimiento);
  const nx = Math.cos(anguloMovimiento + Math.PI / 2);
  const ny = Math.sin(anguloMovimiento + Math.PI / 2);
  const cadena = [-0.38, -0.12, 0.14, 0.4];

  cadena.forEach((f, i) => {
    escena.time.delayedCall(i * 180, () => {
      if (!escena.sys.isActive()) return;
      const px = x + dx * largo * f;
      const py = y + dy * largo * f;
      flashBlanco(escena, px, py, 16);
      emisores.fuego.explode(16, px, py);
      emisores.chispa.explode(10, px, py);
      sacudirCamara(camara, 'fragata');
    });
  });

  const tFinal = cadena.length * 180 + 160;
  escena.time.delayedCall(tFinal, () => {
    if (!escena.sys.isActive()) return;
    flashBlanco(escena, x, y, 48);
    emisores.fuego.explode(42, x, y);
    emisores.humo.explode(20, x, y);
    ondaExpansiva(escena, x, y, PALETA[faccion].acento);
    sacudirCamara(camara, 'crucero');
    crearFragmentosCasco(escena, x, y, faccion, largo, dx, dy, nx, ny, emisores);
  });
}

/** Fragmentos de casco que derivan por inercia, siguen detonando y quedan flotando un buen rato. */
function crearFragmentosCasco(
  escena: Phaser.Scene,
  x: number,
  y: number,
  faccion: Faccion,
  largo: number,
  dx: number,
  dy: number,
  nx: number,
  ny: number,
  emisores: ConjuntoEmisores,
): void {
  const color = PALETA[faccion].cascoOscuro;
  const acento = PALETA[faccion].acento;
  const offsets = [-1, 0, 1];

  for (const signo of offsets) {
    const g = escena.add.graphics({ x, y });
    g.setDepth(48);
    const ancho = largo * (0.24 + Math.random() * 0.1);
    const alto = largo * 0.11;
    g.fillStyle(color, 1);
    g.lineStyle(1, acento, 0.5);
    g.fillRect(-ancho / 2, -alto / 2, ancho, alto);
    g.strokeRect(-ancho / 2, -alto / 2, ancho, alto);

    const distancia = largo * (0.55 + Math.random() * 0.5);
    const destinoX = x + dx * distancia * 0.35 + nx * distancia * signo * 0.6;
    const destinoY = y + dy * distancia * 0.35 + ny * distancia * signo * 0.6;
    const anguloGiro = (Math.random() > 0.5 ? 1 : -1) * (60 + Math.random() * 90);

    escena.tweens.add({
      targets: g,
      x: destinoX,
      y: destinoY,
      angle: anguloGiro,
      duration: 2200 + Math.random() * 900,
      ease: 'Cubic.Out',
    });

    // Sigue detonando un rato mientras deriva.
    for (let k = 0; k < 3; k++) {
      escena.time.delayedCall(500 + k * 600 + Math.random() * 400, () => {
        if (!g.active) return;
        emisores.fuego.explode(6, g.x, g.y);
      });
    }

    // Queda flotando como chatarra visual un buen rato antes de desvanecerse.
    escena.time.delayedCall(15000 + Math.random() * 5000, () => {
      if (!g.active) return;
      escena.tweens.add({ targets: g, alpha: 0, duration: 2500, onComplete: () => g.destroy() });
    });
  }
}

// ---------------------------------------------------------------------------
// Disparo: haz con brillo + chispas en el punto de impacto.
// ---------------------------------------------------------------------------
export function crearDisparo(
  escena: Phaser.Scene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  faccion: Faccion,
  _tipoAtacante: TipoUnidad,
): void {
  const color = PALETA[faccion].acento;
  const linea = obtenerLineaDelPool(escena);
  escena.tweens.killTweensOf(linea);
  linea.setTo(x1, y1, x2, y2);
  linea.setStrokeStyle(3, color, 0.95);
  linea.setBlendMode(Phaser.BlendModes.ADD);
  linea.setAlpha(1);
  linea.setVisible(true);
  escena.tweens.add({
    targets: linea,
    alpha: 0,
    duration: 130,
    onComplete: () => linea.setVisible(false),
  });

  obtenerEmisores(escena).chispa.explode(4, x2, y2);
  reproducirLaser(faccion);
}

// ---------------------------------------------------------------------------
// Escudo: destello al absorber daño.
// ---------------------------------------------------------------------------
export function crearDestelloEscudo(
  escena: Phaser.Scene,
  nave: Phaser.GameObjects.Container,
  _radio: number,
  faccion: Faccion,
): void {
  // Pooled (ver ConjuntoEmisores.escudo): casi toda la Coalición tiene
  // escudo, así que esto se dispara muy seguido en batallas grandes.
  obtenerEmisores(escena).escudo[faccion].explode(6, nave.x, nave.y);
  reproducirDestelloEscudo();
}

// ---------------------------------------------------------------------------
// Daño progresivo (humo/fuego de naves dañadas): wrappers pooled para que
// `render/vfx/DanioProgresivo.ts` no tenga que crear GameObjects propios —
// reutiliza los emisores de humo/fuego/chispa ya compartidos por explosiones.
// ---------------------------------------------------------------------------
export function emitirHumoProgresivo(escena: Phaser.Scene, x: number, y: number): void {
  obtenerEmisores(escena).humo.emitParticleAt(x, y, 1);
}

export function emitirFuegoProgresivo(escena: Phaser.Scene, x: number, y: number): void {
  const emisores = obtenerEmisores(escena);
  emisores.fuego.emitParticleAt(x, y, 1);
  if (Math.random() < 0.35) emisores.chispa.emitParticleAt(x, y, 1);
}

// ---------------------------------------------------------------------------
// Llegada hiperespacial: estirón de luz + flash, en vez de aparecer de la nada.
// ---------------------------------------------------------------------------
export function crearFogonazoHiperespacio(escena: Phaser.Scene, x: number, y: number, faccion: Faccion): void {
  reproducirHiperespacio(faccion);
  const color = PALETA[faccion].estelaMotor;

  const destello = escena.add.circle(x, y, 3, 0xffffff, 1);
  destello.setDepth(60);
  destello.setBlendMode(Phaser.BlendModes.ADD);
  escena.tweens.add({
    targets: destello,
    radius: 26,
    alpha: 0,
    duration: 260,
    ease: 'Cubic.Out',
    onComplete: () => destello.destroy(),
  });

  const angulo = Math.random() * Math.PI * 2;
  const estira = escena.add.rectangle(x, y, 3, 50, color, 0.9);
  estira.setRotation(angulo);
  estira.setDepth(59);
  estira.setBlendMode(Phaser.BlendModes.ADD);
  escena.tweens.add({
    targets: estira,
    scaleX: 0.1,
    scaleY: 0.3,
    alpha: 0,
    duration: 340,
    ease: 'Cubic.In',
    onComplete: () => estira.destroy(),
  });
}

// ---------------------------------------------------------------------------
// Anillo de captura (sin cambios de contrato respecto del prompt 1).
// ---------------------------------------------------------------------------
export interface AnilloCaptura {
  setProgreso(t: number): void;
  destroy(): void;
}

export function crearAnilloCaptura(escena: Phaser.Scene, x: number, y: number, radio: number): AnilloCaptura {
  const g = escena.add.graphics({ x, y });
  g.setDepth(30);
  let progreso = 0;
  const redibujar = () => {
    g.clear();
    g.lineStyle(3, COLOR_ANILLO_CAPTURA, 0.9);
    g.beginPath();
    g.arc(0, 0, radio, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * progreso), false);
    g.strokePath();
  };
  redibujar();
  return {
    setProgreso(t: number) {
      progreso = Phaser.Math.Clamp(t, 0, 1);
      redibujar();
    },
    destroy() {
      g.destroy();
    },
  };
}

// ---------------------------------------------------------------------------
// Estela de motor: sigue a la nave, se intensifica al moverse.
// ---------------------------------------------------------------------------
export interface EstelaMotor {
  destroy(): void;
  actualizarIntensidad(activo: boolean): void;
}

export function crearEstelaMotor(
  escena: Phaser.Scene,
  objetivo: Phaser.GameObjects.Container,
  faccion: Faccion,
  offsetLocalX: number,
): EstelaMotor {
  // Pooled: un único emisor compartido por bando para TODAS las naves (ver
  // `crearEmisorEstela`), en vez de un GameObject + tween nuevo a mano por
  // nave y por tick — este era, con diferencia, el efecto de mayor
  // frecuencia del juego (se emite para cada nave viva todo el tiempo) y el
  // que más se sentía en batallas de 30+ naves antes de este cambio.
  const emisorEstela = obtenerEmisores(escena).estela[faccion];
  let activo = false;
  const evento = escena.time.addEvent({
    delay: 55,
    loop: true,
    callback: () => {
      if (!objetivo.active) return;
      const rot = objetivo.rotation;
      const dx = Math.cos(rot) * offsetLocalX;
      const dy = Math.sin(rot) * offsetLocalX;
      emisorEstela.emitParticleAt(objetivo.x + dx, objetivo.y + dy, activo ? 2 : 1);
    },
  });
  return {
    actualizarIntensidad(v: boolean) {
      activo = v;
    },
    destroy() {
      evento.remove(false);
    },
  };
}
