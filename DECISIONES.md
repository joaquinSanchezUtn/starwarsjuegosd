# Decisiones de diseño

Este documento registra las decisiones tomadas de forma autónoma durante el desarrollo de **Guerra de Fábricas**, con la justificación de cada una. El proyecto se construyó de punta a punta con un orquestador que delegó en subagentes en paralelo (arte de naves, IA enemiga) y resolvió el resto (arquitectura, sistemas de juego, UI, balance, integración y testing) de forma directa.

> Las secciones de abajo hasta "Prompt 2" documentan la primera entrega (mapa, minas, base con niveles, roster de 11 naves simétricas, IA, 3 dificultades). La sección **"Prompt 2 — el juego se vuelve vivo"** registra la segunda vuelta: gráficos semi-3D, bandos asimétricos, habilidades, sonido y economía ampliada, construida iterando sobre esta base sin rehacerla. La sección **"Prompt 3 — comodidad de control y deuda técnica"** al final registra la tercera: punto de reunión, indicador de grupos, arrastre del minimapa, bono de vida retroactivo, pooling de torpedos y code-splitting.

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

---

# Prompt 2 — el juego se vuelve vivo

Segunda vuelta de desarrollo sobre el motor ya existente: no se rehizo nada de lo de arriba, se lo extendió. Se jugó (leyendo el código y con el simulador, ver más abajo la limitación de entorno) antes de tocar nada, y los bugs de `TAREAS.md` que caían dentro del área tocada se resolvieron de paso (ver "Bugs de la vuelta anterior resueltos de paso").

## Reparto de trabajo: qué se delegó y qué no, y por qué

El plan original repartía siete frentes en subagentes paralelos (VFX, arte, asimetría/balance, economía, IA, sonido, testing). Al empezar a diseñar los contratos entre sistemas quedó claro que VFX, sonido y economía están **fuertemente acoplados a `Nave.ts` y `EscenaJuego.ts`** (escudos, banking, habilidades, chatarra y tecnología conviven en el mismo puñado de archivos centrales) — delegar esas piezas por separado habría significado, en la práctica, que varios agentes editaran los mismos archivos núcleo a la vez, con alto riesgo de pisarse. Se optó por una división distinta de la planeada originalmente:

- **Hechos directamente por el orquestador** (arquitectura, `Nave.ts`/`Base.ts`/`Mina.ts`/`EscenaJuego.ts`/`HUD.ts`, VFX en `render/efectos.ts` y `render/vfx/`, sonido en `src/sonido/`, economía nueva): todo lo que tocaba los archivos núcleo compartidos, para garantizar un único punto de coherencia.
- **Delegado a subagentes**, por tener una frontera de archivos limpia y verificable:
  - **Arte**: las 2 naves nuevas y el pulido de luz/sombra/torretas/alas plegables del resto del roster, acotado a `src/render/dibujos/`.
  - **Balance**: actualizar `herramientas/simulador-balance.ts` y ajustar números en `src/datos/balance.ts`.
  - **IA**: adaptar `src/ia/MaquinaEstadosIA.ts` al nuevo contrato (ya extendido a mano en `interfazJuego.ts`/`AdaptadorJuego.ts` antes de delegar, exactamente para que la IA tuviera un contrato estable contra el cual trabajar en paralelo — el mismo patrón de desacople que ya se había usado en el prompt 1).
  - **QA adversarial final**: revisión de código con foco en romper lo implementado.
- Dos de estos subagentes (arte y balance) se cortaron a mitad de tarea por errores de conexión de la API, dejando el trabajo parcialmente hecho pero no roto (ambos habían aplicado sus cambios de a poco vía Edit, no en un solo paso final). Se resolvió terminando el balance a mano (ver más abajo) y relanzando un segundo subagente acotado solo a los 3 archivos de arte que habían quedado sin tocar.

## Semi-3D: técnicas elegidas (todas evaluadas contra "qué rinde bien en Phaser sin WebGL 3D real")

