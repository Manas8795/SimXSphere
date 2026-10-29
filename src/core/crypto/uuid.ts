/**
 * Safe UUID v4 generator compatible with both Secure Contexts (HTTPS/localhost)
 * and Non-Secure Contexts (HTTP S3 website endpoints, non-SSL environments).
 * 
 * In modern browsers (Chrome/Firefox/Safari), `window.crypto.randomUUID` is ONLY
 * exposed in Secure Contexts (HTTPS or localhost). On HTTP endpoints, invoking it
 * throws `TypeError: crypto.randomUUID is not a function`.
 * 
 * This utility provides seamless fallbacks:
 * 1. crypto.randomUUID (if available in secure context)
 * 2. crypto.getRandomValues (RFC 4122 v4 layout)
 * 3. Pseudo-random Math.random() fallback
 */

export function safeRandomUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === 'function') {
      try {
        return globalThis.crypto.randomUUID();
      } catch {
        // Fall through to getRandomValues
      }
    }

    if (typeof globalThis.crypto.getRandomValues === 'function') {
      try {
        const bytes = new Uint8Array(16);
        globalThis.crypto.getRandomValues(bytes);
        // Set version to 0100 (v4)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        // Set variant to 10xx (RFC 4122)
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
      } catch {
        // Fall through to Math.random
      }
    }
  }

  // Fallback for non-secure or restricted environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

