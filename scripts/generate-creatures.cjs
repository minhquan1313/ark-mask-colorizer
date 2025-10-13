const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dinoDir = path.join(rootDir, 'public', 'assets', 'dino');
const outputPath = path.join(rootDir, 'src', 'data', 'creatures.json');
const FEMALE_MARKER = /_sf(?:_|\.|$)/i;

const SPECIAL_VARIANT_RULES = {
  Cat: {
    slot: 1,
    mode: 'colorIdCycle',
    sortVariants: (entry) => {
      if (!entry || typeof entry.base !== 'string') {
        return Number.POSITIVE_INFINITY;
      }
      const match = /_(\d+)\.png$/i.exec(entry.base);
      return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
    },
  },
};

const CREATURE_ALIAS_MAP = {
  Karkinos: ['Crab'],
};

function loadExistingNoMask() {
  if (!fs.existsSync(outputPath)) {
    return new Map();
  }

  const raw = fs.readFileSync(outputPath, 'utf-8').trim();
  if (!raw) {
    return new Map();
  }

  const existingData = JSON.parse(raw);
  const noMaskByKey = new Map();

  for (const creature of existingData) {
    if (!creature || typeof creature !== 'object') {
      continue;
    }

    const noMask = Array.isArray(creature.noMask) ? creature.noMask : [];
    const keys = new Set();

    if (typeof creature.maskPath === 'string' && creature.maskPath) {
      keys.add(creature.maskPath);
      if (typeof creature.base === 'string' && creature.base) {
        keys.add(`${creature.maskPath}::${creature.base}`);
      }
    }

    if (typeof creature.name === 'string' && creature.name) {
      keys.add(creature.name);
    }

    for (const key of keys) {
      noMaskByKey.set(key, noMask);
    }
  }

  return noMaskByKey;
}

function loadExistingAliases() {
  if (!fs.existsSync(outputPath)) {
    return new Map();
  }

  const raw = fs.readFileSync(outputPath, 'utf-8').trim();
  if (!raw) {
    return new Map();
  }

  const existingData = JSON.parse(raw);
  const aliasByKey = new Map();

  for (const creature of existingData) {
    if (!creature || typeof creature !== 'object') {
      continue;
    }

    const aliases = Array.isArray(creature.aliases) ? creature.aliases.filter((entry) => typeof entry === 'string' && entry.trim()) : [];

    if (!aliases.length) {
      continue;
    }

    const keys = new Set();

    if (typeof creature.maskPath === 'string' && creature.maskPath) {
      keys.add(creature.maskPath);
      if (typeof creature.base === 'string' && creature.base) {
        keys.add(`${creature.maskPath}::${creature.base}`);
      }
    }

    if (typeof creature.name === 'string' && creature.name) {
      keys.add(creature.name);
    }

    for (const key of keys) {
      aliasByKey.set(key, aliases);
    }
  }

  return aliasByKey;
}

function isFemaleVariant(fileName) {
  return FEMALE_MARKER.test(fileName);
}

function baseKeyFromFile(fileName) {
  return path.parse(fileName).name.toLowerCase();
}

function baseKeyFromMask(fileName) {
  const { name } = path.parse(fileName);
  return name.replace(/_m(?:_\d{2})?$/i, '').toLowerCase();
}

function collectCreatureVariants(folderName) {
  const folderPath = path.join(dinoDir, folderName);
  const dirEntries = fs.readdirSync(folderPath, { withFileTypes: true });
  const files = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const maskFiles = files.filter((file) => file.toLowerCase().includes('_m'));
  const baseFiles = files.filter((file) => !file.toLowerCase().includes('_m'));

  if (baseFiles.length === 0) {
    throw new Error(`No base image found in ${folderName}`);
  }

  const masksByBase = new Map();
  for (const mask of maskFiles) {
    const key = baseKeyFromMask(mask);
    if (!masksByBase.has(key)) {
      masksByBase.set(key, []);
    }
    masksByBase.get(key).push(mask);
  }

  const hasNonFemaleVariant = baseFiles.some((file) => !isFemaleVariant(file));

  const orderedBases = [...baseFiles].sort((a, b) => {
    const femaleA = isFemaleVariant(a);
    const femaleB = isFemaleVariant(b);
    if (femaleA !== femaleB) {
      return femaleA ? 1 : -1;
    }
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });

  return orderedBases.map((baseFile) => {
    const key = baseKeyFromFile(baseFile);
    const masks = masksByBase.get(key) || [];
    const female = isFemaleVariant(baseFile);
    const name = female && hasNonFemaleVariant ? `${folderName} (female)` : folderName;

    return {
      name,
      maskPath: folderName,
      base: baseFile,
      masks,
    };
  });
}

function applySpecialVariantRule(folderName, variants) {
  const rule = SPECIAL_VARIANT_RULES[folderName];
  if (!rule || !Array.isArray(variants) || variants.length === 0) {
    return variants;
  }

  const slotIndex = Number.parseInt(rule.slot, 10);
  if (!Number.isInteger(slotIndex) || slotIndex < 0) {
    return variants;
  }

  const sequence = variants
    .map((variant) => {
      const base = variant.base;
      const masks = Array.isArray(variant.masks) ? variant.masks : [];
      if (!base) {
        return null;
      }
      const entry = { base, masks };
      if (variant.name && typeof variant.name === 'string') {
        entry.label = variant.name;
      }
      return entry;
    })
    .filter(Boolean);

  if (sequence.length === 0) {
    return variants;
  }

  const sorter =
    typeof rule.sortVariants === 'function'
      ? (a, b) => {
          const va = Number(rule.sortVariants(a));
          const vb = Number(rule.sortVariants(b));
          if (!Number.isNaN(va) && !Number.isNaN(vb) && va !== vb) {
            return va - vb;
          }
          return a.base.localeCompare(b.base, undefined, { sensitivity: 'base' });
        }
      : (a, b) => a.base.localeCompare(b.base, undefined, { sensitivity: 'base' });

  sequence.sort(sorter);

  const baseVariant = variants[0] || {};
  const { variantSlots: existingVariantSlots = {}, ...rest } = baseVariant;
  const variantSlots = { ...existingVariantSlots };
  const primaryVariant = sequence[0];
  variantSlots[String(slotIndex)] = {
    mode: rule.mode || 'colorIdCycle',
    sequence,
  };

  return [
    {
      ...rest,
      base: primaryVariant.base,
      masks: primaryVariant.masks,
      variantSlots,
    },
  ];
}

