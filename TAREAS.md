# Tareas pendientes / mejoras futuras

Cosas detectadas durante el desarrollo que quedan fuera de esta etapa, para revisar en una próxima iteración.

## Prioridad alta

- **Falta una sesión de juego real en navegador (persiste desde el prompt 1).** Ninguna de las dos vueltas de desarrollo tuvo la extensión de Chrome conectada en el entorno de la sesión. La verificación se hizo con `tsc`, `npm run build`, el simulador de combate headless y revisión manual/adversarial exhaustiva del código (incluida una ronda de QA dedicada en la segunda vuelta), pero nadie jugó una partida real todavía. Antes de dar el juego por terminado en la práctica, correr `npm install && npm run dev` y jugar al menos una partida completa en cada dificultad, prestando atención en particular a: sensación real del banking/sombras/parallax en movimiento, el "peso" de la muerte del crucero, si las naves nuevas se sienten distintas al jugarlas, y si el tier cazaPesado se siente tan marcado en la práctica como en el simulador (ver nota abajo).
- **Capturas de pantalla antes/después pendientes.** El prompt pidió capturas en `docs/` mostrando el salto visual del semi-3D; sin navegador disponible no se pudieron generar. Tomarlas en la primera sesión con navegador real disponible.

## Prioridad media

- **Sin pathfinding.** Las naves se mueven en línea recta hacia su destino/objetivo. No hay obstáculos sólidos en el mapa actual, así que no se traban, pero si en el futuro se agregan obstáculos (asteroides, estructuras neutrales, restos de crucero que ya son visuales pero no sólidos) van a necesitar evasión.
- **Sin punto de reunión (rally point) configurable.** Las naves recién producidas aparecen cerca de la base y quedan quietas ahí hasta recibir una orden manual.
- **Grupos de control sin indicador visual.** Los grupos 1-9 funcionan, pero el HUD no muestra qué números tienen un grupo asignado ni cuántas naves tiene cada uno.
- **El minimapa no soporta arrastrar.** Solo responde a click (recentra la cámara ahí); sería natural poder mantener presionado y arrastrar para paneo continuo.
- **Tier cazaPesado (Alabarda vs Alacrán) con punto de quiebre angosto.** Documentado en detalle en `DECISIONES.md`: a costo igual, cambios chicos en la cadencia de fuego del Alacrán (2-3%) invierten el resultado del enfrentamiento por completo. Se dejó en un estado que el simulador confirma como "no aplastante en ninguna corrida estable", pero es el par de unidades más frágil a futuros ajustes de balance — si se retocan Alabarda o Alacrán, correr `herramientas/simulador-balance.ts` antes y después.
- **Bono de vida por tecnología no es retroactivo.** El nivel de Casco/Escudos sube la vida máxima solo de las naves construidas *después* de comprarlo, no de la flota ya existente (decisión documentada en `DECISIONES.md` — aplicar retroactivamente es ambiguo con la barra de vida actual). Podría sorprender a un jugador que espera que sus naves en el mapa se pongan más tanque al instante; si en una sesión de juego real se siente mal, la alternativa es aplicar el multiplicador de vida de forma live igual que se hace con el daño.

## Prioridad baja

- ~~**Sin audio.**~~ Resuelto en el prompt 2: sonido procedural completo con Web Audio API (`src/sonido/`), sin archivos de audio.
- ~~**Selección por arrastre se mete en la franja del HUD.**~~ Resuelto en el prompt 2: el rectángulo visual se recorta contra el borde superior del HUD.
- ~~**Tecnología de producción del Enjambre con signo invertido.**~~ Encontrado por QA adversarial y resuelto en el prompt 2 (ver `DECISIONES.md`).
- ~~**Sesgo de orden en recolección de chatarra.**~~ Encontrado por QA adversarial y resuelto en el prompt 2 (ver `DECISIONES.md`).
- ~~**Disparo/destello de escudo/daño progresivo sin pooling.**~~ Encontrado por QA adversarial y resuelto en el prompt 2: los tres se migraron a emisores/pool compartidos, igual que la estela de motor.
- **Sin guardado ni reanudación de partida.** Cerrar la pestaña pierde el progreso.
- **Bundle sin code-splitting.** Creció de ~1.25MB a ~1.29MB gzip con el prompt 2 (más sistemas, más arte). Sigue sin ser urgente para un juego de una sola escena de partida, pero la tendencia es a seguir creciendo.
- **Torpedos siguen sin pooling.** Cada torpedo del bombardero es un `Container` propio, no reciclado. A diferencia de disparo/escudo/daño progresivo (ya arreglados), el volumen está acotado por la cadencia lenta del bombardero (1250-1300ms) y por ser un solo tipo de nave, así que se dejó afuera de esta ronda — si en el futuro se agregan más armas con proyectiles reales de cadencia alta, conviene poolearlos desde el principio.
- **Convención de arte `torretas`/`alas` no la usan todas las naves.** Son ganchos opcionales en `Nave.ts` (no-op si el dibujo de una nave no registra los datos): quedaron aplicados a fragata/destructor/crucero (torretas) y al Rapaz (alas plegables), pero cazaLigero/cazaPesado/bombardero/captura no las necesitan por diseño. Documentado acá para que quede claro que no es una omisión.

## Ideas para una futura vuelta de balance

- El simulador de combate (`herramientas/simulador-balance.ts`) es una aproximación agregada (nubes de unidades acercándose en línea recta, sin posiciones 2D reales ni terreno). Ahora modela escudos y costo por tanda de producción, pero sigue sin reemplazar partidas jugadas para sentir el ritmo real.
- No se testeó a fondo el balance de la **nave de captura** en combate directo (tiene 0 de daño). Sigue pendiente de la vuelta anterior.
- El **Estilete** está diseñado para perder contra enjambres de cazas livianos de su mismo costo (es un cazador de naves de apoyo, no un tanque de enjambres) — confirmar en partidas reales que esto se sienta como una decisión de diseño legible para el jugador y no como una nave "rota", ya que el simulador solo mide agregados y no la sensación de "gastar 260cr y perder siempre" si se usa mal.
- Considerar si vale la pena que la habilidad "andanada total" del Custodio también pueda golpear bases/minas dentro del cono, no solo naves — hoy está limitada a naves rivales por simplicidad de la primera implementación.