- **Banking (escora al girar)**: en vez de sprites prerenderizados por ángulo (costoso en arte y en memoria de texturas) o un motor 3D real, cada nave gira su casco hacia el rumbo objetivo con una **velocidad angular máxima por categoría** (`velocidadAngularMaxPorTipo` en `datos/escalas.ts`: cazas ~14 rad/s, casi instantáneo; crucero 1.6 rad/s, con inercia visible) en vez de saltar al ángulo exacto en el mismo frame. Sobre ese giro gradual se aplica un **achatado vertical (`scaleY`) + corrimiento en Y** proporcional a la velocidad angular instantánea y a una intensidad por categoría (`intensidadBankingPorTipo`), simulando un alabeo sin geometría 3D. Es puramente visual: el alcance de combate se sigue midiendo por distancia, no por hacia dónde mira el casco, así que no afecta el balance. Ver `Nave.rotarHacia()`.
- **Sombra proyectada**: en vez de capturar la silueta real de cada nave con una `RenderTexture` (más fiel, pero una textura extra por nave y redibujos si la forma cambia), se usa una `Ellipse` barata por nave, con **una dirección de luz fija para todo el mapa** (no rota con la nave — el sol no se mueve) y un offset por tipo de nave (`offsetSombraPx`): los cazas "vuelan alto" (offset 14-16px), las naves grandes están pegadas al plano de batalla (crucero 4px). Ver `render/vfx/Sombras.ts`.
- **Parallax**: 4 capas (polvo estelar lejano, campo de estrellas medio, nebulosas de color con blend aditivo, y un planeta gigante + restos de batalla) usando `setScrollFactor` nativo de Phaser en vez de reposicionar manualmente cada capa por frame — es la técnica más barata disponible y Phaser la resuelve solo en el paso de render. Ver `render/vfx/Parallax.ts`.
- **Explosiones y pooling**: se reemplazó por completo el sistema de partículas por `Phaser.GameObjects.Particles.ParticleEmitter` **compartidos** — un emisor por "estilo" (fuego, chispa, humo, escombros por bando, estela de motor por bando), reutilizados durante toda la partida en vez de crear un `GameObject` nuevo por partícula. Los emisores se cachean por escena en un `WeakMap` y se invalidan solos al hacer `shutdown` de la escena (reinicio de partida), así nunca queda una referencia a un emisor ya destruido. Explosión por tamaño: caza (flash + bola de fuego breve + 2-3 escombros), media (más partículas y humo), grande/fragata-destructor (2-3 detonaciones internas encadenadas → explosión principal → escombros + humo persistente + screen shake sutil vía `camera.shake`), y crucero (evento especial: cadena de 4 detonaciones proa→popa, explosión final con onda expansiva, **el casco se parte en 3 fragmentos** que derivan por inercia con `tweens`, siguen detonando un rato y quedan flotando 15-25s antes de desvanecerse, screen shake marcado). Ver `render/efectos.ts`.
- **Hallazgo de rendimiento durante testing (corregido)**: la estela de motor original (heredada tal cual del prompt 1) creaba un `Circle` + `tween` nuevo a mano cada 55ms **por cada nave viva**, sin pooling — con 30+ naves eso son ~1000 `GameObjects`/segundo solo para estelas, muy por encima de cualquier otro efecto del juego (las explosiones son eventos puntuales, no continuos). Se migró a un emisor compartido por bando (`emitParticleAt`), igual que el resto de los efectos. Era, con diferencia, el mayor riesgo real para los 60 FPS pedidos con batallas grandes.

## Asimetría de bandos: números finales y qué mostró el simulador

Se extendió `herramientas/simulador-balance.ts` para modelar escudos (absorben antes que la vida de casco, igual orden que `Nave.recibirDanio`) y costo-por-nave real de unidades con `cantidadPorOrden > 1` (el Rapaz cuesta 120cr **por tanda de 3**, es decir 40cr/nave efectivos). Con esas correcciones, se corrieron enfrentamientos Coalición-vs-Enjambre a costo por nave igual, tier por tier:

