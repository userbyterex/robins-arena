# Robin's Arena 🏹

Deathmatch multijugador 2D, ambientado en el bosque de Sherwood. 2-4 jugadores,
5 armas (cuchillo, espada, hacha, arco, ballesta), sin servidor propio.

## Cómo jugar

1. Escribe tu nombre y sella el pergamino.
2. **Fundar campamento** crea una sala y te da un código de 4 letras. Compártelo.
3. Los demás eligen **Unirme con código** e ingresan ese código.
4. Cuando haya 2-4 jugadores, el anfitrión pulsa **Comenzar la cacería**.
5. Controles:
   - **PC:** `WASD` moverse · mouse apuntar · clic izquierdo atacar · `1-5` cambiar de arma.
   - **Móvil/tablet:** toca y arrastra en la mitad izquierda de la pantalla para
     moverte; toca y arrastra en la mitad derecha para apuntar (mantén el dedo
     alejado del centro para atacar sin soltar); toca los íconos de abajo para
     cambiar de arma.
6. Gana quien llegue a 5 muertes o tenga más al cabo de 3 minutos.

## Cómo funciona (resumen técnico)

No hay backend propio. Un jugador (el **anfitrión**) simula toda la partida en su
propio navegador y la transmite a los demás por conexión directa **peer-to-peer**
(WebRTC, vía PeerJS). Ver `docs/GAME_DESIGN.md` para el detalle completo de
arquitectura, protocolo de red y mecánica de combate.

## Desplegar gratis en GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público, gratis).
2. Sube **todo el contenido de esta carpeta** (`index.html`, `css/`, `js/`, `docs/`)
   a la raíz del repositorio — no lo pongas dentro de una subcarpeta.
3. En el repo: **Settings → Pages → Source → Deploy from a branch**, elige la
   rama `main` y la carpeta `/ (root)`. Guarda.
4. En 1-2 minutos el juego queda publicado en:
   `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`
5. Listo — comparte ese link con tus amigos, no requiere instalar nada.

## Requisitos / notas

- Funciona en cualquier navegador moderno de escritorio o móvil (Chrome,
  Firefox, Edge, Safari). En PC se juega con teclado y mouse; en móvil/tablet
  aparecen automáticamente dos joysticks táctiles y una barra de armas con
  botones — se detecta con CSS (`pointer: coarse` vs `fine`), no hace falta
  configurar nada.
- Los 4 jugadores deben mantener la pestaña abierta durante la partida — si el
  anfitrión cierra la pestaña, la partida termina (es quien simula el juego).
- No usa imágenes ni sonidos externos: todo el arte es dibujado con Canvas 2D y
  los efectos de sonido se generan con Web Audio API. Cero archivos que puedan
  faltar al desplegar.
- 100% gratis: GitHub Pages para el hosting, y el servidor de señalización
  público de PeerJS solo para el saludo inicial entre navegadores.

## Estructura del proyecto

Ver el árbol de archivos completo y el rol de cada uno en `docs/GAME_DESIGN.md`.
