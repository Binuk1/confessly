export async function detectNSFW(imageUrl) {
  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbxM86wjUf8QAhSA7BMgNGimv1cT1xFSS-2Xu8asXTULlwT8672FHs_sSTCuE1guFU8T/exec',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      }
    );

    const result = await response.json();
    return result.nsfw; // Should return true or false
  } catch (err) {
    console.error('NSFW check failed:', err);
    return false; // fallback to safe
  }
}
