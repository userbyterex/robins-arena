/**
 * entities/classes.js — Class kits: 3 skills + ultimate.
 */
console.log("[CLASSES] loading kits…");

var CLASSES = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    icon: "⚔️",
    tagline: "Tank · Sword & Shield",
    color: "#c0392b",
    maxHp: 140,
    speedMul: 0.90,
    weapon: "sword",
    skills: [
      {
        id: "thrust",
        name: "Thrust",
        icon: "🗡️",
        cooldown: 3.0,
        range: 48,
        damageMul: 1.65,
        desc: "Powerful thrust — extra damage"
      },
      {
        id: "guard",
        name: "Guard",
        icon: "🛡️",
        cooldown: 8.0,
        duration: 1.25,
        desc: "Raise shield — block all damage briefly"
      },
      {
        id: "cleave",
        name: "Cleave",
        icon: "💥",
        cooldown: 5.0,
        range: 62,
        damage: 30,
        desc: "Wide sword sweep around you"
      }
    ],
    ability: {
      id: "fury",
      name: "Fury",
      icon: "🔥",
      cost: 100,
      duration: 5.0,
      atkSpeedMul: 1.55,
      speedMul: 1.30,
      desc: "5s faster attacks and movement"
    }
  },

  ranger: {
    id: "ranger",
    name: "Ranger",
    icon: "🏹",
    tagline: "Marksman · Bow",
    color: "#27ae60",
    maxHp: 95,
    speedMul: 1.14,
    weapon: "bow",
    dodgeChance: 0.15,
    skills: [
      {
        id: "precise_shot",
        name: "Precise",
        icon: "🎯",
        cooldown: 5.0,
        damage: 38,
        range: 280,
        guaranteed: true,
        desc: "Never misses — high damage"
      },
      {
        id: "arrow_rain",
        name: "Rain",
        icon: "🌧️",
        cooldown: 7.0,
        shots: 6,
        spread: 0.55,
        damage: 14,
        desc: "Fan of arrows"
      },
      {
        id: "sidestep",
        name: "Sidestep",
        icon: "💨",
        cooldown: 6.0,
        duration: 0.9,
        dodgeBoost: 0.55,
        desc: "Brief high evade"
      }
    ],
    ability: {
      id: "fire_arrow",
      name: "Fire Arrow",
      icon: "🔥",
      cost: 100,
      damage: 22,
      burnDps: 10,
      burnDuration: 2.0,
      range: 300,
      desc: "Arrow that burns for 2 seconds"
    }
  },

  monk: {
    id: "monk",
    name: "Monk",
    icon: "🥋",
    tagline: "Support · Staff",
    color: "#f39c12",
    maxHp: 110,
    speedMul: 1.08,
    weapon: "staff",
    noBasicAttack: true,
    skills: [
      {
        id: "heal_front",
        name: "Heal",
        icon: "💚",
        cooldown: 3.0,
        healPct: 0.08,
        range: 90,
        desc: "Heal ally in front (\~8% max HP)"
      },
      {
        id: "ward",
        name: "Ward",
        icon: "🛡️",
        cooldown: 5.0,
        duration: 2.0,
        damageReduce: 0.20,
        range: 100,
        desc: "Ally takes 20% less damage for 2s"
      },
      {
        id: "group_heal",
        name: "Bless",
        icon: "✨",
        cooldown: 7.0,
        healPct: 0.10,
        radius: 140,
        desc: "Heal all nearby allies 10%"
      }
    ],
    ability: {
      id: "aegis",
      name: "Aegis",
      icon: "🌟",
      cost: 100,
      duration: 2.2,
      teamDodge: 0.55,
      radius: 160,
      desc: "Team high dodge for 2s"
    }
  },

  mage: {
    id: "mage",
    name: "Mage",
    icon: "🔮",
    tagline: "Caster · Arcane",
    color: "#8e44ad",
    maxHp: 80,
    speedMul: 1.00,
    weapon: "staff_arcane",
    skills: [
      {
        id: "energy_bolt",
        name: "Bolt",
        icon: "⚡",
        cooldown: 0.9,
        damage: 22,
        speed: 420,
        range: 260,
        desc: "Energy projectile"
      },
      {
        id: "fire_rain",
        name: "Fire Rain",
        icon: "🌋",
        cooldown: 5.0,
        radius: 70,
        damage: 28,
        range: 200,
        desc: "AOE burst at aim point"
      },
      {
        id: "frost",
        name: "Frost",
        icon: "❄️",
        cooldown: 6.0,
        duration: 2.5,
        slowMul: 0.45,
        range: 220,
        damage: 12,
        desc: "Slow target for 2.5s"
      }
    ],
    ability: {
      id: "meteor",
      name: "Meteors",
      icon: "☄️",
      cost: 100,
      count: 5,
      radius: 55,
      damage: 26,
      range: 180,
      desc: "Meteors rain on aimed area"
    }
  }
};

var CLASS_ORDER = ["warrior", "ranger", "mage", "monk"];

function getClass(id) {
  return CLASSES[id] || CLASSES.warrior;
}

function getSkill(classId, skillIndex) {
  var cls = getClass(classId);
  return (cls.skills && cls.skills[skillIndex]) || null;
}

function getUltimate(classId) {
  return getClass(classId).ability || null;
}

// Legacy aliases
var ABILITY_ALIASES = {
  whirlwind: "fury",
  arrow_storm: "fire_arrow",
  arcane_blast: "meteor",
  natures_blessing: "aegis",
  bash: "fury",
  volley: "fire_arrow",
  nova: "meteor",
  restore: "aegis"
};

function resolveAbilityId(id) {
  return ABILITY_ALIASES[id] || id;
}

console.log("[CLASSES] ready — kits:", CLASS_ORDER.join(", "));
