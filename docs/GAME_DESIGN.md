# Robin's Arena — Documento de Diseño y Arquitectura

Juego multijugador 2D pixel art, estilo "arena deathmatch" (inspirado en CS) pero
ambientado en el bosque de Sherwood: arcos, ballestas, espadas, hachas y cuchillos.
100% estático, sin servidor propio, deploy gratis en GitHub Pages.

---

## 1. Arquitectura general

```
┌─────────────────────────────┐        WebRTC P2P        ┌─────────────────────────────┐
│   Jugador A (HOST)           │ ◄────────────────────────► │   Jugador B (cliente)        │
│   - Autoridad de simulación  │                             │   - Envía inputs             │
│   - Resuelve daño/colisiones │ ◄──────────┐   ┌──────────► │   - Renderiza snapshots       │
│   - Difunde snapshots 20/seg │             │   │           └─────────────────────────────┘
└─────────────────────────────┘             │   │
              ▲                             │   │           ┌─────────────────────────────┐
              └─────────────────────────────┴───┴─────────► │   Jugador C / D (clientes)   │
                                                              └─────────────────────────────┘

Servidor de señalización PeerJS (público, gratuito) — SOLO para el "handshake" inicial.
Una vez conectados, el tráfico de juego va directo navegador-a-navegador.
```

**Por qué host-autoritativo y no servidor dedicado:** GitHub Pages solo sirve archivos
estáticos, no puede correr un backend. Con PeerJS + WebRTC, el navegador del anfitrión
hace de "servidor" para esa partida. Es gratis, no requiere infraestructura, y para
4 jugadores en una arena pequeña es más que suficiente.

**Compromiso aceptado:** si el host tiene mala conexión, todos la sienten (como el P2P
de muchos juegos indie). Para este alcance ("sencillo, gratis, fácil de correr") es el
mejor trade-off. Migrar a un backend real (Colyseus + Render/Fly.io) queda como mejora
futura opcional, no es parte del plan de 6 partes.

---

## 2. Estructura de archivos (proyecto completo)

```
robins-arena/
├── index.html              # Parte 1 ✅ — lobby (host/join)
├── game.html                # Parte 2 — pantalla de juego (canvas)
├── css/
│   ├── style.css            # Parte 1 ✅ — tema pergamino/lobby
│   └── hud.css               # Parte 5 — HUD in-game
├── js/
│   ├── network.js            # Parte 1 ✅ — PeerJS: sala, roster
│   ├── main.js                # Parte 1 — controlador del lobby
│   ├── protocol.js            # Parte 4 — tipos de mensaje compartidos host/cliente
│   ├── engine/
│   │   ├── loop.js            # Parte 2 — game loop (fixed timestep)
│   │   ├── camera.js          # Parte 2 — cámara centrada en el jugador
│   │   ├── map.js              # Parte 2 — tilemap + colisiones estáticas
│   │   └── input.js            # Parte 2 — teclado/mouse/touch
│   ├── entities/
│   │   ├── player.js          # Parte 2 — estado y render del jugador
│   │   ├── weapons.js          # Parte 3 — stats y lógica de cada arma
│   │   └── projectile.js       # Parte 3 — flechas/pernos
│   ├── combat.js               # Parte 3 — hit detection, daño, respawn
│   ├── host-sim.js             # Parte 4 — simulación autoritativa (solo corre en el host)
│   ├── client-sync.js          # Parte 4 — interpolación de snapshots
│   └── hud.js                   # Parte 5 — vida, arma activa, kill feed, marcador
├── assets/
│   ├── sprites/                # Parte 2/3 — spritesheets pixel art
│   ├── tiles/                   # Parte 2 — tileset del bosque
│   └── sfx/                     # Parte 6 — sonidos (golpe, disparo, muerte)
└── README.md                    # Parte 6 — instrucciones de deploy
```

---

## 3. Frontend

- **Render:** Canvas 2D (no WebGL) — más liviano, corre bien en cualquier laptop/móvil
  y es más fácil de depurar que Three.js para un juego 2D.
- **Resolución interna:** 960×640, escalado con `image-rendering: pixelated` para
  mantener el look pixel art nítido en cualquier pantalla.
- **Sprites:** spritesheets de 32×32px por personaje (idle, correr, atacar, morir ×4
  direcciones), generados con Pillow/Aseprite-style. Un set de sprites por arma
  equipada (silueta cambia según arma en mano).
- **Game loop:** `requestAnimationFrame` con paso fijo de simulación (1/60) y
  renderizado con interpolación, para que el movimiento no dependa del framerate del
  dispositivo.
- **Input:** WASD / flechas para moverse, mouse para apuntar y clic para atacar,
  teclas 1-5 para cambiar de arma. **En móvil/tablet:** dos joysticks flotantes
  (aparecen donde el dedo toca) — el izquierdo mueve, el derecho apunta y ataca
  mientras se mantiene presionado más allá de la zona muerta — más una barra de
  botones reales para elegir arma (sirve igual con tap que con clic). Ambos
  esquemas conviven: `engine/input.js` combina teclado/mouse y joysticks
  táctiles en una sola fuente de verdad, así que el mismo `game.js` funciona
  sin cambios en PC o en el celular.
