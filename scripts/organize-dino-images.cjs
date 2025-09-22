#!/usr/bin/env node
// Usage: run "npm run organize:dino-assets" to move temp PNGs into public/assets/dino grouped by creature.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(ROOT_DIR, 'temp');
const DEST_DIR = path.join(ROOT_DIR, 'public', 'assets', 'dino');

async function ensureDirectory(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

function getBaseFolderName(fileName) {
  const { name } = path.parse(fileName);
  const separatorIndex = name.indexOf('_');
  const base = separatorIndex === -1 ? name : name.slice(0, separatorIndex);
  const trimmed = base.trim();
  return trimmed.length > 0 ? trimmed : 'misc';
}

async function movePng(fileName, baseFolder) {
  const sourcePath = path.join(TEMP_DIR, fileName);
  const destinationFolder = path.join(DEST_DIR, baseFolder);
  const destinationPath = path.join(destinationFolder, fileName);

  await ensureDirectory(destinationFolder);

  try {
    await fs.promises.rename(sourcePath, destinationPath);
  } catch (error) {
    if (error.code === 'EEXIST' || error.code === 'EPERM') {
      await fs.promises.rm(destinationPath, { force: true });
      await fs.promises.rename(sourcePath, destinationPath);
    } else if (error.code === 'EXDEV') {
      await fs.promises.copyFile(sourcePath, destinationPath);
      await fs.promises.rm(sourcePath, { force: true });
    } else {
      throw error;
    }
  }

  return path.relative(ROOT_DIR, destinationPath);
}

async function clearExistingFolder(baseFolder) {
  const destinationFolder = path.join(DEST_DIR, baseFolder);
  await fs.promises.rm(destinationFolder, { recursive: true, force: true });
}

async function main() {
  const tempExists = await fs.promises
    .stat(TEMP_DIR)
    .then(() => true)
    .catch(() => false);

  if (!tempExists) {
    console.error(`Temp directory not found: ${TEMP_DIR}`);
    process.exitCode = 1;
    return;
  }

  await ensureDirectory(DEST_DIR);

  const entries = await fs.promises.readdir(TEMP_DIR, { withFileTypes: true });
  const pngFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'),
  );

  if (pngFiles.length === 0) {
    console.log('No PNG files found in temp directory.');
    return;
  }

  const groupedByBase = new Map();
  for (const entry of pngFiles) {
    const baseFolder = getBaseFolderName(entry.name);
    if (!groupedByBase.has(baseFolder)) {
      groupedByBase.set(baseFolder, []);
    }
    groupedByBase.get(baseFolder).push(entry.name);
  }

  for (const [baseFolder, files] of groupedByBase) {
    await clearExistingFolder(baseFolder);

    for (const fileName of files) {
      const relativeDestination = await movePng(fileName, baseFolder);
      console.log(`Moved ${fileName} -> ${relativeDestination}`);
    }
  }
}

main().catch((error) => {
  console.error('Failed to organize PNG files.');
  console.error(error);
  process.exitCode = 1;
});
