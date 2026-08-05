/**
 * entities/weapons.js — Basic attack only (short weapon CD, not skill CD)
 */
var WEAPONS = {
  knife:  { id: "knife",  name: "Knife",  icon: "🔪", type: "melee",  damage: 22, range: 40, angle: 70, cooldown: 0.40 },
  sword:  { id: "sword",  name: "Sword",  icon: "⚔️", type: "melee",  damage: 28, range: 52, angle: 70, cooldown: 0.50 },
  axe:    { id: "axe",    name: "Axe",    icon: "🪓", type: "melee",  damage: 40, range: 48, angle: 60, cooldown: 0.80 },
  bow:    { id: "bow",    name: "Bow",    icon: "🏹", type: "ranged", damage: 20, speed: 480, projectileRadius: 5, cooldown: 0.55 },
  crossbow: { id: "crossbow", name: "Crossbow", icon: "🎯", type: "ranged", damage: 36, speed: 560, projectileRadius: 6, cooldown: 1.10 },
  staff:  { id: "staff",  name: "Staff",  icon: "🌿", type: "melee",  damage: 0,  range: 30, angle: 40, cooldown: 99 },
  staff_arcane: { id: "staff_arcane", name: "Arcane Staff", icon: "🔮", type: "ranged", damage: 18, speed: 400, projectileRadius: 6, cooldown: 0.45 }
};

var WEAPON_ORDER = ["sword", "bow", "staff_arcane", "staff"];
