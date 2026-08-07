// Paleta de colores por bando. Números en formato hex Phaser (0xRRGGBB).
import type { Faccion } from '../nucleo/tipos.ts';

export interface PaletaFaccion {
  casco: number;
  cascoOscuro: number;
  acento: number;
  detalle: number;
  estelaMotor: number;
  seleccion: number;
}

export const PALETA: Record<Faccion, PaletaFaccion> = {
  coalicion: {
    casco: 0xe8ecf0, // blanco / gris claro
    cascoOscuro: 0xb8c2cc,
    acento: 0xc23b3b, // rojo (franjas / alerones)
    detalle: 0x1b2a4a, // azul oscuro
    estelaMotor: 0x7fe0ff, // celeste
    seleccion: 0x4ad1ff,
  },
  enjambre: {
    casco: 0xac9770, // beige metálico
    cascoOscuro: 0x6b5940, // marrón apagado
    acento: 0xd4342c, // rojo (ojos / sensores)
    detalle: 0x3a3a3e, // gris oscuro
    estelaMotor: 0x9b4fd6, // violeta
    seleccion: 0xff5a4d,
  },
};

export const COLOR_HP_ALTO = 0x4ade80;
export const COLOR_HP_MEDIO = 0xfacc15;
export const COLOR_HP_BAJO = 0xef4444;
export const COLOR_MINA_NEUTRAL = 0x8a8f98;
export const COLOR_FONDO_MAPA = 0x05070d;
export const COLOR_ANILLO_CAPTURA = 0x4ade80;
