# Tareas pendientes / mejoras futuras

Cosas detectadas durante el desarrollo que quedan fuera de esta etapa, para revisar en una próxima iteración.

## Prioridad alta

- **Falta una sesión de juego real en navegador.** Este entorno no tenía la extensión de Chrome conectada ni una conexión lo bastante rápida para instalar Chromium vía Playwright (ver `DECISIONES.md`). El código se verificó con `tsc`, `npm run build`, un simulador de combate headless y revisión manual exhaustiva del código, pero nadie jugó una partida real todavía. Antes de dar el juego por "sentido y parejo" en la práctica (más allá de los números), correr `npm install && npm run dev` y jugar al menos una partida completa en cada dificultad.

## Prioridad media

- **Sin pathfinding.** Las naves se mueven en línea recta hacia su destino/objetivo. No hay obstáculos sólidos en el mapa actual, así que no se traban, pero si en el futuro se agregan obstáculos (asteroides, estructuras neutrales) van a necesitar evasión.
- **Sin punto de reunión (rally point) configurable.** Las naves recién producidas aparecen cerca de la base y quedan quietas ahí hasta recibir una orden manual. Sería natural poder fijar un punto de reunión para que salgan automáticamente hacia una posición.
- **Grupos de control sin indicador visual.** Los grupos 1-9 (Ctrl/Shift + número para asignar, número para seleccionar) funcionan, pero el HUD no muestra qué números tienen un grupo asignado ni cuántas naves tiene cada uno.
- **El minimapa no soporta arrastrar.** Solo responde a click (recentra la cámara ahí); sería natural poder mantener presionado y arrastrar para paneo continuo.

## Prioridad baja

- **Sin audio.** El juego no tiene música ni efectos de sonido (disparos, explosiones, captura, alertas). Es una ausencia notoria pero no bloqueante.
- **Sin guardado ni reanudación de partida.** Cerrar la pestaña pierde el progreso; no hay problema para partidas de la duración esperada, pero si se alargan podría valer la pena.
- **Selección por arrastre puede extenderse levemente sobre la franja del HUD** si el drag empieza en el mundo y el mouse se suelta ya dentro de esa franja inferior. No genera errores ni selecciona nada indebido (la conversión a coordenadas de mundo sigue siendo válida), pero es una imprecisión de UX menor que podría limpiarse recortando el rectángulo de selección contra el límite superior de la franja del HUD.
- **Bundle sin code-splitting.** `npm run build` avisa que el chunk final (~1.25MB, ~333KB gzip) supera el umbral por defecto de Vite. Es un único juego con una sola escena de menú y otra de partida, así que no es urgente, pero si el proyecto crece convendría dividir en chunks dinámicos.

## Ideas para una futura vuelta de balance

- El simulador de combate (`herramientas/simulador-balance.ts`) es una aproximación agregada (nubes de unidades acercándose en línea recta, sin posiciones 2D reales ni terreno). Sirve para validar la dirección del triángulo de contras y el desbalance del crucero, pero no reemplaza partidas jugadas para sentir el ritmo real (tiempos hasta la primera mina, primer combate, primer crucero, etc.).
- No se testeó a fondo el balance de la **nave de captura** en combate directo (tiene 0 de daño; su única función es capturar al doble de velocidad). Convendría verificar en partidas reales que no quede como una "trampa" para el jugador nuevo que la mande a pelear.
