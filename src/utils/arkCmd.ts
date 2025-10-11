export function extractSpeciesFromBlueprint(bp?: string | null): string {
  if (!bp) return '';
  // tA�m chu��-i sau "Dinos/" �`���n d���u "/" k��� ti���p
  const m = bp.match(/Dinos\/([^/]+)/i);
  if (!m) return '';
  return m[1] || '';
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
