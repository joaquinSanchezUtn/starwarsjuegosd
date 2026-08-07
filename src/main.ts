import Phaser from 'phaser';
import { EscenaMenu } from './escenas/EscenaMenu.ts';
import { EscenaJuego } from './escenas/EscenaJuego.ts';

// Resolución interna fija que se escala para llenar la ventana (letterboxed
// si la proporción no coincide). El HUD posiciona sus elementos con
// coordenadas absolutas calculadas una sola vez en base a escena.scale.width/
// height; con Phaser.Scale.RESIZE esos valores cambiarían en cada resize de
// ventana y el HUD quedaría desalineado de su propia zona de exclusión de
// clicks. FIT evita ese problema entero: el tamaño lógico nunca cambia.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#05070d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [EscenaMenu, EscenaJuego],
  render: {
    antialias: true,
  },
});
