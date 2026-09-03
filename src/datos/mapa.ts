// Geografía fija del mapa: tamaño del mundo, posiciones de bases y minas.
export const ANCHO_MUNDO = 3200;
export const ALTO_MUNDO = 2200;

export const POSICION_BASE_COALICION = { x: 320, y: 1900 };
export const POSICION_BASE_ENJAMBRE = { x: 2880, y: 300 };

// 8 minas: 2 seguras cerca de cada base, 4 en zonas neutrales/centro.
// Las minas "ricas" (rica: true) rinden el doble de ingreso base y son más
// grandes/brillantes — están en el centro del mapa a propósito, para que
// sean las más peleadas (ver MEJORA_MINA.multiplicadorMinaRica en balance.ts).
export const POSICIONES_MINAS: { x: number; y: number; rica?: boolean }[] = [
  { x: 620, y: 1740 }, // segura Coalición
  { x: 430, y: 1440 }, // segura Coalición
  { x: 2580, y: 460 }, // segura Enjambre
  { x: 2770, y: 760 }, // segura Enjambre
  { x: 1600, y: 1080, rica: true }, // centro
  { x: 1150, y: 1560 }, // centro-sur, disputable
  { x: 2050, y: 600, rica: true }, // centro-norte, disputable
  { x: 1700, y: 1850 }, // sur, expuesta
];
