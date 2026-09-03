// Entrada inerte: el Estilete es exclusivo de la Coalición (ver
// DatosUnidad.exclusivaDe en balance.ts). Esta nave nunca se instancia desde
// el bando Enjambre; el re-export solo satisface el dispatch exhaustivo por
// tipo de nave en render/dibujos/index.ts.
export { dibujar } from '../coalicion/interceptor.ts';
