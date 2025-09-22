#!/usr/bin/env node
// Usage: run "npm run generate:creatures" after updating assets to refresh src/data/creatures.json.
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dinoDir = path.join(rootDir, 'public', 'assets', 'dino');
const outputPath = path.join(rootDir, 'src', 'data', 'creatures.json');
const FEMALE_MARKER = /_sf(?:_|\.|$)/i;

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
      return noMaskByKey.get(key);
    }
  }

  return [];
}

function main() {
  const noMaskByKey = loadExistingNoMask();

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
    const variants = collectCreatureVariants(folderName);
    for (const variant of variants) {
      const noMask = resolveNoMask(noMaskByKey, variant);
      creatures.push({
        ...variant,
        noMask,
      });
    }
  }

  const output = JSON.stringify(creatures, null, 2) + '\n';
  fs.writeFileSync(outputPath, output);
  console.log(`Updated ${outputPath} with ${creatures.length} creatures.`);
}

main();