function normalizeNameKey(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveNoMask(noMaskByKey, variant) {
  const candidates = [];
  if (variant.maskPath && variant.base) {
    candidates.push(`${variant.maskPath}::${variant.base}`);
  }
  if (variant.maskPath) {
    candidates.push(variant.maskPath);
  }
  if (variant.name) {
    candidates.push(variant.name);
  }

  for (const key of candidates) {
    if (noMaskByKey.has(key)) {
      const value = noMaskByKey.get(key);
      return Array.isArray(value) ? [...value] : [];
    }
  }

  return [];
}

function resolveAliases(existingAliasByKey, folderName, variant) {
  const baseAliases = Array.isArray(CREATURE_ALIAS_MAP[folderName]) ? CREATURE_ALIAS_MAP[folderName] : [];
  const candidates = [];

  if (variant.maskPath && variant.base) {
    candidates.push(`${variant.maskPath}::${variant.base}`);
  }
  if (variant.maskPath) {
    candidates.push(variant.maskPath);
  }
  if (variant.name) {
    candidates.push(variant.name);
  }

  let existing = [];
  for (const key of candidates) {
    if (existingAliasByKey.has(key)) {
      const value = existingAliasByKey.get(key);
      if (Array.isArray(value) && value.length > 0) {
        existing = value;
        break;
      }
    }
  }

  const seen = new Set();
  const result = [];

  const append = (values) => {
    if (!Array.isArray(values)) return;
    for (const entry of values) {
      if (typeof entry !== 'string') continue;
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
    }
  };

  append(baseAliases);
  append(existing);

  return result;
}

/**
 * @fileoverview
 * # Ark Mask Colorizer Creature Generator
 *
 * This script generates a list of Ark creatures and their mask information for use in the Ark Mask Colorizer project.
 *
 * ## Usage
 * Run this script using Node.js:
 *
 * ```bash
 * node scripts/generate-creatures.cjs
 * ```
 *
 * ## Requirements
 * - Node.js installed
 * - Required directories and files must exist (see `dinoDir` and other dependencies in the script)
 * - The script depends on several helper functions and variables (e.g., `fs`, `dinoDir`, `outputPath`, `loadExistingNoMask`, etc.)
 *
 * ## Example
 * After running, the script will output a JSON file containing all creatures and their mask data:
 *
 * ```
 * Updated ./output/creatures.json with 123 creatures.
 * ```
 *
 * ## Note
 * - Make sure all dependencies and required directories are set up before running.
 * - The script is intended to be run from the project root or with correct relative paths.
 * - For more details, refer to the Ark Mask Colorizer documentation.
 *
 * @function main
 * @description Generates the creatures list with mask information and writes it to the output file.
 */
function main() {
  const noMaskByKey = loadExistingNoMask();
  const aliasByKey = loadExistingAliases();

  if (!fs.existsSync(dinoDir)) {
    throw new Error(`Missing directory: ${dinoDir}`);
  }

  const creatureFolders = fs
    .readdirSync(dinoDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const creatures = [];

  for (const folderName of creatureFolders) {
    const variants = applySpecialVariantRule(folderName, collectCreatureVariants(folderName));
    for (const variant of variants) {
      const noMask = resolveNoMask(noMaskByKey, variant);
      const aliases = resolveAliases(aliasByKey, folderName, variant);
      creatures.push({
        ...variant,
        aliases,
        noMask,
      });
    }
  }

  const baseNoMaskCandidates = creatures
    .filter((entry) => Array.isArray(entry.noMask) && entry.noMask.length > 0)
    .map((entry) => ({
      entry,
      nameKey: normalizeNameKey(entry.name),
      pathKey: normalizeNameKey(entry.maskPath),
    }));

  for (const creature of creatures) {
    if (Array.isArray(creature.noMask) && creature.noMask.length > 0) continue;
    const nameKey = normalizeNameKey(creature.name);
    const pathKey = normalizeNameKey(creature.maskPath);
    let selected = null;
    let selectedScore = -1;

    for (const candidate of baseNoMaskCandidates) {
      const { entry, nameKey: candidateName, pathKey: candidatePath } = candidate;
      const source = Array.isArray(entry.noMask) ? entry.noMask : [];
      if (!source.length) continue;

      const matches = [
        candidateName && nameKey.includes(candidateName),
        candidateName && pathKey.includes(candidateName),
        candidatePath && nameKey.includes(candidatePath),
        candidatePath && pathKey.includes(candidatePath),
      ].some(Boolean);

      if (!matches) continue;
      const score = Math.max(candidateName ? candidateName.length : 0, candidatePath ? candidatePath.length : 0);
      if (score > selectedScore) {
        selected = candidate;
        selectedScore = score;
      }
    }

    if (selected) {
      creature.noMask = [...selected.entry.noMask];
    }
  }

  const output = JSON.stringify(creatures, null, 2) + '\n';
  fs.writeFileSync(outputPath, output);
  console.log(`Updated ${outputPath} with ${creatures.length} creatures.`);
}

main();
