/**
 * Mulberry32 PRNG (Pseudo-Random Number Generator)
 * Pure, 32-bit state, deterministic, fast PRNG.
 * Produces float in range [0, 1).
 * STRICT RULE: No UI/DOM dependencies. Pure computation only.
 */

export function createMulberry32(seed: number): () => number {
  // Ensure seed is treated as an unsigned 32-bit integer
  let s = (seed >>> 0);

  return function nextRandom(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Generate a random 32-bit unsigned integer seed for UI defaults
 */
export function generateRandomSeed(): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return array[0];
  }
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
