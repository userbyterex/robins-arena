/**
 * entities/classes.js — Classes with unique ultimates (abilities).
 * With integration logging.
 */
console.log("[CLASSES] loading…");

var CLASSES = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    icon: "⚔️",
    tagline: "Tank · Whirlwind",
    color: "#c0392b",
    maxHp: 130,
    speedMul: 0.92,
    weapon: "sword",
    ability: {
      id: "whirlwind",
      name: "Whirlwind",
      cooldown: 9,
      range: 78,
      damage: 32,
      stun: 0.8,
      desc: "Spin attack — damage + brief stun around you"
    }
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    icon: "🏹",
    tagline: "Marksman · Arrow Storm",
    color: "#27ae60",
    maxHp: 95,
    speedMul: 1.12,
    weapon: "bow",
    ability: {
      id: "arrow_storm",
      name: "Arrow Storm",
      cooldown: 8,
      shots: 7,
      spread: 0.42,
      damage: 18,
      desc: "Fan of 7 arrows in the aim direction"
    }
  },
  mage: {
    id: "mage",
    name: "Mage",
    icon: "🔮",
    tagline: "Glass · Arcane Blast",
    color: "#8e44ad",
    maxHp: 80,
    speedMul: 1.0,
    weapon: "crossbow",
    ability: {
      id: "arcane_blast",
      name: "Arcane Blast",
      cooldown: 10,
      radius: 120,
      damage: 42,
      desc: "Nova blast around you — high burst"
    }
  },
  monk: {
    id: "monk",
    name: "Monk",
    icon: "🥋",
    tagline: "Support · Nature's Blessing",
    color: "#f39c12",
    maxHp: 105,
    speedMul: 1.18,
    weapon: "knife",
    ability: {
      id: "natures_blessing",
      name: "Nature's Blessing",
      cooldown: 11,
      heal: 50,
      shield: 25,
      radius: 100,
      desc: "Heal self + nearby allies, grant shield"
    }
  }
};

var CLASS_ORDER = ["warrior", "ranger", "mage", "monk"];

function getClass(id) {
  var c = CLASSES[id] || CLASSES.warrior;
  if (!CLASSES[id] && id) {
    console.warn("[CLASSES] unknown classId:", id, "→ fallback warrior");
  }
  return c;
}

// Legacy ability id aliases (old host-sim names → new)
var ABILITY_ALIASES = {
  bash: "whirlwind",
  volley: "arrow_storm",
  nova: "arcane_blast",
  restore: "natures_blessing"
};

function resolveAbilityId(id) {
  if (!id) return id;
  if (ABILITY_ALIASES[id]) {
    console.log("[CLASSES] alias", id, "→", ABILITY_ALIASES[id]);
    return ABILITY_ALIASES[id];
  }
  return id;
}

console.log("[CLASSES] ready —", CLASS_ORDER.join(", "));
Object.keys(CLASSES).forEach(function (k) {
  var a = CLASSES[k].ability;
  console.log("[CLASSES]", k, "→ ult:", a.id, "(" + a.name + ")");
});
