# Tareas pendientes / mejoras futuras

Cosas detectadas durante el desarrollo que quedan fuera de esta etapa, para revisar en una próxima iteración.

## Prioridad alta

- **Falta jugar una partida real completa (persiste desde el prompt 1).** En la tercera vuelta el servidor de desarrollo por fin se levantó y se sirvió el juego en `http://localhost:5173/`, con todos los módulos respondiendo 200, pero el agente sigue sin poder operar un navegador: nadie jugó todavía una partida de punta a punta. La verificación acumulada es `tsc`, `npm run build`, el simulador de combate headless y varias rondas de revisión adversarial de código. Antes de dar el juego por terminado, jugar al menos una partida completa en cada dificultad prestando atención en particular a: sensación real del banking/sombras/parallax en movimiento, el "peso" de la muerte del crucero, si las naves nuevas se sienten distintas al jugarlas, y si el tier cazaPesado se siente tan marcado en la práctica como en el simulador (ver nota abajo).
- **Capturas de pantalla antes/después pendientes.** El prompt pidió capturas en `docs/` mostrando el salto visual del semi-3D; sin navegador operable no se pudieron generar. Tomarlas en la primera sesión con navegador real disponible.

## Prioridad media

- **Sin pathfinding.** Las naves se mueven en línea recta hacia su destino/objetivo. No hay obstáculos sólidos en el mapa actual, así que no se traban, pero si en el futuro se agregan obstáculos (asteroides, estructuras neutrales, restos de crucero que ya son visuales pero no sólidos) van a necesitar evasión. Se dejó afuera a propósito: hoy no habría nada que esquivar.
- **Tier cazaPesado (Alabarda vs Alacrán) con punto de quiebre angosto.** Documentado en detalle en `DECISIONES.md`: a costo igual, cambios chicos en la cadencia de fuego del Alacrán (2-3%) invierten el resultado del enfrentamiento por completo. Se dejó en un estado que el simulador confirma como "no aplastante en ninguna corrida estable", pero es el par de unidades más frágil a futuros ajustes de balance — si se retocan Alabarda o Alacrán, correr `herramientas/simulador-balance.ts` antes y después.
- ~~**Sin punto de reunión (rally point) configurable.**~~ Resuelto en el prompt 3: seleccionar la base propia y hacer click derecho fija el punto; las naves nuevas salen hacia ahí.
- ~~**Grupos de control sin indicador visual.**~~ Resuelto en el prompt 3: fila de chips "N:cantidad" sobre la franja del HUD, con el grupo activo resaltado.
- ~~**El minimapa no soporta arrastrar.**~~ Resuelto en el prompt 3: paneo continuo manteniendo presionado, y sigue funcionando aunque el puntero se salga del minimapa.
- ~~**Bono de vida por tecnología no es retroactivo.**~~ Resuelto en el prompt 3: al comprar la rama de Casco/Escudos se reaplica a la flota viva conservando la fracción de vida (ver `DECISIONES.md`).

## Prioridad baja

- **Sin guardado ni reanudación de partida.** Cerrar la pestaña pierde el progreso. Es la última tarea de peso que queda pendiente: implica serializar naves, minas, bases, créditos, tecnología, chatarra, torpedos y el estado interno de la IA, así que se dejó para una vuelta propia en vez de meterla a medias.
- **Convención de arte `torretas`/`alas` no la usan todas las naves.** Son ganchos opcionales en `Nave.ts` (no-op si el dibujo de una nave no registra los datos): quedaron aplicados a fragata/destructor/crucero (torretas) y al Rapaz (alas plegables), pero cazaLigero/cazaPesado/bombardero/captura no las necesitan por diseño. Documentado acá para que quede claro que no es una omisión.
- ~~**Sin audio.**~~ Resuelto en el prompt 2: sonido procedural completo con Web Audio API (`src/sonido/`), sin archivos de audio.
- ~~**Selección por arrastre se mete en la franja del HUD.**~~ Resuelto en el prompt 2 (recorte visual) y completado en el prompt 3, que además impide iniciar la selección sobre el minimapa y los botones de tecnología/mute.
- ~~**Tecnología de producción del Enjambre con signo invertido.**~~ Encontrado por QA adversarial y resuelto en el prompt 2 (ver `DECISIONES.md`).
- ~~**Sesgo de orden en recolección de chatarra.**~~ Encontrado por QA adversarial y resuelto en el prompt 2 (ver `DECISIONES.md`).
- ~~**Disparo/destello de escudo/daño progresivo sin pooling.**~~ Encontrado por QA adversarial y resuelto en el prompt 2: los tres se migraron a emisores/pool compartidos, igual que la estela de motor.
- ~~**Torpedos sin pooling.**~~ Resuelto en el prompt 3: pool por escena y por bando en `Torpedo.ts`, mismo patrón de `WeakMap` + `shutdown` que el resto de los efectos.
- ~~**Bundle sin code-splitting.**~~ Resuelto en el prompt 3: Phaser va en su propio chunk (319KB gzip, estable entre builds) y el código del juego queda en 26KB gzip.

## Ideas para una futura vuelta de balance

- El simulador de combate (`herramientas/simulador-balance.ts`) es una aproximación agregada (nubes de unidades acercándose en línea recta, sin posiciones 2D reales ni terreno). Ahora modela escudos y costo por tanda de producción, pero sigue sin reemplazar partidas jugadas para sentir el ritmo real.
- No se testeó a fondo el balance de la **nave de captura** en combate directo (tiene 0 de daño). Sigue pendiente de la vuelta anterior.
- El **Estilete** está diseñado para perder contra enjambres de cazas livianos de su mismo costo (es un cazador de naves de apoyo, no un tanque de enjambres) — confirmar en partidas reales que esto se sienta como una decisión de diseño legible para el jugador y no como una nave "rota", ya que el simulador solo mide agregados y no la sensación de "gastar 260cr y perder siempre" si se usa mal.
- Considerar si vale la pena que la habilidad "andanada total" del Custodio también pueda golpear bases/minas dentro del cono, no solo naves — hoy está limitada a naves rivales por simplicidad de la primera implementación.
- El bono de vida retroactivo ahora hace que comprar Casco/Escudos con una flota grande en el mapa sea bastante más potente que antes (antes solo servía para lo que construyeras después). Si en partidas reales se siente demasiado fuerte, la palanca a revisar es `BONO_VIDA_POR_NIVEL` en `src/datos/balance.ts`, no el mecanismo.
