import bcrypt from "bcrypt";

// How many times bcrypt "stretches" the hash. Higher = slower to compute,
// which is exactly what we want for password hashing — it makes brute-force
// attacks on stolen password hashes impractically slow. 10-12 is the
// standard tradeoff between security and login speed in 2026.
const SALT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainTextPassword: string,
  storedHash: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, storedHash);
}