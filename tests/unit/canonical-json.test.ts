import { describe, it, expect } from 'vitest';
import {
  serializeCanonicalJson,
  areCanonicallyEqual,
} from '../../src/core/experiment/serialize';
import { computeSha256 } from '../../src/core/crypto/sha256';

describe('Canonical JSON & Crypto Specs', () => {
  it('recursively sorts object keys lexicographically', () => {
    const objA = { z: 1, a: 2, m: { y: 10, b: 20 } };
    const objB = { a: 2, m: { b: 20, y: 10 }, z: 1 };

    const serializedA = serializeCanonicalJson(objA);
    const serializedB = serializeCanonicalJson(objB);

    expect(serializedA).toBe(serializedB);
    expect(serializedA).toBe('{"a":2,"m":{"b":20,"y":10},"z":1}');
    expect(areCanonicallyEqual(objA, objB)).toBe(true);
  });

  it('preserves array order and does not sort arrays', () => {
    const arrObj = { list: [3, 1, 2], name: 'test' };
    const serialized = serializeCanonicalJson(arrObj);
    expect(serialized).toBe('{"list":[3,1,2],"name":"test"}');
  });

  it('rejects NaN and Infinity per EXPERIMENT_SCHEMA', () => {
    expect(() => serializeCanonicalJson({ num: NaN })).toThrow(/non-finite number/);
    expect(() => serializeCanonicalJson({ num: Infinity })).toThrow(/non-finite number/);
    expect(() => serializeCanonicalJson({ num: -Infinity })).toThrow(/non-finite number/);
  });

  it('ignores functions, undefined, and symbols gracefully', () => {
    const dirtyObj = {
      val: 42,
      fn: () => {},
      undef: undefined,
    };
    const serialized = serializeCanonicalJson(dirtyObj);
    expect(serialized).toBe('{"val":42}');
  });

  it('computes expected SHA-256 for known test vectors', async () => {
    // SHA-256 of empty string is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const emptyHash = await computeSha256('');
    expect(emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    // SHA-256 of "hello"
    const helloHash = await computeSha256('hello');
    expect(helloHash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
