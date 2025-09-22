#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const dinoDir = path.join(rootDir, 'public', 'assets', 'dino');
const outputPath = path.join(rootDir, 'src', 'data', 'creatures.json');

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
    const key = creature.maskPath || creature.name;
    if (!key) {
      continue;
    }

    if (Array.isArray(creature.noMask)) {
      noMaskByKey.set(key, creature.noMask);
    }
  }

  return noMaskByKey;
}

function collectCreatureData(folderName) {
  const folderPath = path.join(dinoDir, folderName);
  const dirEntries = fs.readdirSync(folderPath, { withFileTypes: true });
  const files = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const masks = files.filter((file) => file.toLowerCase().includes('_m'));
  const baseCandidates = files.filter((file) => !file.toLowerCase().includes('_m'));

  if (baseCandidates.length === 0) {
    throw new Error(`No base image found in ${folderName}`);
  }

  const base = baseCandidates[0];

  return {
    name: folderName,
    maskPath: folderName,
    base,
    masks,
  };
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

  const creatures = creatureFolders.map((folderName) => {
    const data = collectCreatureData(folderName);
    const key = data.maskPath;
    const noMask = noMaskByKey.get(key) || [];

    return {
      ...data,
      noMask,
    };
  });

  const output = JSON.stringify(creatures, null, 2) + '\n';
  fs.writeFileSync(outputPath, output);
  console.log(`Updated ${outputPath} with ${creatures.length} creatures.`);
}

main();