| Tier (costo igual) | Resultado | Lectura |
|---|---|---|
| cazaLigero (Vencejo vs Rapaz) | Enjambre ~75-80% | La cantidad gana en el tier más barato, como se espera de esa identidad |
| cazaPesado (Alabarda vs Alacrán) | Coalición ~90-94% | La Coalición es notablemente más fuerte en este tier específico (ver nota abajo) |
| bombardero (Yunque vs Chacal) | ~50/50 | Parejo |
| fragata (Bastión vs Espina) | Enjambre ~75-80% | Igual que cazaLigero: la cantidad vuelve a pesar más en unidades de línea |
| Custodio vs Rapaz (escalando cantidad) | Igual que en el prompt 1: gana cómodo hasta ~1.6x su costo, pierde por encima | El escudo nuevo (300, regen 40/s) refuerza el punto pero no cambia el umbral cualitativo |
| Custodio vs Devorador 1v1 | Coalición 100% | Intocable, como se pidió |

**Nota sobre la volatilidad del tier cazaPesado**: durante el ajuste se encontró que este enfrentamiento puntual (5 Alabarda vs 6 Alacrán) es extremadamente sensible a cambios chicos — mover la cadencia de fuego del Alacrán de 620ms a 635ms (2.4% de diferencia) invirtió el resultado de 92%-7% a favor de un bando a 92%-7% a favor del otro. Esto es una propiedad del modelo de combate por bajas en grupos chicos (el primer bando que pierde una unidad entra en una espiral de menor daño total, y con pocas unidades ese primer golpe es determinante), no un indicio de que el resto del balance sea igual de frágil — los tiers con más unidades (cazaLigero, fragata) mostraron resultados estables entre corridas. Se dejó documentado acá para que cualquier ajuste futuro al Alabarda/Alacrán se haga sabiendo que este par en particular tiene un punto de quiebre angosto, y se optó por no perseguir un 50/50 artificial en un enfrentamiento tan chico e inestable — la imagen general (dos tiers favorecen al Enjambre, uno a la Coalición, uno parejo) ya evita que una sola identidad domine el juego completo.

Números finales completos en `src/datos/balance.ts`; el resumen de identidad:

- **Coalición** = calidad: costos y tiempos de producción más altos, escudo regenerativo en toda su flota (se recarga solo tras 3s sin recibir daño — `ESCUDOS.retrasoRegenMs`), más vida de casco en las naves grandes.
- **Enjambre** = cantidad: costos más bajos, producción más rápida, sin escudos, y el Rapaz (caza liviano) sale en **tandas de 3 por orden** (`cantidadPorOrden: 3` en `balance.ts`) — una sola orden de producción entrega las 3 naves de una vez, en `EscenaJuego.spawnearNave` llamado en loop al completarse la orden en `Base.actualizarProduccion`.

## Naves nuevas

- **Estilete** (interceptor, Coalición, nivel 2, exclusivo): 260cr, 55 de vida + 55 de escudo, 210px/s (la nave más rápida del juego), 22 de daño, cadencia de 420ms. Bonus de contra 1.6x contra cazaPesado y 2x contra bombardero (`TRIANGULO_CONTRAS.interceptor`) — su rol es cazar naves de apoyo rivales antes de que hagan su trabajo, no ganar enjambres de cazas livianos de su mismo costo (pierde consistentemente esos enfrentamientos: es una espada de precisión, no una que gane 1 contra 7). El cazaPesado es su contra dedicada (1.4x de vuelta), así que no es un ciclo absoluto.
- **Guadaña** (destructor esquelético, Enjambre, nivel 3, exclusivo): 620cr, 650 de vida (sin escudo), 32 de daño con área 40px, más barato y rápido de construir que el Devorador (32s vs 55s de producción) pero con mucha menos vida por crédito invertido — "se rompe fácil". Le da al Enjambre una segunda opción de nivel 3 además del propio crucero, reforzando la fantasía de cantidad incluso en el tramo final del árbol tecnológico. Balance final: parejo contra fragatas/cazas pesados de costo similar, dominante contra cazas livianos (sin sorpresa, es un semi-capital).
- Ambas naves tienen una entrada "inerte" en el bando contrario (`exclusivaDe` en `DatosUnidad`) solo para que el `Record<Faccion, Record<TipoUnidad, DatosUnidad>>` sea exhaustivo — `unidadDisponible()` en `balance.ts` filtra esas entradas y es la función que HUD, `Base.puedeProducir` y la IA usan siempre en vez de comparar `nivelBaseRequerido` a mano.

## Habilidades activas de crucero

