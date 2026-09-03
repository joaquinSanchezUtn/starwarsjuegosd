// Punto de entrada de dibujo. Dado un contenedor Phaser vacío, dibuja adentro
// la silueta vectorial de la nave o base pedida, delegando en la función
// específica de facción+tipo (ver subcarpetas coalicion/ y enjambre/).
//
// CONTRATO DE ORIENTACIÓN: el frente de la nave apunta en +X local (rotación
// 0 = mirando a la derecha). El origen (0,0) del contenedor es el centro
// geométrico de la nave. `escena.rotation` se ajusta afuera según el rumbo.
import Phaser from 'phaser';
import type { Faccion, TipoUnidad } from '../../nucleo/tipos.ts';

import * as coalicionCazaLigero from './coalicion/cazaLigero.ts';
import * as coalicionCazaPesado from './coalicion/cazaPesado.ts';
import * as coalicionBombardero from './coalicion/bombardero.ts';
import * as coalicionFragata from './coalicion/fragata.ts';
import * as coalicionCrucero from './coalicion/crucero.ts';
import * as coalicionCaptura from './coalicion/captura.ts';
import * as coalicionInterceptor from './coalicion/interceptor.ts';
import * as coalicionDestructor from './coalicion/destructor.ts';
import * as coalicionBase from './coalicion/base.ts';

import * as enjambreCazaLigero from './enjambre/cazaLigero.ts';
import * as enjambreCazaPesado from './enjambre/cazaPesado.ts';
import * as enjambreBombardero from './enjambre/bombardero.ts';
import * as enjambreFragata from './enjambre/fragata.ts';
import * as enjambreCrucero from './enjambre/crucero.ts';
import * as enjambreCaptura from './enjambre/captura.ts';
import * as enjambreInterceptor from './enjambre/interceptor.ts';
import * as enjambreDestructor from './enjambre/destructor.ts';
import * as enjambreBase from './enjambre/base.ts';

type FnDibujo = (contenedor: Phaser.GameObjects.Container, escena: Phaser.Scene) => void;

const DISPATCH_NAVE: Record<Faccion, Record<TipoUnidad, FnDibujo>> = {
  coalicion: {
    cazaLigero: coalicionCazaLigero.dibujar,
    cazaPesado: coalicionCazaPesado.dibujar,
    bombardero: coalicionBombardero.dibujar,
    fragata: coalicionFragata.dibujar,
    crucero: coalicionCrucero.dibujar,
    captura: coalicionCaptura.dibujar,
    interceptor: coalicionInterceptor.dibujar,
    destructor: coalicionDestructor.dibujar,
  },
  enjambre: {
    cazaLigero: enjambreCazaLigero.dibujar,
    cazaPesado: enjambreCazaPesado.dibujar,
    bombardero: enjambreBombardero.dibujar,
    fragata: enjambreFragata.dibujar,
    crucero: enjambreCrucero.dibujar,
    captura: enjambreCaptura.dibujar,
    interceptor: enjambreInterceptor.dibujar,
    destructor: enjambreDestructor.dibujar,
  },
};

const DISPATCH_BASE: Record<Faccion, FnDibujo> = {
  coalicion: coalicionBase.dibujar,
  enjambre: enjambreBase.dibujar,
};

export function dibujarNave(
  contenedor: Phaser.GameObjects.Container,
  escena: Phaser.Scene,
  tipo: TipoUnidad,
  faccion: Faccion,
): void {
  DISPATCH_NAVE[faccion][tipo](contenedor, escena);
}

export function dibujarBase(
  contenedor: Phaser.GameObjects.Container,
  escena: Phaser.Scene,
  faccion: Faccion,
): void {
  DISPATCH_BASE[faccion](contenedor, escena);
}
