# Decisiones de diseño

Este documento registra las decisiones tomadas de forma autónoma durante el desarrollo de **Guerra de Fábricas**, con la justificación de cada una. El proyecto se construyó de punta a punta con un orquestador que delegó en subagentes en paralelo (arte de naves, IA enemiga) y resolvió el resto (arquitectura, sistemas de juego, UI, balance, integración y testing) de forma directa.

## Ambientación y nombres

- Universo original inspirado en la estética de "guerra de clones vs. droides", sin usar nombres registrados de ninguna franquicia. El juego se llama **Guerra de Fábricas** para reforzar la fantasía central: no hay héroes, hay líneas de producción compitiendo.
- Bando jugador: **La Coalición** (clones). Bando IA: **El Enjambre** (droides).
- Cada nave tiene nombre propio inventado en español, listado en el README. Los nombres se eligieron para sonar a designación militar/industrial (una sola palabra, sin artículos), consistentes con la fantasía de producción en masa.

## Arquitectura técnica

- **Phaser 3.90 + TypeScript + Vite**, tal como se pidió. Se corrigió explícitamente la instalación porque `npm create vite` + `npm install phaser` trajo Phaser 4 por defecto (la última versión publicada); se fijó `phaser@^3.90.0` a mano.
- Estructura modular por responsabilidad: `src/nucleo` (tipos compartidos, el "contrato" entre módulos), `src/datos` (balance, paleta, escalas, mapa — toda constante de diseño vive acá), `src/entidades` (Nave/Base/Mina, cada una implementa `ObjetivoAtacable`), `src/render/dibujos` (arte vectorial por código), `src/sistemas` (combate, economía, producción, selección, cámara), `src/ia` (máquina de estados enemiga + adaptador), `src/ui` (HUD), `src/escenas` (menú y partida).
- **Combate por impacto instantáneo (hitscan)**, no proyectiles físicos con tiempo de vuelo: cuando una nave dispara, el daño se aplica en el mismo tick y se dibuja una línea/destello como refuerzo visual (`render/efectos.ts`). Se eligió así para simplificar la simulación (sin pool de proyectiles ni colisión física) sin sacrificar la sensación de combate: a la escala y velocidad del juego, la diferencia visual contra un proyectil real es mínima.
- **Contrato `ObjetivoAtacable`** (`nucleo/tipos.ts`): naves, bases y minas implementan la misma interfaz de daño/vida. Esto permite que el triángulo de contras y el daño en área funcionen de manera uniforme contra cualquier tipo de blanco (por ejemplo, el bonus de bombardero contra bases/minas usa exactamente el mismo mecanismo que caza liviano contra bombardero).
- **Resolución interna fija (1280×720) con `Phaser.Scale.FIT`**, en vez de `RESIZE` ajustado a la ventana. El HUD posiciona sus elementos con coordenadas absolutas calculadas una sola vez; con `RESIZE`, cambiar el tamaño de la ventana del navegador movería `scale.width/height` y desalinearía el HUD respecto de su propia zona de exclusión de clicks (la franja inferior donde no se debe iniciar selección). `FIT` mantiene el tamaño lógico constante y solo escala visualmente el canvas — evita esa clase entera de bugs sin necesidad de recalcular el layout en cada resize.

## Mundo y minas

- Mundo de 3200×2200px, más grande que la pantalla (cámara desplazable con WASD/flechas y con el mouse en los bordes).
- Bases en esquinas opuestas (`src/datos/mapa.ts`).
- 8 minas: 2 "seguras" cerca de cada base, 4 en zonas centrales/disputables, siguiendo la pauta pedida (rango 6-10, con seguridad cerca de cada base y disputa en el centro).
- Captura de mina: se registra qué facción tiene naves dentro de un radio de 65px de la mina cada tick. Si hay una sola facción presente y no es la dueña actual, progresa una barra de captura (más rápido con nave de captura, que tiene `multiplicadorCaptura: 2`, es decir la mitad de tiempo). Si ambas facciones tienen naves presentes simultáneamente, el progreso se congela (disputa) en vez de cancelarse — evita que alcance con tocar la mina un instante para arruinar el progreso ajeno.
- Mina destruida a tiros: pasa a estado "destruida" (inerte, no capturable, dibujada como una X gris) durante 18 segundos, dentro del rango 15-20s pedido, y luego vuelve a neutral.

