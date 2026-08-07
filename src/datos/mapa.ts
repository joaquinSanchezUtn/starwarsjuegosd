// Geografía fija del mapa: tamaño del mundo, posiciones de bases y minas.
export const ANCHO_MUNDO = 3200;
export const ALTO_MUNDO = 2200;

export const POSICION_BASE_COALICION = { x: 320, y: 1900 };
export const POSICION_BASE_ENJAMBRE = { x: 2880, y: 300 };

// 8 minas: 2 seguras cerca de cada base, 4 en zonas neutrales/centro.
export const POSICIONES_MINAS: { x: number; y: number }[] = [
  { x: 620, y: 1740 }, // segura Coalición
  { x: 430, y: 1440 }, // segura Coalición
  { x: 2580, y: 460 }, // segura Enjambre
  { x: 2770, y: 760 }, // segura Enjambre
  { x: 1600, y: 1080 }, // centro
  { x: 1150, y: 1560 }, // centro-sur, disputable
  { x: 2050, y: 600 }, // centro-norte, disputable
  { x: 1700, y: 1850 }, // sur, expuesta
];
