import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/hasher.js';

describe('Password hashing', () => {
  it('hashes a password', async () => {
    const hash = await hashPassword('mysecret');
    expect(hash).toBeTruthy();
    expect(hash.length).toBeGreaterThan(10);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('mysecret');
    expect(await verifyPassword('mysecret', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('mysecret');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for same password', async () => {
    const hash1 = await hashPassword('mysecret');
    const hash2 = await hashPassword('mysecret');
    expect(hash1).not.toBe(hash2);
  });

  it('supports argon2 algorithm', async () => {
    const hash = await hashPassword('mysecret', 'argon2');
    expect(hash).toContain('rivex-argon2');
    expect(await verifyPassword('mysecret', hash)).toBe(true);
  });

  it('defaults to bcrypt algorithm', async () => {
    const hash = await hashPassword('mysecret');
    expect(hash).toContain('rivex');
  });
});
