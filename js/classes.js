/**
 * classes.js — Clases con habilidad especial (Ultimate) por daño.
 */
var CLASSES = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    icon: "⚔️",
    tagline: "Tank & melee bruiser",
    maxHp: 115,
    speedMul: 0.95,
    weapon: "sword",
    passive: { name: "Iron Will", desc: "+15 HP, 10% damage reduction", damageReduction: 0.10 },
    ultimate: { id: "whirlwind", name: "Whirlwind", desc: "Spin attack hitting all nearby enemies + gain 25 shield", icon: "🌪️", cost: 100, damage: 45, radius: 70, shield: 25, duration: 0.4 },
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    icon: "🏹",
    tagline: "Speed & ranged DPS",
    maxHp: 90,
    speedMul: 1.10,
    weapon: "bow",
    passive: { name: "Swift Foot", desc: "+10% speed, +5% ranged damage", rangedBonus: 0.05 },
    ultimate: { id: "arrow_storm", name: "Arrow Storm", desc: "Rain of arrows in a wide cone", icon: "🌧️", cost: 100, shots: 12, spread: 1.2, damage: 18, speed: 520, projectileRadius: 4 },
  },
  mage: {
    id: "mage",
    name: "Mage",
    icon: "🔮",
    tagline: "Burst magic damage",
    maxHp: 85,
    speedMul: 1.0,
    weapon: "crossbow",
    passive: { name: "Arcane Focus", desc: "+20% ultimate damage, faster charge", chargeBonus: 0.10, ultDamageBonus: 0.20 },
    ultimate: { id: "arcane_blast", name: "Arcane Blast", desc: "Massive explosion that pushes enemies back", icon: "💥", cost: 100, damage: 55, radius: 100, pushForce: 180, duration: 0.5 },
  },
  healer: {
    id: "healer",
    name: "Healer",
    icon: "🌿",
    tagline: "Support & sustain",
    maxHp: 95,
    speedMul: 0.98,
    weapon: "knife",
    passive: { name: "Regrowth", desc: "Heal 2 HP/s when below 50% HP", regenThreshold: 0.50, regenAmount: 2 },
    ultimate: { id: "natures_blessing", name: "Nature's Blessing", desc: "Heal all nearby allies for 35 HP + 15 shield", icon: "✨", cost: 100, heal: 35, shield: 15, radius: 90, duration: 0.6 },
  },
};

var CLASS_ORDER = ["warrior", "ranger", "mage", "healer"];

function getClass(classId) {
  return CLASSES[classId] || CLASSES["warrior"];
}

var ULTIMATE_CHARGE = {
  perDamageDealt: 1.0,
  perDamageTaken: 0.5,
  perHealGiven: 0.8,
  perSecondAlive: 0.15,
  maxCharge: 100,
};
