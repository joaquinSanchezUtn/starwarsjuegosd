# Guerra de Fábricas

RTS 2D top-down de batallas espaciales semi-3D: dos ejércitos fabricados en masa —**La Coalición**, tropas clonadas con naves caras y resistentes, contra **El Enjambre**, droides baratos y rápidos de producir— peleando con producción y economía, no con héroes. Capturá minas (algunas rinden el doble), mejoralas, financiá tu flota, investigá tecnología, subí el nivel de tu base y destruí la base enemiga antes de que la tuya caiga.

Hecho con **Phaser 3 + TypeScript + Vite**.

## Cómo correr el juego

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://localhost:5173`) en el navegador. El juego arranca en el menú de selección de dificultad.

Otros comandos útiles:

```bash
npm run build     # build de producción (tsc + vite build) a dist/
npm run preview   # sirve el build de producción localmente
npx tsx herramientas/simulador-balance.ts   # simulador headless de combate, para validar cambios de balance
```

## Controles

| Acción | Control |
|---|---|
| Seleccionar una nave | Click izquierdo |
| Seleccionar una mina propia | Click izquierdo sobre la mina (muestra el panel de mejora en el HUD) |
| Selección múltiple | Arrastrar un rectángulo con click izquierdo |
| Mover / atacar / capturar | Click derecho sobre el destino (suelo vacío = mover, nave o base enemiga = atacar, cualquier mina = capturar/recapturar) |
| Asignar grupo de control | Ctrl o Shift + número (1-9) con naves seleccionadas |
| Seleccionar grupo de control | Número (1-9) |
| Mover la cámara | WASD / flechas, o mouse contra el borde de la pantalla |
| Recentrar cámara | Click en el minimapa (abajo a la derecha) |
| Producir nave | Click en el botón correspondiente del panel inferior (se agranda/atenúa según si podés pagarla) |
| Subir nivel de base | Botón "Subir a nivel N" abajo a la izquierda |
| Mejorar una mina propia | Seleccionarla y click en "Mejorar mina" (panel contextual, abajo a la izquierda) |
| Usar la habilidad del crucero | Seleccionar el crucero propio y click en el botón de habilidad (mismo panel contextual, con anillo de cooldown) |
| Comprar tecnología | Botones "Armamento" / "Casco-Escudos" arriba a la derecha |
| Silenciar/activar sonido | Botón arriba a la derecha, junto a los de tecnología |

Las naves atacan automáticamente a cualquier enemigo que entre en su alcance mientras se mueven o esperan órdenes, incluso mientras capturan una mina.

## El roster de naves

Escala relativa: caza liviano/captura = 1×, interceptor = 0.9×, caza pesado = 1.3×, bombardero = 1.5×, fragata = 3×, destructor = 4×, crucero = 5.5×.

La Coalición y el Enjambre **ya no son espejos**: los stats de cada tier son distintos aunque cumplan el mismo rol (ver `DECISIONES.md` para los números y las simulaciones detrás de cada elección). Filosofía general:

- **La Coalición es calidad**: naves más caras y de producción más lenta, con **escudo regenerativo** en toda su flota (se recarga solo después de 3 segundos sin recibir daño — se ve como una barra celeste separada, arriba de la barra de vida).
- **El Enjambre es cantidad**: naves más baratas y de producción más rápida, sin escudos. Su caza liviano sale en **tandas de 3 por orden**.

### Nivel de base 1

| Rol | Coalición | Enjambre | Descripción |
|---|---|---|---|
| Caza liviano | **Vencejo** (con escudo) | **Rapaz** (sale de a 3 por orden, más barato por nave) | El hostigador de cada bando. Le gana a bombarderos y naves de captura; pierde contra el caza pesado. |
| Nave de captura | **Zarpa** | **Garra** | Sin armas. Captura minas al doble de velocidad que cualquier otra nave — la unidad de expansión. |

### Nivel de base 2

| Rol | Coalición | Enjambre | Descripción |
|---|---|---|---|
| Caza pesado | **Alabarda** | **Alacrán** | Más lento y caro que el liviano, mucha más vida y daño. Le gana al caza liviano y al Estilete. |
| Interceptor de élite | **Estilete** (exclusivo Coalición) | — | El "as" de la Coalición: el más rápido del juego, carísimo para su tamaño, muy frágil, con bonus de daño contra caza pesado y bombardero. No está pensado para ganarle a un enjambre de cazas livianos del mismo costo — es un cazador de naves de apoyo, no un tanque. |
| Bombardero | **Yunque** | **Chacal** | Frágil contra cazas, pero devastador contra fragatas, bases y minas. Dispara un **torpedo real** (con tiempo de vuelo y guiado leve, interceptable si el blanco se aleja a tiempo), no un impacto instantáneo. Hay que escoltarlo. |
| Fragata | **Bastión** | **Espina** | El tanque de línea. Mucha vida y escudo (Bastión) o mucha vida (Espina), aguanta el frente mientras otros flanquean. Le gana a los cazas de frente. |

