import { createHash, randomBytes } from "crypto";

export function createCanvaCodeVerifier(): string {
  return randomBytes(96).toString("base64url");
}

export function createCanvaCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function createCanvaOAuthState(): string {
  return randomBytes(96).toString("base64url");
}
