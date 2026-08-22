import "server-only";
import crypto from "node:crypto";
const secret = () =>
  process.env.CRM_SESSION_SECRET || "development-only-change-me";
export function createSession() {
  const payload = Buffer.from(
    JSON.stringify({ sub: "franklin", exp: Date.now() + 7 * 86400000 }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}
export function verifySession(token: string | undefined) {
  if (!token) return false;
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;
    const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
    if (!secureEqual(expected, signature)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return data.sub === "franklin" && typeof data.exp === "number" && data.exp > Date.now();
  } catch { return false; }
}
function secureEqual(expectedValue: string, receivedValue: string) {
  const expected = Buffer.from(expectedValue);
  const received = Buffer.from(receivedValue);
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

export function verifyCredentials(email: string, password: string) {
  const expectedEmail = (process.env.CRM_EMAIL || "").trim().toLowerCase();
  const receivedEmail = email.trim().toLowerCase();
  const expectedPassword = process.env.CRM_PASSWORD || "";
  if (!expectedEmail || !expectedPassword) return false;
  return (
    secureEqual(expectedEmail, receivedEmail) &&
    secureEqual(expectedPassword, password)
  );
}