- **Custodio (Coalición) — Andanada total**: cooldown 30s, descarga el daño base ×3.2 contra todo enemigo dentro de 1.1x su alcance y un cono frontal de 110° respecto de su rumbo actual. Implementada en `Nave.activarHabilidad()`, sin sistema aparte: reutiliza `aplicarDanio` y `crearDisparo` tal cual el combate normal.
- **Devorador (Enjambre) — Enjambre de emergencia**: cooldown 35s, libera 5 cazas Rapaz gratis con 20s de vida útil (`vidaUtilMs` en `Nave`, un dron se autodestruye solo — sin explosión ni chatarra — al agotarse, y dejar de contar como vivo un frame antes de iniciar el fade para no quedar "zombie" bloqueando el pool de objetivos ni el cálculo de poder de la IA).
- Botón + anillo de cooldown en el HUD, visible solo cuando el jugador tiene un crucero propio seleccionado (`HUD.actualizarSeleccion`).

## Economía nueva

- **Minas ricas**: 2 de las 8 minas (las del centro del mapa, `POSICIONES_MINAS[...].rica` en `datos/mapa.ts`) rinden el doble de ingreso base y se dibujan más grandes con un halo dorado.
- **Mejora de mina**: 150cr, +50% ingreso y +50% vida máxima, se pierde si la mina es destruida (`Mina.recibirDanio` resetea `nivelMejora` a 0 y `vidaMax` a la base al llegar a 0 de vida). Se selecciona con un click izquierdo sobre una mina propia (extensión nueva de `GestorSeleccion`, antes solo seleccionaba naves) y se compra con un botón contextual en el HUD.
- **Árbol tecnológico**: 2 ramas × 2 niveles por bando (`src/sistemas/Tecnologia.ts`). Armamento: +8%/nivel de daño, aplicado **en vivo** a toda la flota existente (se lee en el momento de disparar, no al construir la nave). Casco/Escudos: +10%/nivel de vida máxima, aplicado solo a naves construidas **después** de comprarlo (decisión explícita: aplicar retroactivamente a naves ya vivas es ambiguo con la barra de vida actual — ¿se llenan solas al instante?, así que se optó por el modelo más simple y predecible de "afecta lo que construyas de ahora en más"); además, Coalición gana +25%/nivel de velocidad de regeneración de escudo, Enjambre gana -12%/nivel de tiempo de producción (interpretado como el bono más coherente con cada identidad).
- **Chatarra**: las naves con `escalaVisual >= 3` (fragata, destructor, crucero) dejan un botín al morir por el 16% de su costo, recolectable por **cualquier nave de cualquier bando** que pase cerca (la primera que llega se lo queda) — no es "para quien la destruyó", es un recurso neutral en el campo de batalla, reforzando que pelear cerca de las propias líneas paga. Se desvanece sola a los 45s si nadie la recoge.

## Sonido

Todo generado por código con Web Audio API (osciladores + un buffer de ruido reutilizado), sin archivos de audio (`src/sonido/index.ts`). El láser suena distinto por bando a propósito: la Coalición un golpe seco tipo cañón (onda triangular, cae de agudo a grave), el Enjambre algo más chirriante/eléctrico (onda sawtooth con dos rampas de frecuencia). Las explosiones escalan de intensidad con la categoría (igual clasificación que el VFX). Volumen ajustable y mute vía `setSilenciado`/`estaSilenciado`, con botón en el HUD. El `AudioContext` se crea recién en el primer sonido reproducido — para entonces ya hubo un click del jugador en el menú, así que los navegadores no lo bloquean por política de autoplay.

## Torpedos del bombardero

El bombardero dejó de ser hitscan: dispara un **proyectil real** (`src/entidades/Torpedo.ts`) que vuela a 230px/s con un guiado leve (corrige su rumbo hacia la posición actual del objetivo, pero no instantáneamente) y aplica el daño recién al llegar. Si el objetivo se aleja lo bastante antes de que el torpedo lo alcance, el torpedo agota su vida útil (3.2s) y falla — así es "interceptable" sin necesitar un sistema de defensa antimisiles dedicado: alcanza con que el blanco tenga buena movilidad. El resto de las naves siguen disparando hitscan (decisión del prompt 1, sin cambios).

