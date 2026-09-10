import jwt from "jsonwebtoken";

// This is the shape of data we embed INSIDE the token itself.
// Anyone can decode a JWT and read this (it's not encrypted, just signed) —
// so we only put non-sensitive identifiers here, never passwords.
export interface AccessTokenPayload {
  userId: string;
  tenantId: string | null; // null for Super Admins
  isSuperAdmin: boolean;
  roleId: string | null;
}

export interface RefreshTokenPayload {
  userId: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  // Fail loudly at startup rather than silently signing tokens with
  // "undefined" as the secret, which would be a serious security hole.
  throw new Error(
    "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env"
  );
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN as any });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN as any });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}