/**
 * entities/weapons.js
 * Estadísticas de cada arma. type: "melee" | "ranged".
 * cooldown en segundos, range/speed en px, angle (grados) es el cono de golpe melee.
 */
const WEAPONS = {
  knife:     { id: "knife",     name: "Cuchillo",  icon: "🔪", type: "melee",  damage: 25, range: 40, angle: 70, cooldown: 0.40 },
  sword:     { id: "sword",     name: "Espada",    icon: "⚔️", type: "melee",  damage: 40, range: 55, angle: 70, cooldown: 0.60 },
  axe:       { id: "axe",       name: "Hacha",     icon: "🪓", type: "melee",  damage: 55, range: 50, angle: 60, cooldown: 0.90 },
  bow:       { id: "bow",       name: "Arco",      icon: "🏹", type: "ranged", damage: 35, speed: 500, projectileRadius: 5, cooldown: 0.80 },
  crossbow:  { id: "crossbow",  name: "Ballesta",  icon: "🎯", type: "ranged", damage: 60, speed: 650, projectileRadius: 6, cooldown: 1.60 },
};

const WEAPON_ORDER = ["knife", "sword", "axe", "bow", "crossbow"];
