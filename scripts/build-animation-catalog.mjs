#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const animationsDir = path.join(rootDir, "animations");
const outputCsv = path.join(animationsDir, "ANIMATION_CATALOG.csv");
const outputJson = path.join(animationsDir, "ANIMATION_CATALOG.json");
const outputSummary = path.join(animationsDir, "ANIMATION_CATALOG_SUMMARY.md");

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildCtx = (clipName) => {
  const text = normalize(clipName);
  const words = new Set(text.split(" ").filter(Boolean));
  return { text, words };
};

const hasKeyword = (ctx, keyword) => {
  const k = normalize(keyword);
  if (!k) return false;
  if (k.includes(" ")) return ctx.text.includes(k);
  if (ctx.words.has(k)) return true;
  if (k.length >= 4) {
    for (const word of ctx.words) {
      if (word.startsWith(k)) return true;
    }
  }
  return false;
};

const hasAny = (ctx, keywords) => keywords.some((k) => hasKeyword(ctx, k));

const MOVEMENT_KEYWORDS = {
  swim: ["swim", "swimming", "breastroke"],
  climb: [
    "climb",
    "climbing",
    "ladder",
    "wall run",
    "wall climb",
    "rope",
    "vault",
    "freehang",
  ],
  crawl_hang: [
    "crawl",
    "crawling",
    "prone",
    "free hang",
    "braced hang",
    "hanging",
    "shimmy",
    "laying",
    "lying",
  ],
  strafe: ["strafe", "side step", "sidestep"],
  run: ["run", "running", "sprint", "jog", "jogging", "rush"],
  walk: ["walk", "walking", "shuffle", "pacing"],
  turn: ["turn", "turning", "pivot", "rotate", "degrees", "degree"],
  jump: [
    "jump",
    "jumping",
    "leap",
    "flip",
    "hop",
    "cartwheel",
    "dive",
    "somersault",
  ],
  fall_reaction: [
    "fall",
    "falling",
    "tripping",
    "stumble",
    "knocked",
    "dying",
    "death",
    "shot",
    "flinch",
  ],
  idle: [
    "idle",
    "standing",
    "sitting",
    "kneeling",
    "crouch idle",
    "pose",
    "resting",
    "waiting",
    "stance",
    "leaning",
    "looking",
    "holding",
    "listening",
  ],
};

const TAG_KEYWORDS = [
  ["zombie", ["zombie"]],
  ["mutant", ["mutant"]],
  ["ninja", ["ninja"]],
  ["military", ["rifle", "bayonet", "grenade", "hostage", "military"]],
  ["stealth", ["stealth", "sneak", "sneaking", "hiding"]],
  ["injured", ["injured", "agony", "wounded", "pain", "hurt"]],
  ["death", ["dying", "death", "unconscious", "knocked"]],
  ["happy", ["happy", "victory", "cheering", "celebrating", "ecstatic"]],
  ["sad", ["sad", "defeat", "shame", "disbelief", "rejected"]],
  ["scared", ["terrified", "fear", "scared", "nervous", "apprehensive", "timid"]],
  ["angry", ["angry", "threatening", "battlecry", "menacing", "taunt"]],
  ["drunk", ["drunk", "drunken", "dizzy"]],
  ["dance", ["dance", "dancing", "salsa", "hip hop", "breakdance", "ballet", "samba", "twerk"]],
  ["sports", ["soccer", "golf", "baseball", "goalkeeper", "football"]],
  ["boxing", ["boxing"]],
  ["mma", ["mma"]],
  ["capoeira", ["capoeira"]],
  ["breakdance", ["breakdance"]],
  ["soccer", ["soccer", "goalkeeper", "football"]],
  ["baseball", ["baseball", "batting", "bunt", "pitching"]],
  ["golf", ["golf", "putt", "putting", "chip shot", "drive shot"]],
  ["rifle", ["rifle"]],
  ["pistol", ["pistol", "gunplay", "hand cannon"]],
  ["bow", ["bow", "arrow"]],
  ["sword", ["sword", "great sword"]],
  ["shield", ["shield"]],
  ["axe", ["axe"]],
  ["torch", ["torch"]],
  ["knife", ["knife", "dagger"]],
  ["grenade", ["grenade"]],
  ["staff", ["staff"]],
  ["spear", ["spear", "bayonet"]],
  ["magic", ["magic", "spell", "hadouken", "casting"]],
  ["vehicle", ["car", "driver", "passenger", "helicopter", "plane", "driving"]],
  ["carrying", ["carrying", "carried", "carry"]],
  ["sitting", ["sitting", "seated"]],
  ["crouching", ["crouch", "crouching"]],
  ["kneeling", ["kneel", "kneeling"]],
  ["prone", ["prone", "laying", "lying"]],
  ["walking", ["walk", "walking"]],
  ["running", ["run", "running", "sprint", "jog", "jogging"]],
  ["idle", ["idle", "standing"]],
  ["turning", ["turn", "turning", "pivot", "degree", "degrees"]],
  ["strafing", ["strafe", "side step", "sidestep"]],
  ["jumping", ["jump", "jumping", "leap", "flip", "hop", "dive", "cartwheel"]],
  ["climbing", ["climb", "ladder", "vault", "wall run", "rope"]],
  ["crawling", ["crawl", "crawling", "prone"]],
];

