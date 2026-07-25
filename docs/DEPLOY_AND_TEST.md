# Desplegar y probar Robin's Arena

## 1. Requisitos

- Una cuenta de GitHub (gratis) — [github.com/join](https://github.com/join) si no tienes.
- La carpeta del proyecto (`robins-arena/`, con `index.html` en la raíz).
- No hace falta instalar nada más: GitHub Pages y el servidor de señalización de
  PeerJS son gratis y ya están configurados en el código.

---

## 2. Subir el proyecto a GitHub

### Opción A — sin usar la terminal (más fácil)

1. Entra a [github.com/new](https://github.com/new) y crea un repositorio:
   - Nombre: `robins-arena` (o el que quieras)
   - Público
   - **No** marques "Add a README" (ya tenemos uno)
2. En la página del repo recién creado, clic en **"uploading an existing file"**.
3. Arrastra **todo el contenido** de la carpeta `robins-arena/` (no la carpeta
   en sí, sino lo de adentro: `index.html`, `css/`, `js/`, `docs/`, `README.md`)
   directo al navegador.
4. Baja y clic en **Commit changes**.

### Opción B — con git (si ya lo usas)

```bash
cd robins-arena
git init
git add .
git commit -m "Robin's Arena: primer despliegue"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/robins-arena.git
git push -u origin main
```

---

## 3. Activar GitHub Pages

1. En el repo: **Settings** (pestaña arriba) → **Pages** (menú izquierdo).
2. En **Source**, elige **Deploy from a branch**.
3. En **Branch**, elige `main` y la carpeta `/ (root)`. **Save**.
4. Espera 1-2 minutos. Refresca la página de Settings → Pages: va a mostrar
   un banner verde con el link, algo como:
   `https://TU-USUARIO.github.io/robins-arena/`

Ese link es el juego, ya público y gratis. Cada vez que subas cambios al repo
(otro commit), GitHub Pages lo vuelve a publicar solo, en 1-2 minutos.

---

## 4. Probar que funciona

### Prueba rápida en solitario (un solo dispositivo)

1. Abre el link en una pestaña normal → nombre → **Fundar campamento** → anota el código.
2. Abre el link en una **ventana de incógnito** (u otro navegador) → mismo nombre distinto → **Unirme con código** → pega el código.
3. Deberías ver a ambos en el roster del lobby. El anfitrión pulsa **Comenzar la cacería**.
4. Muévete con WASD en una ventana y con el mouse en la otra — si ambas se ven moverse en la pantalla del otro, la conexión P2P funciona.

### Prueba con otra persona (recomendado)

1. Comparte el link `https://TU-USUARIO.github.io/robins-arena/` por chat.
2. Uno funda el campamento, comparte el código de 4 letras, el otro se une.
3. Jueguen una ronda completa: moverse, atacar cuerpo a cuerpo, disparar,
   cambiar de arma, morir y respawnear, ver el marcador subir, llegar a 5
   muertes o a que se acabe el cronómetro.

### Prueba en móvil

1. Abre el link en el navegador del celular (Chrome/Safari).
2. Confirma que aparecen los dos joysticks flotantes (izquierdo mover,
   derecho apuntar/atacar) y la barra de armas abajo.
3. Prueba tocar cada arma de la barra y ver que resalta en dorado la activa.
4. Si algo se ve raro, revisa la consola remota (siguiente sección).

### Checklist funcional (para no dejar nada sin probar)

- [ ] Lobby: nombre → fundar/unir → roster se actualiza en ambos lados
- [ ] "Comenzar la cacería" solo lo ve/activa el anfitrión, y solo con 2+ jugadores
- [ ] Movimiento fluido en ambas pantallas (sin trabarse contra árboles/rocas)
- [ ] Los 3 golpes cuerpo a cuerpo (cuchillo/espada/hacha) hacen daño en rango
- [ ] Arco y ballesta disparan flecha/perno que viaja y hace daño al impactar
- [ ] Cambiar de arma con teclas 1-5 (PC) y con los botones (todos)
- [ ] Vida baja, jugador muere, reaparece a los 3s
- [ ] Marcador y kill feed se actualizan al matar
- [ ] Cronómetro corre y la partida termina a los 5 puntos o a los 3 minutos
- [ ] Pantalla de victoria muestra el nombre correcto

---

## 5. Depurar problemas (consola del navegador)

- **PC:** F12 (o clic derecho → Inspeccionar) → pestaña **Console**. Ahí
  aparecerá cualquier error en rojo.
- **Android + Chrome:** conecta el celular por USB, en la PC abre
  `chrome://inspect`, habilita depuración USB en el celular, y verás la
  consola del celular reflejada en tu PC.
- **iPhone + Safari:** en el iPhone, Ajustes → Safari → Avanzado → activa
  "Inspector web". Conecta por cable a una Mac y usa Safari → Desarrollo → tu iPhone.

### Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El código de sala no conecta | Red con firewall estricto (WiFi corporativa/universitaria) que bloquea WebRTC | Probar con datos móviles o WiFi doméstica |
| Se traba al "Conectando con el campamento..." | El anfitrión cerró la pestaña, o el snapshot inicial no llegó | El anfitrión debe mantener la pestaña abierta; recargar y reintentar |
| No se ve nada / pantalla negra | Bloqueador de scripts o extensión del navegador interfiriendo | Probar en incógnito, sin extensiones |
| Los joysticks no aparecen en el celular | El navegador se detectó como "puntero fino" (pasa raro en algunas tablets con stylus) | Forzar con las teclas 1-5 no aplica en móvil; reportar el modelo para ajustar el CSS `pointer: coarse` |
| GitHub Pages muestra 404 | El `index.html` no quedó en la raíz del repo, sino dentro de una subcarpeta | Revisar en el repo que `index.html` esté al mismo nivel que `css/` y `js/` |

---

## 6. Actualizar el juego después de cambios

- **Opción A (web):** en el repo, entra a cada archivo modificado → lápiz de
  editar → pega el nuevo contenido → **Commit changes**.
- **Opción B (git):** `git add . && git commit -m "cambios" && git push`.

En ambos casos, GitHub Pages republica automáticamente en 1-2 minutos — no
hay que tocar la configuración de nuevo.
