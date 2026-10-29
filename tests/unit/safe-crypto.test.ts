import { describe, it, expect } from 'vitest';
import { safeRandomUUID } from '../../src/core/crypto/uuid';
import { computeSha256, fallbackSha256, formatBytes } from '../../src/core/crypto/sha256';

describe('Safe Crypto & UUID Utilities', () => {
  it('generates standard UUID v4 strings matching RFC 4122 pattern', () => {
    const uuid = safeRandomUUID();
    expect(uuid).toBeDefined();
    expect(typeof uuid).toBe('string');
    // UUID v4 format: 8-4-4-4-12 hex characters
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(uuid)).toBe(true);
  });

  it('generates unique UUIDs sequentially', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = safeRandomUUID();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
    expect(ids.size).toBe(100);
  });

  it('computes accurate SHA-256 digests matching known test vectors', async () => {
    // SHA-256 for "hello world"
    const hash1 = await computeSha256('hello world');
    expect(hash1).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');

    // SHA-256 for empty string
    const hash2 = await computeSha256('');
    expect(hash2).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('computes accurate SHA-256 using pure JS fallback when crypto.subtle is unavailable', () => {
    const encoder = new TextEncoder();
    const hash1 = fallbackSha256(encoder.encode('hello world'));
    expect(hash1).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');

    const hash2 = fallbackSha256(encoder.encode(''));
    expect(hash2).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('formats bytes into human-readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });
});
