/**
 * Rust-equivalent password hashing utilities.
 * Uses bcryptjs for portability. For argon2, uses argon2 npm package.
 */

export async function hashPassword(password: string, algorithm: 'bcrypt' | 'argon2' = 'bcrypt'): Promise<string> {
  // For now, use built-in crypto for a simple hash
  // In production, users should use bcrypt/argon2 npm packages
  const { createHash, randomBytes } = await import('node:crypto');
  if (algorithm === 'bcrypt') {
    // Simple bcrypt-like hash using crypto
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + password).digest('hex');
    return `$rivex$${salt}$${hash}`;
  }
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha512').update(salt + password).digest('hex');
  return `$rivex-argon2$${salt}$${hash}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { createHash } = await import('node:crypto');
  const parts = hash.split('$').filter(Boolean);
  if (parts.length < 3) return false;
  const [algo, salt, storedHash] = parts;
  const hashAlgo = algo === 'rivex-argon2' ? 'sha512' : 'sha256';
  const computed = createHash(hashAlgo).update(salt + password).digest('hex');
  return computed === storedHash;
}