## Balance: el archivo único de verdad

Todos los números viven en `src/datos/balance.ts`. Nada de balance está hardcodeado en otro archivo.

### Triángulo de contras (con ajuste post-simulación)

La primera versión del triángulo usaba multiplicadores modestos (1.3x–1.7x) inspirados en RTS clásicos, pero **no se validó a ojo**: se construyó `herramientas/simulador-balance.ts`, un simulador headless (sin navegador, corre con `npx tsx`) que enfrenta grupos de igual costo aproximado usando las mismas fórmulas de daño que el motor real. Los resultados originales mostraron que:

- Fragata (1 unidad, 320cr) perdía 100% de las veces contra cazaLigero (6 unidades, 300cr) pese al bonus de contra, porque la fragata solo puede dañar a un blanco por disparo y su cadencia es lenta (850ms): el foco de fuego de varias naves baratas la mataba antes de compensar con su bonus de daño.
- Bombardero (3 unidades, 300cr) perdía 100% de las veces contra fragata (1 unidad, 320cr) por la misma razón inversa: bombardero tiene cadencia lenta (1300ms) y su bonus de 1.7x no alcanzaba a compensar la vida de la fragata (420hp).

Se subieron los multiplicadores hasta que el simulador confirmó el resultado pedido con margen cómodo (no un 51/49):

| Atacante → Objetivo | Multiplicador final | Resultado simulado (costo ≈ igual) |
|---|---|---|
| cazaLigero → bombardero | 1.6x | cazaLigero gana 100% |
| cazaLigero → captura | 2.5x | (sin cambios, ya funcionaba) |
| cazaPesado → cazaLigero | 1.5x | cazaPesado gana 100% |
| fragata → cazaLigero | **1.3x → 2.5x** | fragata gana 100% |
| fragata → cazaPesado | **1.3x → 2.2x** | fragata gana 100% |
| bombardero → fragata | **1.7x → 3.0x** | bombardero gana 83-86% |
| bombardero → base | 2.2x | (sin cambios) |
| bombardero → mina | 1.5x | (sin cambios) |

El simulador queda en el repo (`herramientas/simulador-balance.ts`) como herramienta reproducible para cualquier ajuste futuro de balance.

### El desbalance intencional del crucero (números exactos)

Por pedido explícito, el **Custodio** (crucero de la Coalición) es la única unidad deliberadamente desbalanceada hacia arriba. Números exactos:

| | Custodio (Coalición) | Devorador (Enjambre) | Ratio |
|---|---|---|---|
| Vida | 2400 | 1500 | 1.60x |
| Daño | 42 | 26 | 1.62x |
| Daño en área (radio) | 90px | 60px | 1.50x |
| Costo | 1500cr | 950cr | 1.58x |
| Tiempo de producción | 95s | 55s | 1.73x |
| Lanza cazas gratis | Sí (1 cada 18s, máx. 3 vivos) | No | — |

El costo y el tiempo de producción escalan *más* que la potencia cruda (1.58x–1.73x contra 1.6x–1.62x de poder), y encima el Custodio tiene daño en área más grande y lanzamiento gratuito de cazas — una ventaja que no está reflejada en el ratio de costo. Esto es intencional: en igualdad de inversión el Custodio gana con margen, y el "impuesto" extra de tiempo/costo es lo que lo mantiene *alcanzable pero caro*, no gratis.