- **Cámara:** sigue al jugador local, límites del mapa, sin zoom (simplicidad).

---

## 4. "Backend" (capa de red, Parte 4)

Sin servidor propio — el **host simula, los clientes obedecen**:

1. Cada cliente envía su input (dirección, apuntado, si atacó) al host, 20 veces/seg.
2. El host corre la única simulación "real": mueve a todos, calcula colisiones,
   resuelve golpes/flechas, decide quién muere.
3. El host difunde un *snapshot* (posición, HP, animación de cada jugador) 20 veces/seg
   a todos los clientes.
4. Los clientes solo **interpolan** entre snapshots recibidos para que el movimiento
   se vea fluido, y renderizan — no deciden nada por sí mismos.

Esto evita trampas fáciles y, más importante para este proyecto, evita que cada
navegador tenga una versión distinta de la realidad (desync). El costo es que el host
tiene ~1 frame de ventaja/latencia sobre sí mismo, imperceptible en una arena pequeña.

**Mensajes del protocolo (protocolo.js):**
| Mensaje | Dirección | Contenido |
|---|---|---|
| `join` | cliente → host | nombre |
| `roster` | host → clientes | lista de jugadores en la sala |
| `start` | host → clientes | semilla del mapa, orden de spawn |
| `input` | cliente → host | teclas, ángulo de mira, ataque (sí/no) |
| `snapshot` | host → clientes | posiciones, HP, arma activa, eventos (golpe/muerte) |

---

## 5. Mecánica de juego

### Jugador
- Vida: **100 HP**, hitbox circular de 16px de radio.
- Velocidad base: 220 px/s.
- Muerte → respawn a los 3s en un punto aleatorio (4 puntos de spawn, uno por esquina).

### Armas cuerpo a cuerpo
| Arma | Daño | Alcance | Cadencia |
|---|---|---|---|
| Cuchillo | 25 | 40px | 0.4s (rápido) |
| Espada | 40 | 55px | 0.6s |
| Hacha | 55 | 50px | 0.9s (lento, fuerte) |

Golpe = cono de 60° frente al jugador; si un rival está dentro del alcance y el cono
en el instante del ataque, recibe daño.

### Armas a distancia
| Arma | Daño | Velocidad proyectil | Cadencia |
|---|---|---|---|
| Arco | 35 | 500 px/s | 0.8s |
| Ballesta | 60 | 650 px/s | 1.6s (recarga lenta) |

Los proyectiles son entidades físicas simples (línea recta, sin gravedad), se
destruyen al chocar con un jugador o un obstáculo del mapa.

### Modo de juego
- **Cacería** (deathmatch libre): gana quien llegue primero a 5 muertes, o quien
  tenga más muertes al cabo de 3 minutos.
- Marcador visible en el HUD en todo momento.

### Mapa
- "Claro de Sherwood": arena compacta ~1200×800px, tilemap con árboles/rocas que
  bloquean movimiento y proyectiles (buena para emboscadas con arco).
- 1 mapa para el MVP; estructura preparada para agregar más (Parte 6, opcional).

---

## 6. UI/UX (Parte 5)

- **HUD:** barra de vida arriba-izquierda, arma activa + icono abajo-centro,
  marcador de muertes arriba-derecha, kill feed ("Robin abatió a Juan con hacha")
  esquina superior derecha.
- **Selección de arma:** teclas 1-5 o rueda con scroll, ícono resalta el arma activa.
- **Pantalla de victoria:** al llegar a 5 muertes, pergamino de "cierre de la
  proclamación" con el ranking final y botón para volver al lobby.

---

## 7. Roadmap de construcción (6 partes)

| Parte | Contenido | Estado |
|---|---|---|
| **1** | Lobby multijugador (host/join, roster, PeerJS) | ✅ hecho |
| **2** | Motor: mapa, cámara, movimiento del jugador, colisiones | ✅ hecho |
| **3** | Combate: armas melee + proyectiles a distancia, hit detection | ✅ hecho |
| **4** | Sincronización: protocolo host-autoritativo, snapshots, interpolación | ✅ hecho |
| **5** | HUD: vida, arma activa, marcador, kill feed, pantalla de victoria | ✅ hecho |
| **6** | Pulido: sonidos (Web Audio, sin archivos), README de deploy | ✅ hecho |

**El juego está completo y jugable.** Mejoras opcionales para después: sprites
dibujados a mano en vez de formas geométricas, más de un mapa, soporte táctil
para móvil, y un modo por equipos.

## 8. Deploy (resumen, se detalla en Parte 6)

Al terminar: subir la carpeta `robins-arena/` a un repo de GitHub, activar
**Settings → Pages → branch main /root**, y el juego queda en
`https://tu-usuario.github.io/robins-arena/`. Cero costo, cero backend que mantener.
