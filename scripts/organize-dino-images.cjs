const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(ROOT_DIR, 'temp');
const DEST_DIR = path.join(ROOT_DIR, 'public', 'assets', 'dino');

const SPECIAL_DEST_FOLDERS = [
  {
    pattern: /^Cat_ASA_\d+/i,
    folder: 'Cat',
  },
];

async function ensureDirectory(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

function resolveDestinationFolder(fileName) {
  const { name } = path.parse(fileName);
  for (const rule of SPECIAL_DEST_FOLDERS) {
    if (!rule) continue;
    if (rule.pattern && rule.pattern.test(name)) {
      return rule.folder;
    }
    if (typeof rule.test === 'function' && rule.test(name)) {
      return rule.folder;
    }
  }
  return null;
}

function getBaseFolderName(fileName) {
  const special = resolveDestinationFolder(fileName);
  if (special) {
    return special;
  }
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

/**
 * @fileoverview
 * organize-dino-images.cjs
 *
 * This script organizes PNG images from a temporary directory into destination folders
 * based on their base names. It is intended for use in the ARK Mask Colorizer workflow.
 *
 * ## Usage
 * Run this script using Node.js:
 *
 * ```bash
 * node scripts/organize-dino-images.cjs
 * ```
 *
 * ## Requirements
 * - Node.js v14 or higher
 * - The TEMP_DIR and DEST_DIR constants must be defined and point to valid directories.
 * - The TEMP_DIR must contain PNG files to organize.
 * - The helper functions `ensureDirectory`, `getBaseFolderName`, and `movePng` must be implemented.
 *
 * ## Example
 * If TEMP_DIR contains:
 *   - rex_001.png
 *   - rex_002.png
 *   - trike_001.png
 *
 * The script will move these files into folders named after their base (e.g., "rex", "trike") inside DEST_DIR.
 *
 * ## Note
 * - The script will exit with code 1 if TEMP_DIR does not exist.
 * - No files will be moved if there are no PNG files in TEMP_DIR.
 * - Logging is provided for each file moved.
 * Organizes PNG files from the temporary directory into destination folders based on their base names.
 * Checks for the existence of TEMP_DIR, ensures DEST_DIR exists, groups PNG files by base name,
 * and moves them into corresponding folders.
 *
 * @async
 * @function main
 * @returns {Promise<void>} Resolves when all files have been organized.
 */
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
  const pngFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'));

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
