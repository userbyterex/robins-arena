// game.js - Módulo ES
import { Player } from './entities/player.js';
import { Projectile } from './entities/projectile.js';
import { Map } from './engine/map.js';
import { Camera } from './engine/camera.js';

export class Game {
  constructor(canvas, network) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.network = network;
    this.players = new Map(); // id -> Player
    this.projectiles = [];
    this.map = new Map();
    this.camera = new Camera();
    this.running = false;
    this.lastTime = 0;
  }

  start() {
    this.running = true;
    this.loop(performance.now());
  }

  loop(timestamp) {
    if (!this.running) return;
    const delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(delta);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(delta) {
    // Actualizar jugadores
    for (const [id, player] of this.players) {
      player.update(delta, this.map);
    }
    // Actualizar proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta);
      if (p.isDead) this.projectiles.splice(i, 1);
    }
    // Detectar colisiones (delegado a combat.js)
    this.checkCollisions();
    // Enviar estado local al host (si soy cliente)
    if (this.network.isClient) {
      this.network.sendState(this.getLocalPlayer().serialize());
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.map.draw(this.ctx, this.camera);
    for (const p of this.projectiles) p.draw(this.ctx, this.camera);
    for (const [id, player] of this.players) {
      player.draw(this.ctx, this.camera);
    }
    // HUD (se dibuja aparte)
  }

  // ... más métodos
}
