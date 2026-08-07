// Constantes de tamaño visual. El caza liviano mide LARGO_BASE_PX de largo;
// el resto de las naves escalan sobre esa base según DatosUnidad.escalaVisual
// (definido en balance.ts): caza 1x, caza pesado 1.3x, bombardero 1.5x,
// fragata 3x, crucero 5.5x.
export const LARGO_BASE_PX = 24;

// Tamaño del ícono de base jugable (estación / anillo con esfera).
export const RADIO_BASE_JUGADOR_PX = 70;

// Tamaño del ícono de mina en el mapa.
export const RADIO_MINA_PX = 16;

// Radio dentro del cual una nave cuenta como "presente" para capturar/defender una mina.
export const RADIO_CAPTURA_MINA_PX = 65;

// Radio dentro del cual la defensa de la base ataca automáticamente.
export const RADIO_SELECCION_CLICK_PX = 14;
