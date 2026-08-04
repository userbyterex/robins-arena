/**
 * entities/weapons.js
 */
var WEAPONS = {
  knife:  { id: "knife",  name: "Knife",  icon: "🔪", type: "melee",  damage: 22, range: 40, angle: 70, cooldown: 0.40 },
  sword:  { id: "sword",  name: "Sword",  icon: "⚔️", type: "melee",  damage: 28, range: 52, angle: 70, cooldown: 0.55 },
  axe:    { id: "axe",    name: "Axe",    icon: "🪓", type: "melee",  damage: 40, range: 48, angle: 60, cooldown: 0.85 },
  bow:    { id: "bow",    name: "Bow",    icon: "🏹", type: "ranged", damage: 20, speed: 480, projectileRadius: 5, cooldown: 0.70 },
  crossbow: { id: "crossbow", name: "Crossbow", icon: "🎯", type: "ranged", damage: 36, speed: 560, projectileRadius: 6, cooldown: 1.20 },
  staff:  { id: "staff",  name: "Staff",  icon: "🌿", type: "melee",  damage: 0,  range: 30, angle: 40, cooldown: 99 },
  staff_arcane: { id: "staff_arcane", name: "Arcane Staff", icon: "🔮", type: "ranged", damage: 18, speed: 400, projectileRadius: 6, cooldown: 0.85 }
};

var WEAPON_ORDER = ["knife", "sword", "axe", "bow", "crossbow", "staff", "staff_arcane"];