### Nivel de base 3

| Rol | Coalición | Enjambre | Descripción |
|---|---|---|---|
| Crucero | **Custodio** | **Devorador** | Nave capital con daño en área y una habilidad activa con cooldown (ver más abajo). El **Custodio** es, a propósito, la única unidad desbalanceada del juego: más vida, más escudo, más daño y lanza cazas Vencejo gratis desde su escotilla dorsal (hasta 3 a la vez) — pero cuesta 1500cr y casi 100 segundos de producción. Ver `DECISIONES.md` para los números exactos. |
| Destructor esquelético | — | **Guadaña** (exclusivo Enjambre) | Semi-capital más barata y rápida de construir que el Devorador, pega fuerte con daño en área chico, pero mucha menos vida por crédito invertido: "se rompe fácil". Le da al Enjambre una segunda opción de nave grande. |

### Habilidad activa de crucero (botón + cooldown en el HUD, con el crucero seleccionado)

- **Custodio — Andanada total**: descarga todas las baterías en un cono frontal de 110°, con más del triple de su daño normal por objetivo. Cooldown 30s.
- **Devorador — Enjambre de emergencia**: libera de golpe 5 cazas droide gratis de vida útil corta (20s), pensados para reforzar un combate en curso, no para guardarlos. Cooldown 35s.

### Bases

- **Ciudadela Orbital** (Coalición): estación angular blanca con anillo, protuberancias de torres y una escotilla de hangar visible en el dorso — el punto exacto desde donde el Custodio lanza sus cazas gratis.
- **Núcleo Colmena** (Enjambre): anillo sostenido por brazos radiales alrededor de una esfera central con un ojo rojo.

## Economía

- **Minas**: arrancan neutrales, se capturan manteniendo una sola nave cerca durante unos segundos (la mitad si es una nave de captura). Una mina controlada puede ser destruida a tiros por el rival —vuelve a quedar neutral automáticamente después de un rato— o recapturada directamente parando una nave al lado.
- **Minas ricas**: las del centro del mapa (más grandes, con un halo dorado) rinden el doble de ingreso — son las más disputadas.
- **Mejora de mina**: pagando créditos, una mina propia puede mejorarse una vez (+50% ingreso, +50% vida máxima). Si la destruyen, la mejora se pierde — invertir en una mina expuesta es una apuesta.
- **Tecnología**: árbol de 2 ramas × 2 niveles por bando, comprado desde el HUD con créditos. Armamento sube el daño de toda la flota; Casco/Escudos sube la vida máxima de las naves nuevas y, según el bando, la velocidad de regeneración de escudo (Coalición) o de producción (Enjambre).
- **Chatarra**: las naves grandes (fragata en adelante) dejan restos recolectables al morir. Cualquier nave —de cualquier bando, la que llegue primero— que pase cerca se los queda como créditos. Se desvanece sola si nadie la recoge.

## Sonido

Todos los efectos (láser, explosiones, escudo, captura, alerta de base, victoria/derrota) se generan por código con Web Audio API, sin archivos de audio. El láser suena distinto por bando: la Coalición más "cañón", el Enjambre más eléctrico/chirriante. Botón de mute arriba a la derecha.

## Dificultades

La dificultad **solo** cambia los créditos iniciales del jugador; la IA siempre arranca con la cantidad estándar, y el resto del juego (ingreso por mina, costos, comportamiento de la IA) es idéntico en las tres:

- **Fácil**: arrancás con 3× los créditos iniciales estándar.
- **Normal**: créditos iniciales estándar, igual que la IA.
- **Difícil**: arrancás con 0.5× los créditos iniciales estándar.

## Documentación del proyecto

- [`DECISIONES.md`](./DECISIONES.md) — decisiones de diseño tomadas de forma autónoma y su justificación, incluidos los números exactos del desbalance del crucero, la asimetría de bandos y las técnicas de semi-3D elegidas.
- [`TAREAS.md`](./TAREAS.md) — mejoras y bugs detectados que quedan fuera de esta etapa.