const KEYWORDS = {
  dance: [
    "dance",
    "dancing",
    "salsa",
    "hip hop",
    "breakdance",
    "ballet",
    "boogaloo",
    "samba",
    "twerk",
    "charleston",
    "thriller",
    "can can",
    "ymca",
  ],
  sports: [
    "soccer",
    "baseball",
    "golf",
    "goalkeeper",
    "goalie",
    "football",
    "quarterback",
    "boxing",
    "mma",
    "capoeira",
    "muay thai",
    "speedbag",
    "dribbling",
  ],
  workout: [
    "workout",
    "fitness",
    "push up",
    "sit up",
    "squat",
    "plank",
    "jumping jacks",
    "bicep curl",
    "burpee",
    "stretch",
    "snatch",
    "high pull",
  ],
  reaction: [
    "hit reaction",
    "getting hit",
    "receiving a",
    "dying",
    "death",
    "falling",
    "knocked",
    "unconscious",
    "stumble",
    "tripping",
    "agony",
    "injured",
    "shot",
    "victim",
    "flinch",
  ],
  combat: [
    "attack",
    "attacking",
    "fight",
    "fighting",
    "punch",
    "kick",
    "stab",
    "slamming",
    "slam",
    "bash",
    "bashing",
    "headbutt",
    "elbow",
    "knee",
    "bite",
    "strangle",
    "slash",
    "strike",
    "uppercut",
    "hook",
    "jab",
    "block",
    "blocking",
    "weapon",
    "rifle",
    "pistol",
    "gun",
    "shotgun",
    "bow",
    "sword",
    "axe",
    "shoot",
    "fire",
    "firing",
    "aiming",
    "aimed",
    "hostage",
    "villain",
    "reload",
    "assassination",
    "battle",
    "combat",
    "bayonet",
    "throwing grenade",
  ],
  traversal: [
    "climb",
    "ladder",
    "vault",
    "wall run",
    "free hang",
    "braced hang",
    "hanging",
    "shimmy",
    "rope",
    "crawl",
    "prone move",
  ],
  magic: ["magic", "spell", "hadouken", "casting", "powering up"],
  vehicle: ["car", "driver", "passenger", "helicopter", "flying plane", "driving"],
  interaction: [
    "opening",
    "closing",
    "picking",
    "pick up",
    "putting",
    "using",
    "carrying",
    "watering",
    "typing",
    "phone",
    "cabinet",
    "door",
    "box",
    "wheelbarrow",
    "iv pole",
    "drinking",
    "playing",
    "fishing",
    "milking",
    "cards",
    "dice",
    "cup",
    "animal",
    "radio",
    "controls",
    "access code",
    "serving",
    "watering",
  ],
  emote: [
    "gesture",
    "gesturing",
    "waving",
    "clap",
    "cheer",
    "fist pump",
    "celebrating",
    "victory",
    "pointing",
    "nodding",
    "shaking head",
    "question",
    "conversation",
    "chat",
    "bow",
    "salute",
    "arguing",
    "thankful",
    "surprised",
    "bashful",
    "roar",
    "yelling",
    "looking around",
    "talking",
    "kissing",
    "salute",
    "praying",
  ],
  excited: [
    "happy",
    "victory",
    "cheering",
    "celebrating",
    "fist pump",
    "ecstatic",
    "enthusiastic",
    "dance",
    "roar",
    "happily",
    "thankful",
  ],
  aggressive: [
    "attack",
    "punch",
    "kick",
    "stab",
    "slash",
    "fight",
    "combat",
    "angry",
    "threatening",
    "taunt",
    "menacing",
    "battlecry",
    "villain",
    "shoot",
    "firing",
    "uppercut",
    "headbutt",
  ],
  sad: ["sad", "defeat", "shame", "rejected", "disbelief", "cry"],
  scared: ["terrified", "fear", "scared", "nervous", "apprehensive", "timid", "cautious"],
  injured: [
    "injured",
    "agony",
    "dying",
    "death",
    "hit",
    "knocked",
    "unconscious",
    "pain",
    "wounded",
    "stumble",
    "falling",
    "tripping",
  ],
};