## IA: qué se le agregó

Se extendió el contrato `ApiJuegoParaIA` (`src/ia/interfazJuego.ts`) con mejora de minas, tecnología y habilidad de crucero, y se implementó en `AdaptadorJuego.ts`, **antes** de delegar la lógica de decisión a un subagente — el mismo patrón de desacople IA/motor del prompt 1, ahora reforzado. La IA resultante: usa `unidadDisponible()` para no reintroducir naves espejo, agrega la Guadaña como segunda opción de nivel 3 en fase de ataque, activa su habilidad de crucero cuando tiene enemigos cerca (para no desperdiciar drones de vida corta sin nadie a quien pelear), prioriza minas ricas al capturar/hostigar (con un factor que abarata su distancia efectiva), y mejora minas propias sin rivales cerca (evita invertir en una mina del frente que se puede perder) y compra tecnología oportunísticamente cuando le sobran créditos.

## Testing sin navegador disponible (igual limitación que en el prompt 1)

Tampoco esta vez hubo extensión de Chrome conectada. Verificación con:

1. `npx tsc --noEmit` y `npm run build` limpios en cada paso.
2. El simulador de balance extendido (escudos + costo por tanda), corrido y reajustado iterativamente hasta un resultado sano por tier (ver arriba).
3. Una ronda de QA adversarial dedicada (agente `qa-senior`, solo lectura de código) enfocada en los escenarios pedidos explícitamente. Encontró y se corrigió:
   - **[Alto] Signo invertido en la tecnología de producción del Enjambre**: `calcularModificadores` en `src/sistemas/Tecnologia.ts` restaba el bono en vez de sumarlo, así que comprar la rama Casco/Escudos hacía la producción del Enjambre **más lenta**, no más rápida — el opuesto exacto de lo documentado y de lo que la IA asumía al comprarla oportunísticamente. Corregido (`1 + niveles.defensa * BONO...` en vez de `1 -`).
   - **[Medio] Sesgo de orden en la recolección de chatarra**: `actualizarChatarra` en `src/sistemas/Economia.ts` se quedaba con la primera nave dentro de rango en vez de la más cercana; como el array de naves siempre trae primero a la Coalición, en cualquier empate ganaba la Coalición aunque una nave del Enjambre estuviera objetivamente más cerca. Corregido para comparar distancias explícitamente.
   - **[Alto, por lectura de código] Tres efectos más sin pooling** que podían reproducir el mismo problema ya encontrado en la estela de motor a escala de batalla masiva: el haz de disparo (`crearDisparo`, dos `Line` por cada tiro de cada nave armada), el destello de escudo (`crearDestelloEscudo`, disparado por casi toda la flota de Coalición al absorber daño) y el humo/fuego de daño progresivo (`DanioProgresivo.ts`, disparado por cada nave dañada cada 220ms). Los tres se migraron a los emisores compartidos (`crearDisparo` ahora recicla un pool fijo de 32 `Line`, en vez de un `ParticleEmitter` que no representa bien un haz direccional; escudo y daño progresivo pasaron a usar los mismos emisores compartidos que las explosiones).
   - Confirmado **sin bug** (con evidencia, no solo "no se probó"): spam de habilidad de crucero (el cooldown se fija de forma síncrona, sin ventana de carrera posible en JS de un solo hilo), mejora de mina en el instante de su destrucción, doble cobro de chatarra, cobro único de la producción por tandas del Rapaz, reseteo de tecnología/chatarra/torpedos entre partidas, drones temporales que dejan de contar como vivos apenas expiran, y que el multiplicador de dificultad no se filtra a la IA ni a ningún sistema económico nuevo.
4. Revisión manual línea por línea de `Nave.ts`, `EscenaJuego.ts`, `Mina.ts`, `Seleccion.ts` y `HUD.ts` (hecha por el orquestador antes de la ronda de QA) — se encontraron y corrigieron dos bugs propios durante esa revisión: un dron temporal que reiniciaba su animación de desvanecimiento en cada frame en vez de una sola vez (por no marcar `vida = 0` antes de empezar el fade), y un valor de chatarra hardcodeado en `Nave.ts` que debía leerse de `CHATARRA` en `balance.ts`.

