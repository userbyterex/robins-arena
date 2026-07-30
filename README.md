# Robin's Arena 🏹

**Conquest multiplayer arena** set in Sherwood Forest.  
2-4 players · 4 classes · Capture zones · Destroy the enemy HQ · Free, no install.

Play instantly in any modern browser (desktop + mobile).

---

## How to Play

1. Type your name and pick a **class** (Warrior / Ranger / Mage / Monk).
2. Customize skin, hair and cloth.
3. Choose:
   - **Solo vs Bots** → play immediately against AI
   - **Host Camp** → get a 4-letter code and share it
   - **Join Camp** → enter a friend’s code
4. Host starts the hunt when ready.

### Goal
- Capture the mid zones (**Nymphs**, **Village**, **Outpost**) to spawn units.
- Protect your **HQ** and destroy the enemy HQ.
- Use class ultimates (Space / ULT button) when charged.

### Controls

**Desktop**
- `WASD` — move
- Mouse — aim
- Left click — attack
- `1-5` — switch weapon
- `Space` — Ultimate

**Mobile / Tablet**
- Left half of screen → move joystick
- Right half → aim + attack
- Bottom weapon icons
- ULT button

---

## Classes

| Class    | Role          | Ultimate-style ability      |
|----------|---------------|-----------------------------|
| Warrior  | Tank          | Whirlwind / Shield Bash     |
| Ranger   | Marksman      | Arrow Storm / Volley        |
| Mage     | Glass cannon  | Arcane Blast / Nova         |
| Monk     | Support       | Nature’s Blessing / Heal    |

---

## Technical overview

- **100% client-side** — no backend of your own.
- Host simulates the match (authoritative).
- Clients send inputs and receive snapshots via **WebRTC** (PeerJS).
- Deploy free on **GitHub Pages**.
- All art and sound generated in code (Canvas 2D + Web Audio).

---

## Deploy on GitHub Pages (free)

1. Create a new public repository.
2. Upload the whole project to the **root** (`index.html`, `css/`, `js/`, `docs/`).
3. Go to **Settings → Pages → Source → Deploy from a branch** → `main` / `(root)`.
4. Wait 1-2 minutes. Your game will be at:  
   `https://YOUR-USERNAME.github.io/REPO-NAME/`

Share the link with friends. Zero cost, zero server to maintain.

---

## Project structure
