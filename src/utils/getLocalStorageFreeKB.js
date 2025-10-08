export function getLocalStorageFreeBytes() {
  // Estimate current usage in bytes
  const used = JSON.stringify(localStorage).length;

  // Fill localStorage with test data until quota is exceeded to estimate total capacity
  let testKey = 'LOCALSTORAGE_TEST_KEY';
  let data = '1'.repeat(10000);

  try {
    while (true) {
      localStorage.setItem(testKey, data);
      data += '1'.repeat(100000);
    }
  } catch {
    // On quota exceeded, calculate total capacity and free space (bytes)
    const total = JSON.stringify(localStorage).length;
    localStorage.removeItem(testKey);
    return total - used; // Free space in bytes
  }
}
