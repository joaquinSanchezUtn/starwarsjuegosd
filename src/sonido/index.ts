// Sonido procedural: todos los efectos se sintetizan con Web Audio API
// (osciladores + ruido filtrado), sin archivos de audio — no hay que
// licenciar ni empaquetar nada. El láser suena distinto por bando (la
// Coalición, más "cañón"; el Enjambre, más eléctrico/chirriante) y las
// explosiones escalan de intensidad con el tamaño de la nave. Volumen
// ajustable y mute vía `setSilenciado`.
import type { Faccion } from '../nucleo/tipos.ts';

type CategoriaExplosion = 'caza' | 'media' | 'grande' | 'crucero';

let ctx: AudioContext | null = null;
let silenciado = false;
let volumenMaestro = 0.5;
let bufferRuido: AudioBuffer | null = null;
const ultimaReproduccionMs = new Map<string, number>();

function obtenerContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return null;
    ctx = new Constructor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function obtenerRuido(contexto: AudioContext): AudioBuffer {
  if (bufferRuido) return bufferRuido;
  const frames = Math.floor(contexto.sampleRate * 1);
  const buffer = contexto.createBuffer(1, frames, contexto.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) datos[i] = Math.random() * 2 - 1;
  bufferRuido = buffer;
  return buffer;
}

/** Throttle simple para sonidos que podrían dispararse muchas veces en el mismo tick. */
function puedeReproducir(clave: string, minIntervaloMs: number): boolean {
  const ahora = performance.now();
  const anterior = ultimaReproduccionMs.get(clave) ?? -Infinity;
  if (ahora - anterior < minIntervaloMs) return false;
  ultimaReproduccionMs.set(clave, ahora);
  return true;
}

export function setSilenciado(v: boolean): void {
  silenciado = v;
}
export function estaSilenciado(): boolean {
  return silenciado;
}
export function setVolumen(v: number): void {
  volumenMaestro = Math.max(0, Math.min(1, v));
}
export function obtenerVolumen(): number {
  return volumenMaestro;
}

function notaSimple(
  contexto: AudioContext,
  frecuencia: number,
  inicio: number,
  duracion: number,
  volumen: number,
  tipo: OscillatorType = 'sine',
): void {
  const osc = contexto.createOscillator();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuencia, inicio);
  const gain = contexto.createGain();
  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volumen), inicio + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(gain);
  gain.connect(contexto.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
}

export function reproducirLaser(faccion: Faccion): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  const t0 = contexto.currentTime;
  const vol = 0.14 * volumenMaestro;
  const osc = contexto.createOscillator();
  const gain = contexto.createGain();
  osc.connect(gain);
  gain.connect(contexto.destination);

  if (faccion === 'coalicion') {
    // Cañón: golpe seco, cae de agudo a grave rápido.
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(170, t0 + 0.09);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  } else {
    // Eléctrico/chirriante: sube y baja, más agudo y áspero.
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1300, t0);
    osc.frequency.exponentialRampToValueAtTime(2500, t0 + 0.045);
    osc.frequency.exponentialRampToValueAtTime(650, t0 + 0.1);
    gain.gain.setValueAtTime(vol * 0.85, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    osc.start(t0);
    osc.stop(t0 + 0.13);
  }
}

export function reproducirExplosion(categoria: CategoriaExplosion): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  const t0 = contexto.currentTime;
  const duracion = { caza: 0.25, media: 0.4, grande: 0.75, crucero: 1.5 }[categoria];
  const volBase = { caza: 0.2, media: 0.28, grande: 0.4, crucero: 0.5 }[categoria] * volumenMaestro;

  const ruido = contexto.createBufferSource();
  ruido.buffer = obtenerRuido(contexto);
  ruido.loop = true;
  const filtro = contexto.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(1400, t0);
  filtro.frequency.exponentialRampToValueAtTime(70, t0 + duracion);
  const gain = contexto.createGain();
  gain.gain.setValueAtTime(volBase, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
  ruido.connect(filtro);
  filtro.connect(gain);
  gain.connect(contexto.destination);
  ruido.start(t0);
  ruido.stop(t0 + duracion);

  if (categoria === 'grande' || categoria === 'crucero') {
    const osc = contexto.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t0);
    osc.frequency.exponentialRampToValueAtTime(28, t0 + duracion * 0.8);
    const gOsc = contexto.createGain();
    gOsc.gain.setValueAtTime(volBase * 0.85, t0);
    gOsc.gain.exponentialRampToValueAtTime(0.001, t0 + duracion * 0.8);
    osc.connect(gOsc);
    gOsc.connect(contexto.destination);
    osc.start(t0);
    osc.stop(t0 + duracion * 0.8);
  }
}

export function reproducirDestelloEscudo(): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  if (!puedeReproducir('escudo', 70)) return;
  const t0 = contexto.currentTime;
  const osc = contexto.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, t0);
  osc.frequency.exponentialRampToValueAtTime(1900, t0 + 0.08);
  const gain = contexto.createGain();
  gain.gain.setValueAtTime(0.09 * volumenMaestro, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
  osc.connect(gain);
  gain.connect(contexto.destination);
  osc.start(t0);
  osc.stop(t0 + 0.16);
}

export function reproducirHiperespacio(faccion: Faccion): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  if (!puedeReproducir(`hiper_${faccion}`, 140)) return;
  const t0 = contexto.currentTime;
  const osc = contexto.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(1500, t0 + 0.22);
  const gain = contexto.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(0.13 * volumenMaestro, t0 + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.26);
  osc.connect(gain);
  gain.connect(contexto.destination);
  osc.start(t0);
  osc.stop(t0 + 0.28);
}

export function reproducirCaptura(): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  const t0 = contexto.currentTime;
  const vol = 0.15 * volumenMaestro;
  notaSimple(contexto, 660, t0, 0.1, vol, 'triangle');
  notaSimple(contexto, 990, t0 + 0.09, 0.14, vol, 'triangle');
}

export function reproducirAlertaBase(): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  if (!puedeReproducir('alertaBase', 3500)) return;
  const t0 = contexto.currentTime;
  const vol = 0.2 * volumenMaestro;
  notaSimple(contexto, 520, t0, 0.16, vol, 'square');
  notaSimple(contexto, 520, t0 + 0.22, 0.16, vol, 'square');
}

export function reproducirVictoria(): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  const t0 = contexto.currentTime;
  const vol = 0.2 * volumenMaestro;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => notaSimple(contexto, f, t0 + i * 0.14, 0.32, vol, 'triangle'));
}

export function reproducirDerrota(): void {
  const contexto = obtenerContexto();
  if (!contexto || silenciado) return;
  const t0 = contexto.currentTime;
  const vol = 0.2 * volumenMaestro;
  [392, 349.23, 293.66, 220].forEach((f, i) => notaSimple(contexto, f, t0 + i * 0.18, 0.4, vol, 'sawtooth'));
}
