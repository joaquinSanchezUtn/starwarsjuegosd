# Guerra de Fábricas

RTS 2D top-down de batallas espaciales: dos ejércitos fabricados en masa —**La Coalición**, tropas clonadas, contra **El Enjambre**, droides de combate— peleando con producción y economía, no con héroes. Capturá minas, financiá tu flota, subí el nivel de tu base y destruí la base enemiga antes de que la tuya caiga.

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
| Selección múltiple | Arrastrar un rectángulo con click izquierdo |
| Mover / atacar / capturar | Click derecho sobre el destino (suelo vacío = mover, nave o base enemiga = atacar, cualquier mina = capturar/recapturar) |
| Asignar grupo de control | Ctrl o Shift + número (1-9) con naves seleccionadas |
| Seleccionar grupo de control | Número (1-9) |
| Mover la cámara | WASD / flechas, o mouse contra el borde de la pantalla |
| Recentrar cámara | Click en el minimapa (abajo a la derecha) |
| Producir nave | Click en el botón correspondiente del panel inferior (se agranda/atenúa según si podés pagarla) |
| Subir nivel de base | Botón "Subir a nivel N" abajo a la izquierda |

Las naves atacan automáticamente a cualquier enemigo que entre en su alcance mientras se mueven o esperan órdenes, incluso mientras capturan una mina.

## El roster de naves

Cada nave tiene contraparte espejo del otro bando (mismo rol y stats, salvo el crucero — ver más abajo). Escala relativa: caza liviano/captura = 1×, caza pesado = 1.3×, bombardero = 1.5×, fragata = 3×, crucero = 5.5×.

### Nivel de base 1

| Rol | Coalición | Enjambre | Descripción |
|---|---|---|---|
| Caza liviano | **Vencejo** | **Rapaz** | Rápido y barato, el hostigador. Le gana a bombarderos y naves de captura; pierde contra el caza pesado. |
| Nave de captura | **Zarpa** | **Garra** | Sin armas. Captura minas al doble de velocidad que cualquier otra nave — la unidad de expansión. |

### Nivel de base 2

| Rol | Coalición | Enjambre | Descripción |
|---|---|---|---|
| Caza pesado | **Alabarda** | **Alacrán** | Más lento y caro que el liviano, mucha más vida y daño. Le gana al caza liviano. |
| Bombardero | **Yunque** | **Chacal** | Frágil contra cazas, pero devastador contra fragatas, bases y minas. Hay que escoltarlo. |
| Fragata | **Bastión** | **Espina** | El tanque de línea. Mucha vida, aguanta el frente mientras otros flanquean. Le gana a los cazas de frente. |

### Nivel de base 3

| Rol | Coalición | Enjambre | Descripción |
|---|---|---|---|
| Crucero | **Custodio** | **Devorador** | Nave capital con daño en área. El **Custodio** es, a propósito, la única unidad desbalanceada del juego: más vida, más daño y lanza cazas Vencejo gratis (hasta 3 a la vez) — pero cuesta 1500cr y casi 100 segundos de producción. Ver `DECISIONES.md` para los números exactos. |

### Bases

- **Ciudadela Orbital** (Coalición): estación angular blanca con anillo y protuberancias de torres.
- **Núcleo Colmena** (Enjambre): anillo sostenido por brazos radiales alrededor de una esfera central con un ojo rojo.

## Economía

La única fuente de créditos es controlar minas (más un pequeño goteo constante para no quedar nunca completamente trabado). Las minas arrancan neutrales: se capturan manteniendo una sola nave cerca durante unos segundos (la mitad si es una nave de captura). Una mina controlada puede ser destruida a tiros por el rival — vuelve a quedar neutral automáticamente después de un rato — o recapturada directamente parando una nave al lado.

## Dificultades

La dificultad **solo** cambia los créditos iniciales del jugador; la IA siempre arranca con la cantidad estándar, y el resto del juego (ingreso por mina, costos, comportamiento de la IA) es idéntico en las tres:

- **Fácil**: arrancás con 3× los créditos iniciales estándar.
- **Normal**: créditos iniciales estándar, igual que la IA.
- **Difícil**: arrancás con 0.5× los créditos iniciales estándar.

## Documentación del proyecto

- [`DECISIONES.md`](./DECISIONES.md) — decisiones de diseño tomadas de forma autónoma y su justificación, incluidos los números exactos del desbalance del crucero.
- [`TAREAS.md`](./TAREAS.md) — mejoras y bugs detectados que quedan fuera de esta etapa.
