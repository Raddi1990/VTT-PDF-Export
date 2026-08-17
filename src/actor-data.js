const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

const SIZE_LABELS = {
  tiny: "Tiny",
  sm: "Small",
  small: "Small",
  med: "Medium",
  medium: "Medium",
  lg: "Large",
  large: "Large",
  huge: "Huge",
  grg: "Gargantuan",
  gargantuan: "Gargantuan"
};

// dnd5e's schema shifts between core versions; every lookup below falls back
// across the paths seen in 2014- and 2024-rules data models.
function findItemName(actor, types) {
  return actor.items.find(i => types.includes(i.type))?.name ?? "";
}

// dnd5e stores trait value lists (languages, weapon/armor proficiencies, ...)
// as a Set, not an Array, so they need Array.from() before .join() works.
function joinValues(values) {
  return values ? Array.from(values).join(", ") : "";
}

function buildAbilities(sys) {
  const abilities = {};
  for (const key of ABILITIES) {
    const ab = sys.abilities?.[key] ?? {};
    abilities[key] = {
      score: ab.value ?? "",
      mod: ab.mod ?? 0,
      save: ab.save ?? ab.mod ?? 0,
      saveProficient: !!(ab.saveProf?.hasProficiency ?? ab.proficient)
    };
  }
  return abilities;
}

function buildSkills(sys) {
  const skills = {};
  for (const [key, skill] of Object.entries(sys.skills ?? {})) {
    skills[key] = {
      total: skill.total ?? 0,
      passive: skill.passive ?? 0,
      proficient: (skill.value ?? 0) >= 1,
      expertise: (skill.value ?? 0) >= 2
    };
  }
  return skills;
}

function buildSpellsText(actor) {
  const byLevel = {};
  for (const item of actor.items) {
    if (item.type !== "spell") continue;
    const level = item.system.level ?? 0;
    byLevel[level] ??= [];
    byLevel[level].push(item.name);
  }
  const spells = {};
  for (let level = 0; level <= 9; level++) {
    spells[`level${level}`] = (byLevel[level] ?? []).join("\n");
  }
  return spells;
}

// The official sheet's weapon table has fixed name/attack/damage/notes
// columns per row (6 rows), so weapons are exposed as indexed fields
// (weapon1..weapon6) rather than one combined text block.
function buildWeaponRows(actor) {
  const weapons = actor.items.filter(i => i.type === "weapon").slice(0, 6);
  const rows = {};
  for (let i = 0; i < 6; i++) {
    const w = weapons[i];
    rows[`weapon${i + 1}`] = {
      name: w?.name ?? "",
      atkBonus: w?.labels?.toHit ?? "",
      damage: w?.labels?.damage ?? "",
      notes: ""
    };
  }
  return rows;
}

function buildInventoryText(actor) {
  return actor.items
    .filter(i => ["weapon", "equipment", "consumable", "tool", "loot", "container"].includes(i.type))
    .map(i => `${i.name}${i.system.quantity > 1 ? ` (x${i.system.quantity})` : ""}`)
    .join("\n");
}

export function extractCharacterData(actor) {
  const sys = actor.system;

  const species = sys.details?.race?.name ?? sys.details?.species?.name ?? findItemName(actor, ["race", "species"]);
  const subclass = findItemName(actor, ["subclass"]);
  const background = sys.details?.background?.name ?? findItemName(actor, ["background"]);
  const classes = actor.items
    .filter(i => i.type === "class")
    .map(i => `${i.name} ${i.system.levels ?? ""}`.trim())
    .join(", ");

  const rawSize = sys.traits?.size ?? "";
  const size = SIZE_LABELS[rawSize] ?? rawSize;

  const personality = sys.details?.trait ?? "";
  const ideals = sys.details?.ideal ?? "";
  const bonds = sys.details?.bond ?? "";
  const flaws = sys.details?.flaw ?? "";

  return {
    name: actor.name,
    species,
    subclass,
    classes,
    background,
    // The sheet's top box has one combined line for "Background / Class"
    // and one for "Species / Subclass" rather than four separate fields.
    backgroundClass: [background, classes].filter(Boolean).join("   —   "),
    speciesSubclass: [species, subclass].filter(Boolean).join("   —   "),
    alignment: sys.details?.alignment ?? "",
    xp: sys.details?.xp?.value ?? "",
    level: sys.details?.level ?? "",
    size,
    proficiencyBonus: sys.attributes?.prof ?? 0,
    inspiration: !!sys.attributes?.inspiration,
    abilities: buildAbilities(sys),
    skills: buildSkills(sys),
    ac: sys.attributes?.ac?.value ?? "",
    initiative: sys.attributes?.init?.total ?? sys.attributes?.init?.mod ?? 0,
    speed: sys.attributes?.movement?.walk ?? "",
    hp: {
      value: sys.attributes?.hp?.value ?? "",
      max: sys.attributes?.hp?.max ?? "",
      temp: sys.attributes?.hp?.temp ?? ""
    },
    hitDice: `${sys.attributes?.hd?.value ?? sys.attributes?.hd?.total ?? ""} ${sys.attributes?.hd?.class ?? ""}`.trim(),
    hitDiceMax: sys.attributes?.hd?.max ?? "",
    hitDiceSpent: sys.attributes?.hd?.spent ?? "",
    passivePerception: sys.skills?.prc?.passive ?? "",
    deathSaves: {
      successes: sys.attributes?.death?.success ?? 0,
      failures: sys.attributes?.death?.failure ?? 0
    },
    spellcasting: {
      ability: sys.attributes?.spellcasting ?? "",
      modifier: sys.abilities?.[sys.attributes?.spellcasting]?.mod ?? "",
      dc: sys.attributes?.spelldc ?? "",
      attackBonus: sys.bonuses?.spell?.attack ?? ""
    },
    spells: buildSpellsText(actor),
    weapons: buildWeaponRows(actor),
    inventoryText: buildInventoryText(actor),
    currency: {
      cp: sys.currency?.cp ?? 0,
      sp: sys.currency?.sp ?? 0,
      ep: sys.currency?.ep ?? 0,
      gp: sys.currency?.gp ?? 0,
      pp: sys.currency?.pp ?? 0
    },
    traits: {
      personality,
      ideals,
      bonds,
      flaws
    },
    // The sheet has one freeform "Backstory & Personality" box rather than
    // four separate trait fields.
    backstoryText: [
      personality && `Personality Traits: ${personality}`,
      ideals && `Ideals: ${ideals}`,
      bonds && `Bonds: ${bonds}`,
      flaws && `Flaws: ${flaws}`
    ]
      .filter(Boolean)
      .join("\n"),
    proficiencies: {
      languages: joinValues(sys.traits?.languages?.value),
      armor: joinValues(sys.traits?.armorProf?.value),
      weapons: joinValues(sys.traits?.weaponProf?.value),
      tools: sys.tools ? Object.keys(sys.tools).join(", ") : ""
    },
    featuresText: actor.items
      .filter(i => i.type === "feat")
      .map(i => i.name)
      .join(", ")
  };
}
