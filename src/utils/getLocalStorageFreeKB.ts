export function getLocalStorageFreeBytes(): number | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  // Estimate current usage in bytes
  const used = JSON.stringify(localStorage).length;

  const testKey = 'LOCALSTORAGE_TEST_KEY';
  let data = '1'.repeat(10000);
  let freeBytes: number | null = null;

  try {
    while (true) {
      localStorage.setItem(testKey, data);
      data += '1'.repeat(100000);
    }
  } catch {
    // On quota exceeded, calculate total capacity and free space (bytes)
    const total = JSON.stringify(localStorage).length;
    freeBytes = total - used;
  } finally {
    localStorage.removeItem(testKey);
  }

  return freeBytes;
}