El simulador confirma el punto de quiebre: el Custodio le gana con el 100% de las simulaciones a una fuerza de Rapaces (caza liviano Enjambre) de hasta **1.700cr** (1.13x su propio costo), pero **pierde** contra una fuerza de **2.000cr** (1.33x su costo). Es decir: cuesta significativamente más juntar el número de cazas necesario para derrotarlo que producir el propio Custodio — pero es posible, que es exactamente el diseño pedido ("se compensa solo con costo/tiempo alto", no con ser invencible). 1v1 contra el Devorador (su contraparte), el Custodio gana el 100% de las simulaciones.

### Economía y dificultad

- Única fuente de créditos: minas controladas (4cr/s cada una) + un goteo mínimo de 1cr/s (para no quedar completamente trabado sin minas).
- Créditos iniciales estándar: 300cr. La dificultad **solo** multiplica el inicial del jugador (Fácil ×3, Normal ×1, Difícil ×0.5); la IA siempre arranca con el estándar, sin importar la dificultad elegida — tal como se pidió.

## IA enemiga

- Se construyó contra un contrato explícito (`src/ia/interfazJuego.ts`, `ApiJuegoParaIA`) para poder delegarla en un subagente en paralelo mientras se construía el resto del motor: la IA no conoce Phaser ni clases concretas, solo habla con esa interfaz. El motor real la implementa en `src/ia/AdaptadorJuego.ts`.
- Máquina de estados con 3 fases (expansión → presión → ataque) que se recalculan dinámicamente cada 1.5s según poder de combate libre, minas propias y créditos — no son fases con temporizador fijo, se solapan y pueden revertirse (si el ataque falla y pierde tropas, vuelve a expansión/presión hasta juntar fuerza de nuevo).
- **Corrección post-entrega del subagente**: las unidades asignadas a una misión ofensiva (`idsEnAtaque`) solo se liberaban cuando morían. Si una misión se estancaba (por ejemplo, la mina objetivo se recapturaba o se destruía y las naves quedaban paradas sin más órdenes), esas naves quedaban "reservadas" para siempre y el ejército disponible de la IA se reducía con el tiempo. Se agregó un timeout de 25s: pasado ese tiempo sin resolución, la unidad se libera sola y vuelve al pool disponible. Sin este fix, partidas largas iban dejando a la IA cada vez más pasiva.
- Reacción específica al Custodio (documentada por el subagente, verificada): si el Custodio está en el mapa, la IA **enjambra** con concentración total de fuego si tiene ≥8 naves de combate libres, o **evita** el flanco donde está y golpea otra mina/objetivo si no. Si el Custodio todavía no salió pero detecta señales de que el jugador está ahorrando para uno (base nivel 3, créditos ≥70% del costo del crucero, pocas naves en el mapa), entra en modo **apurar**: baja su propio umbral de ataque para golpear antes de que el Custodio esté listo.

## Testing sin navegador disponible

El entorno de esta sesión no tenía la extensión de Chrome conectada, y la descarga de Chromium para Playwright resultó ~40KB/s (más de una hora para 178MB) — inviable dentro del alcance de la tarea. Ante esa limitación, la verificación se hizo con:

1. `npx tsc --noEmit` limpio en cada paso de integración.
2. `npm run build` (build de producción real) limpio.
3. Verificación de que el servidor de desarrollo sirve todos los módulos sin error 500 (`curl` contra cada archivo clave).
4. El simulador de balance headless (`herramientas/simulador-balance.ts`), que ejercita las fórmulas de combate reales.
5. Revisión adversarial manual del código: se rastrearon a mano los casos de clicks repetidos sobre botones deshabilitados, ciclos de captura/destrucción de minas, quedarse sin créditos, selección de unidades muertas, órdenes sobre objetivos inválidos, reinicio de partida (limpieza de la escena), y saltos grandes de `delta` tras pestaña en segundo plano (se clampea a 100ms por tick para evitar picos de daño/economía).

Esto da confianza razonable en la corrección del código, pero **no reemplaza una sesión de juego real**. Se recomienda como primer paso de cualquier sesión futura correr `npm run dev` y jugar al menos una partida completa en cada dificultad (ver `TAREAS.md`).
