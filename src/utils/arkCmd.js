export function extractSpeciesFromBlueprint(bp) {
  if (!bp) return '';
  // tìm chuỗi sau "Dinos/" đến dấu "/" kế tiếp
  const m = bp.match(/Dinos\/([^/]+)/i);
  if (!m) return '';
  return m[1] || '';
}

// Chuẩn hoá để so tên trong creatures.json (bỏ gạch dưới, trim, so không phân biệt hoa thường)
export function normalizeName(s) {
  return (s || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Trích xuất tất cả chuỗi trong dấu ngoặc kép theo thứ tự
export function extractQuoted(cmd) {
  const out = [];
  cmd.replace(/"([^"]*)"/g, (_, g1) => {
    out.push(g1);
    return '';
  });
  return out;
}

// Chuẩn tên: bỏ ký tự đặc biệt, giữ chữ/số/khoảng trắng, rút gọn space
export function sanitizeName(s) {
  if (!s) return '';
  return s
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse list số từ chuỗi "a,b,c"
export function parseNumList(str, countMin = 1, countMax = 999) {
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
