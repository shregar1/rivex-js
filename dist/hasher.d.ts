/**
 * Rust-equivalent password hashing utilities.
 * Uses bcryptjs for portability. For argon2, uses argon2 npm package.
 */
export declare function hashPassword(password: string, algorithm?: 'bcrypt' | 'argon2'): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
//# sourceMappingURL=hasher.d.ts.map