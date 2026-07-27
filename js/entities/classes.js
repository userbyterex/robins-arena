/**
 * entities/classes.js — Playable classes + abilities (viral loop).
 * Paste-safe, no template literals.
 */
var CLASSES = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    icon: "⚔️",
    tagline: "Tank · Charge",
    color: "#c0392b",
    maxHp: 130,
    speedMul: 0.92,
    weapon: "sword",
    ability: {
      id: "bash",
      name: "Shield Bash",
      cooldown: 8,
      range: 70,
      damage: 28,
      stun: 1.2,
      desc: "Stun + damage nearby enemies",
    },
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    icon: "🏹",
    tagline: "Marksman · Volley",
    color: "#27ae60",
    maxHp: 95,
    speedMul: 1.12,
    weapon: "bow",
    ability: {
      id: "volley",
      name: "Arrow Volley",
      cooldown: 7,
      shots: 5,
      spread: 0.35,
      desc: "Fire 5 arrows in a fan",
    },
  },
  mage: {
    id: "mage",
    name: "Mage",
    icon: "🔮",
    tagline: "Glass · Nova",
    color: "#8e44ad",
    maxHp: 80,
    speedMul: 1.0,
    weapon: "crossbow",
    ability: {
      id: "nova",
      name: "Arcane Nova",
      cooldown: 9,
      radius: 110,
      damage: 35,
      desc: "AoE blast around you",
    },
  },
  monk: {
    id: "monk",
    name: "Monk",
    icon: "🥋",
    tagline: "Agile · Heal",
    color: "#f39c12",
    maxHp: 105,
    speedMul: 1.18,
    weapon: "knife",
    ability: {
      id: "restore",
      name: "Spirit Restore",
      cooldown: 10,
      heal: 45,
      dash: 90,
      desc: "Heal + dash forward",
    },
  },
};

var CLASS_ORDER = ["warrior", "ranger", "mage", "monk"];

function getClass(id) {
  return CLASSES[id] || CLASSES.warrior;
}
