/**
 * entities/weapons.js — Weapon stats (English names).
 * type: "melee" | "ranged"
 */
const WEAPONS = {
  knife:     { id: "knife",     name: "Knife",     icon: "🔪", type: "melee",  damage: 25, range: 40, angle: 70, cooldown: 0.40 },
  sword:     { id: "sword",     name: "Sword",     icon: "⚔️", type: "melee",  damage: 40, range: 55, angle: 70, cooldown: 0.60 },
  axe:       { id: "axe",       name: "Axe",       icon: "🪓", type: "melee",  damage: 55, range: 50, angle: 60, cooldown: 0.90 },
  bow:       { id: "bow",       name: "Bow",       icon: "🏹", type: "ranged", damage: 35, speed: 500, projectileRadius: 5, cooldown: 0.80 },
  crossbow:  { id: "crossbow",  name: "Crossbow",  icon: "🎯", type: "ranged", damage: 60, speed: 650, projectileRadius: 6, cooldown: 1.60 },
};

const WEAPON_ORDER = ["knife", "sword", "axe", "bow", "crossbow"];
