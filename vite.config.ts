import { defineConfig } from 'vite';

// El juego es una sola escena de partida, así que no hay rutas que cargar por
// demanda: el code-splitting útil acá es separar Phaser (que es la mayor parte
// del peso y no cambia nunca) del código del juego (que cambia en cada build).
// Así el chunk del motor queda cacheado en el navegador entre despliegues, en
// vez de reenviarse completo por cambiar una constante de balance.
export default defineConfig({
  build: {
    // Con Phaser ya aislado en su propio chunk, el único que sigue pasando los
    // 500kB por defecto es el del motor, y no hay forma sensata de partirlo
    // más. El umbral se sube para que el warning vuelva a ser una señal útil
    // si algún día crece el código del juego, en vez de ruido fijo.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // Rolldown (el bundler de Vite 8) solo acepta la forma de función,
        // no el mapa de nombre → módulos que usaba Rollup.
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          return null;
        },
      },
    },
  },
});
