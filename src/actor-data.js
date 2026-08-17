const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

// dnd5e's schema shifts between core versions; every lookup below falls back
// across the paths seen in 2014- and 2024-rules data models.
function findItemName(actor, types) {
  return actor.items.find(i => types.includes(i.type))?.name ?? "";
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

function buildAttacksText(actor) {
  return actor.items
    .filter(i => i.type === "weapon")
    .map(i => `${i.name}  ${i.labels?.toHit ?? ""}  ${i.labels?.damage ?? ""}`.trim())
    .join("\n");
}

function buildInventoryText(actor) {
  return actor.items
    .filter(i => ["weapon", "equipment", "consumable", "tool", "loot", "container"].includes(i.type))
    .map(i => `${i.name}${i.system.quantity > 1 ? ` (x${i.system.quantity})` : ""}`)
    .join("\n");
}

export function extractCharacterData(actor) {
  const sys = actor.system;

  return {
    name: actor.name,
    species: sys.details?.race?.name ?? sys.details?.species?.name ?? findItemName(actor, ["race", "species"]),
    classes: actor.items
      .filter(i => i.type === "class")
      .map(i => `${i.name} ${i.system.levels ?? ""}`.trim())
      .join(", "),
    background: sys.details?.background?.name ?? findItemName(actor, ["background"]),
    alignment: sys.details?.alignment ?? "",
    xp: sys.details?.xp?.value ?? "",
    level: sys.details?.level ?? "",
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
    passivePerception: sys.skills?.prc?.passive ?? "",
    deathSaves: {
      successes: sys.attributes?.death?.success ?? 0,
      failures: sys.attributes?.death?.failure ?? 0
    },
    spellcasting: {
      ability: sys.attributes?.spellcasting ?? "",
      dc: sys.attributes?.spelldc ?? ""
    },
    spells: buildSpellsText(actor),
    attacksText: buildAttacksText(actor),
    inventoryText: buildInventoryText(actor),
    currency: {
      cp: sys.currency?.cp ?? 0,
      sp: sys.currency?.sp ?? 0,
      ep: sys.currency?.ep ?? 0,
      gp: sys.currency?.gp ?? 0,
      pp: sys.currency?.pp ?? 0
    },
    traits: {
      personality: sys.details?.trait ?? "",
      ideals: sys.details?.ideal ?? "",
      bonds: sys.details?.bond ?? "",
      flaws: sys.details?.flaw ?? ""
    },
    proficiencies: {
      languages: sys.traits?.languages?.value?.join(", ") ?? "",
      armor: sys.traits?.armorProf?.value?.join(", ") ?? "",
      weapons: sys.traits?.weaponProf?.value?.join(", ") ?? "",
      tools: sys.tools ? Object.keys(sys.tools).join(", ") : ""
    },
    featuresText: actor.items
      .filter(i => i.type === "feat")
      .map(i => i.name)
      .join(", ")
  };
}