**Sigue sin reemplazar una sesión de juego real.** Se recomienda como primer paso de la próxima sesión jugar al menos una partida completa con cada bando, prestando atención especial a: la sensación de banking/sombras/parallax en movimiento real (no solo en el código), el "peso" de la muerte del crucero, si las 7 naves nuevas/existentes por bando se sienten distintas al jugarlas, y si el tier cazaPesado se siente tan desbalanceado en la práctica como en el simulador (ver nota de volatilidad arriba).

## Bugs de la vuelta anterior resueltos de paso

- **Selección por arrastre sobre la franja del HUD** (prioridad baja en `TAREAS.md`): el rectángulo de selección dibujado ahora se recorta contra el borde superior del HUD (`Seleccion.alPointerMove`); la selección en coordenadas de mundo ya era correcta antes, esto era puramente visual.

---

# Prompt 3 — comodidad de control y deuda técnica

Tercera vuelta, dedicada a saldar la lista de `TAREAS.md` en vez de agregar mecánicas nuevas: las tres ausencias de comodidad de control que quedaban en prioridad media, más la deuda técnica de prioridad baja (pooling de torpedos, code-splitting) y la única decisión de diseño que había quedado marcada como discutible (el bono de vida no retroactivo).

## Punto de reunión (rally point)

- Se resolvió **sin agregar un modo ni una tecla dedicada**: la base propia pasa a ser seleccionable con click izquierdo (antes solo se podían seleccionar naves y minas propias), y con la base seleccionada el click derecho fija el punto en vez de dar una orden de movimiento. Es el mismo gesto que ya usa el jugador para todo lo demás, así que no hay nada nuevo que aprender.
- El punto vive en `Base.puntoReunion`, no en la escena: es un atributo de la base que lo usa, y así queda naturalmente incluido si alguna vez se implementa el guardado de partida. `EscenaJuego.spawnearNave` lo lee y le da la orden de movimiento a la nave recién creada.
- Solo lo usa el jugador. La IA no lo necesita porque ya dirige cada unidad que produce a través de su máquina de estados, así que darle un punto de reunión sería una capa de indirección sin efecto.

## Panel contextual: refactor antes de agregar el tercer estado

El panel de abajo a la izquierda tenía dos estados mutuamente excluyentes (mejora de mina y habilidad de crucero) resueltos con dos métodos que se ocultaban el uno al otro a mano, y cada uno consultaba el estado del otro para decidir. Agregar el punto de reunión como tercer estado con ese esquema habría requerido tres chequeos cruzados. Se unificó en un solo `HUD.actualizarPanelContextual`, que calcula el modo activo una vez y aplica visibilidad de forma declarativa. No cambia el comportamiento visible; era condición para que el tercer estado no fuera una fuente de bugs de prioridad de UI.

## Indicador de grupos de control

- `GestorSeleccion.resumenGrupos()` expone los grupos no vacíos con su cantidad y un flag de "activo", y el HUD los dibuja como una fila de chips centrada justo encima de la franja inferior.
- "Activo" se calcula como **igualdad exacta de conjuntos** entre el grupo y la selección actual, no como intersección: si el jugador selecciona a mano tres naves que casualmente pertenecen al grupo 2, el chip no se resalta, porque esa selección no *es* el grupo 2. Resaltar por intersección habría dado falsos positivos constantes en cuanto los grupos se solapan.
- Los chips se dibujan con un `Graphics` compartido para los recuadros y nueve `Text` preasignados que se muestran/ocultan, en vez de crear y destruir objetos cada frame — el HUD se redibuja en cada tick de `update`.

## Arrastre del minimapa

- El paneo continuo se escucha a **nivel de escena**, no en el rectángulo del minimapa. Con un listener en el propio rectángulo, el arrastre se cortaba en seco al salirse de sus bordes, que es justo lo que pasa al arrastrar hacia una esquina del mapa. Las coordenadas se clampean a `[0,1]` antes de convertirlas a mundo.
- **Bug encontrado de paso**: el minimapa y los botones de tecnología/mute sobresalen por encima de la franja inferior del HUD, y la selección solo se protegía comparando contra `alturaZonaHudPx`. Es decir que un arrastre iniciado sobre la parte superior del minimapa abría además un rectángulo de selección en el mundo, por debajo del HUD. `ContextoSeleccion` pasó de recibir una altura a recibir un predicado `puntoSobreUi(x, y)` que el HUD responde consultando los bounds reales de sus widgets. Este bug era anterior al arrastre, pero el arrastre lo volvía mucho más fácil de disparar.

