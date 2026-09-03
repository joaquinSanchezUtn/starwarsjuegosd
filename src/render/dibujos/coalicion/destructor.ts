// Entrada inerte: la Guadaña es exclusiva del Enjambre (ver
// DatosUnidad.exclusivaDe en balance.ts). Esta nave nunca se instancia desde
// el bando Coalición; el re-export solo satisface el dispatch exhaustivo por
// tipo de nave en render/dibujos/index.ts.
export { dibujar } from '../enjambre/destructor.ts';
