import creatures from '../data/creatures.json';

type CreatureEntry = {
  name?: string;
  aliases?: string[];
};

type CreatureLookup = {
  nameByNormalized: Map<string, string>;
  aliasByNormalized: Map<string, string>;
  nameByCollapsed: Map<string, string>;
  aliasByCollapsed: Map<string, string>;
};

let cachedCreatureLookup: CreatureLookup | null = null;

function getCreatureLookup(): CreatureLookup {
  if (cachedCreatureLookup) return cachedCreatureLookup;

  const nameByNormalized = new Map<string, string>();
  const aliasByNormalized = new Map<string, string>();
  const nameByCollapsed = new Map<string, string>();
  const aliasByCollapsed = new Map<string, string>();

  for (const entry of creatures as CreatureEntry[]) {
    if (!entry || typeof entry !== 'object') continue;

    if (typeof entry.name === 'string') {
      const normalizedName = normalizeName(entry.name);
      if (normalizedName) {
        if (!nameByNormalized.has(normalizedName)) {
          nameByNormalized.set(normalizedName, entry.name);
        }
        const collapsedName = normalizedName.replace(/\s+/g, '');
        if (collapsedName && !nameByCollapsed.has(collapsedName)) {
          nameByCollapsed.set(collapsedName, entry.name);
        }
      }
    }

    if (Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        if (typeof alias !== 'string') continue;
        const normalizedAlias = normalizeName(alias);
        if (normalizedAlias) {
          if (!aliasByNormalized.has(normalizedAlias)) {
            aliasByNormalized.set(normalizedAlias, entry.name ?? alias);
          }
          const collapsedAlias = normalizedAlias.replace(/\s+/g, '');
          if (collapsedAlias && !aliasByCollapsed.has(collapsedAlias)) {
            aliasByCollapsed.set(collapsedAlias, entry.name ?? alias);
          }
        }
      }
    }
  }

  cachedCreatureLookup = { nameByNormalized, aliasByNormalized, nameByCollapsed, aliasByCollapsed };
  return cachedCreatureLookup;
}

export function extractSpeciesFromBlueprint(bp?: string | null): string {
  if (!bp) return '';

  // tA?m chu??-i sau "Dinos/" ?`???n d???u "/" k??? ti???p
  const formatSegment = (value: string | undefined | null): string => (value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  const speciesMatch = bp.match(/Dinos\/([^\/]+)/i);
  let baseName = formatSegment(speciesMatch?.[1]);
  if (!baseName) return '';

  const normalizedBase = normalizeName(baseName);
  if (normalizedBase) {
    const { nameByNormalized, aliasByNormalized, nameByCollapsed, aliasByCollapsed } = getCreatureLookup();
    let matchedName: string | undefined;

    const directMatch = nameByNormalized.get(normalizedBase);
    if (directMatch) {
      matchedName = directMatch;
    }

    if (!matchedName) {
      matchedName = aliasByNormalized.get(normalizedBase);
    }

    if (!matchedName) {
      const collapsedBase = normalizedBase.replace(/\s+/g, '');
      if (collapsedBase) {
        matchedName = nameByCollapsed.get(collapsedBase) ?? aliasByCollapsed.get(collapsedBase);
      }
    }

    if (matchedName) {
      baseName = matchedName;
    }
  }

  const variantMatch = bp.match(/Character_BP_([^'\/.]+)/i);
  const variantName = formatSegment(variantMatch?.[1]);

  return variantName ? `${variantName} ${baseName}` : baseName;
}

// Chu��cn hoA� �`��� so tA�n trong creatures.json (b��? g���ch d����>i, trim, so khA'ng phA�n bi���t hoa th????ng)
export function normalizeName(s?: string | null): string {
  return (s || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// TrA-ch xu???t t???t c??? chu??i trong d???u ngo???c kAcp theo th??c t???
export function extractQuoted(cmd: string): string[] {
  const out: string[] = [];
  cmd.replace(/"([^"]*)"/g, (_, g1: string) => {
    out.push(g1);
    return '';
  });
  return out;
}

// Chu??cn tA?n: b?? kA� t??? �`???c bi???t, gi??_ ch??_/s??`/kho???ng tr??_ng, rA?t g??n space
export function sanitizeName(s?: string | null): string {
  if (!s) return '';
  return s
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse list s??` t??? chu??i "a,b,c"
export function parseNumList(str: string | null | undefined, countMin = 1, countMax = 999): number[] | null {
  if (!str) return null;
  const parts = str
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (parts.length < countMin || parts.length > countMax) return null;
  const nums = parts.map((v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : NaN;
  });
  return nums.some(Number.isNaN) ? null : nums;
}