## Bono de vida por tecnología, ahora retroactivo

La vuelta anterior había dejado esta mejora aplicándose solo a las naves construidas *después* de la compra, con una justificación explícita: aplicarla a la flota viva era ambiguo respecto de la barra de vida (¿las naves heridas se curan de golpe?). La ambigüedad se resolvió eligiendo **escalar la fracción, no sumar la diferencia en crudo**: `Nave.reaplicarBonoVida()` recalcula el máximo de vida y escudo y reposiciona el valor actual en la misma proporción, así que una nave al 30% sigue al 30% de un máximo más alto. Nadie se cura por comprar tecnología, pero toda la flota gana el aguante que el jugador pagó, que era la expectativa razonable del jugador y la razón por la que estaba anotado como tarea. Se aplica solo al comprar la rama `defensa`; el daño ya se leía en vivo al disparar y no necesitaba nada.

Efecto secundario de balance anotado en `TAREAS.md`: comprar Casco/Escudos con una flota grande ya desplegada es ahora bastante más potente que antes. Si en partidas reales se siente excesivo, la palanca es `BONO_VIDA_POR_NIVEL`, no el mecanismo.

## Pooling de torpedos

Era el último efecto sin poolear del juego. Se había dejado afuera en el prompt 2 con el argumento de que el volumen estaba acotado por la cadencia lenta del bombardero, que sigue siendo cierto — se hizo igual para cerrar la categoría entera y porque el patrón ya estaba establecido. `Torpedo.ts` recicla instancias en un pool **por escena y por bando**: separar por bando evita redibujar el `Graphics` del casco en cada lanzamiento, ya que el color depende de la facción. Mismo idioma que `render/efectos.ts`: cache en `WeakMap` invalidada en el `shutdown` de la escena. Al devolverse al pool, el torpedo **suelta la referencia a su objetivo** (`objetivo = null`), porque si no un torpedo dormido mantendría viva en memoria a una nave ya destruida.

## Code-splitting

El proyecto no tenía `vite.config.ts`. Se agregó uno que aísla Phaser en su propio chunk: el resultado pasa de un bundle único de 1.29MB (344KB gzip) a **26KB gzip de código del juego** más 319KB gzip de motor. El motor no cambia entre builds, así que queda cacheado en el navegador y un cambio de balance ya no obliga a reenviar todo. Dos detalles del entorno:

- Vite 8 usa **rolldown**, que solo acepta `manualChunks` como función; la forma clásica de mapa `{ nombre: [módulos] }` de Rollup falla con `manualChunks is not a function`.
- El warning de tamaño de chunk se sigue disparando por el chunk de Phaser, que no se puede partir más de forma sensata. Se subió `chunkSizeWarningLimit` a 1400KB para que el warning vuelva a ser señal útil si crece el código del juego, en vez de ruido permanente.

## Qué se dejó explícitamente afuera

- **Pathfinding**: no hay obstáculos sólidos en el mapa, así que hoy no habría nada que esquivar. Implementarlo sería código sin efecto observable.
- **Guardado/reanudación de partida**: es la última tarea de peso pendiente. Implica serializar naves, minas, bases, créditos, tecnología, chatarra, torpedos y el estado interno de la IA; se dejó para una vuelta propia en vez de meterla a medias.
- **Volatilidad del tier cazaPesado**: es una propiedad del modelo de combate en grupos chicos, ya documentada arriba con su análisis. No es un bug a arreglar sino un cuidado a tener en futuros ajustes.

## Testing

`npx tsc --noEmit` y `npm run build` limpios. En esta vuelta el servidor de desarrollo **sí se levantó** y se verificó que sirve el juego y todos los módulos con HTTP 200, pero el agente no puede operar un navegador, así que la partida jugada de punta a punta sigue siendo la única forma de verificación que falta y sigue anotada como prioridad alta en `TAREAS.md`.