function detectLocomotion(ctx) {
  if (hasAny(ctx, MOVEMENT_KEYWORDS.swim)) return "swim";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.climb)) return "climb";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.crawl_hang)) return "crawl_hang";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.strafe)) return "strafe";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.run)) return "run";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.walk)) return "walk";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.turn)) return "turn";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.jump)) return "jump";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.fall_reaction)) return "fall_reaction";
  if (hasAny(ctx, MOVEMENT_KEYWORDS.idle)) return "idle";
  return "none";
}

function detectMood(ctx, tags) {
  if (tags.has("zombie")) return "zombie";
  if (hasAny(ctx, KEYWORDS.injured)) return "injured";
  if (hasAny(ctx, KEYWORDS.aggressive)) return "aggressive";
  if (hasAny(ctx, KEYWORDS.excited)) return "excited";
  if (hasAny(ctx, KEYWORDS.sad)) return "sad";
  if (hasAny(ctx, KEYWORDS.scared)) return "scared";
  return "neutral";
}

function detectEnergy(ctx, primaryCategory, locomotion) {
  const highEnergyCategory = new Set([
    "combat",
    "dance",
    "sports",
    "workout",
    "reaction",
    "traversal",
  ]);
  if (highEnergyCategory.has(primaryCategory)) return "high";
  if (["run", "jump", "climb", "strafe", "swim"].includes(locomotion)) return "high";
  if (["walk", "turn", "crawl_hang", "fall_reaction"].includes(locomotion)) return "medium";
  if (locomotion === "idle") return "low";
  if (hasAny(ctx, ["fast", "quick", "explosive"])) return "high";
  return "medium";
}

function detectPrimaryCategory(ctx, tags, locomotion) {
  if (tags.has("zombie")) return "zombie";
  if (hasAny(ctx, KEYWORDS.dance)) return "dance";
  if (hasAny(ctx, KEYWORDS.sports)) return "sports";
  if (hasAny(ctx, KEYWORDS.workout)) return "workout";
  if (hasAny(ctx, KEYWORDS.reaction)) return "reaction";
  if (hasAny(ctx, KEYWORDS.combat)) return "combat";
  if (hasAny(ctx, KEYWORDS.traversal)) return "traversal";
  if (hasAny(ctx, KEYWORDS.magic)) return "magic";
  if (hasAny(ctx, KEYWORDS.vehicle)) return "vehicle";
  if (hasAny(ctx, KEYWORDS.interaction)) return "interaction";
  if (locomotion !== "none" && locomotion !== "idle") return "locomotion";
  if (hasAny(ctx, KEYWORDS.emote)) return "emote";
  if (locomotion === "idle") return "idle";

  if (
    hasAny(ctx, [
      "arms",
      "hand",
      "hands",
      "hips",
      "leaning",
      "looking",
      "standing",
      "kneeling",
      "sitting",
      "posture",
      "pose",
      "holding",
    ])
  ) {
    return "idle";
  }

  if (
    hasAny(ctx, [
      "question",
      "chat",
      "conversation",
      "bow",
      "salute",
      "nod",
      "shake",
      "clap",
      "cheer",
      "yell",
      "roar",
      "point",
    ])
  ) {
    return "emote";
  }

  if (
    hasAny(ctx, [
      "object",
      "box",
      "cup",
      "cards",
      "dice",
      "torch",
      "rifle",
      "pistol",
      "door",
      "cabinet",
      "animal",
      "drink",
      "code",
      "radio",
    ])
  ) {
    return "interaction";
  }

  return "misc";
}

function buildTags(ctx, primaryCategory, locomotion, mood) {
  const tags = new Set();

  for (const [tag, keywords] of TAG_KEYWORDS) {
    if (hasAny(ctx, keywords)) tags.add(tag);
  }

  if (locomotion !== "none") tags.add(locomotion);
  if (mood !== "neutral") tags.add(mood);
  tags.add(primaryCategory);

  if (primaryCategory === "combat") {
    if (hasAny(ctx, ["punch", "kick", "jab", "hook", "uppercut", "boxing", "mma"])) {
      tags.add("unarmed_combat");
    }
    if (hasAny(ctx, ["sword", "axe", "knife", "dagger", "staff", "spear", "bayonet", "torch"])) {
      tags.add("melee_weapon");
    }
    if (hasAny(ctx, ["rifle", "pistol", "bow", "arrow", "gun", "firing", "shoot"])) {
      tags.add("ranged_weapon");
    }
  }

  return Array.from(tags).sort();
}

const csvEscape = (value) => {
  const asString = String(value ?? "");
  if (asString.includes(",") || asString.includes("\"") || asString.includes("\n")) {
    return `"${asString.replace(/"/g, "\"\"")}"`;
  }
  return asString;
};

function counter() {
  const map = new Map();
  return {
    add(key) {
      map.set(key, (map.get(key) ?? 0) + 1);
    },
    sortedEntries() {
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    },
  };
}

async function main() {
  const entries = await fs.readdir(animationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".fbx"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const categoryCounts = counter();
  const locomotionCounts = counter();
  const moodCounts = counter();
  const tagCounts = counter();

  const catalog = files.map((fileName) => {
    const clipName = path.basename(fileName, ".fbx");
    const ctx = buildCtx(clipName);
    const locomotion = detectLocomotion(ctx);
    const preTags = new Set();
    for (const [tag, keywords] of TAG_KEYWORDS) {
      if (hasAny(ctx, keywords)) preTags.add(tag);
    }

    const primaryCategory = detectPrimaryCategory(ctx, preTags, locomotion);
    const mood = detectMood(ctx, preTags);
    const energy = detectEnergy(ctx, primaryCategory, locomotion);
    const tags = buildTags(ctx, primaryCategory, locomotion, mood);

    categoryCounts.add(primaryCategory);
    locomotionCounts.add(locomotion);
    moodCounts.add(mood);
    for (const tag of tags) tagCounts.add(tag);

    return {
      file: fileName,
      clip: clipName,
      primaryCategory,
      locomotion,
      mood,
      energy,
      tags,
    };
  });

  const csvHeader = [
    "file",
    "clip",
    "primary_category",
    "locomotion",
    "mood",
    "energy",
    "tags",
  ];
  const csvRows = [
    csvHeader.join(","),
    ...catalog.map((row) =>
      [
        csvEscape(row.file),
        csvEscape(row.clip),
        csvEscape(row.primaryCategory),
        csvEscape(row.locomotion),
        csvEscape(row.mood),
        csvEscape(row.energy),
        csvEscape(row.tags.join("|")),
      ].join(","),
    ),
  ];

  const summaryLines = [
    "# Animation Catalog Summary",
    "",
    `Total animations cataloged: **${catalog.length}**`,
    "",
    "## Primary Categories",
    "",
    ...categoryCounts.sortedEntries().map(([key, count]) => `- ${key}: ${count}`),
    "",
    "## Locomotion Types",
    "",
    ...locomotionCounts.sortedEntries().map(([key, count]) => `- ${key}: ${count}`),
    "",
    "## Mood Tags",
    "",
    ...moodCounts.sortedEntries().map(([key, count]) => `- ${key}: ${count}`),
    "",
    "## Most Common Tags (Top 50)",
    "",
    ...tagCounts
      .sortedEntries()
      .slice(0, 50)
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "## Usage Notes",
    "",
    "- `primary_category` is intended for broad grouping (combat, locomotion, dance, etc.).",
    "- `locomotion` explicitly separates walk/run/idle/turn/jump-style movement.",
    "- `tags` include theme and gameplay filters like `zombie`, weapon type, mood, and posture.",
  ];

  await Promise.all([
    fs.writeFile(outputJson, JSON.stringify(catalog, null, 2), "utf8"),
    fs.writeFile(outputCsv, `${csvRows.join("\n")}\n`, "utf8"),
    fs.writeFile(outputSummary, `${summaryLines.join("\n")}\n`, "utf8"),
  ]);

  console.log(`Cataloged ${catalog.length} animations`);
  console.log(`Wrote ${path.relative(rootDir, outputCsv)}`);
  console.log(`Wrote ${path.relative(rootDir, outputJson)}`);
  console.log(`Wrote ${path.relative(rootDir, outputSummary)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
